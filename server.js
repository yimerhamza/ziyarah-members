const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ============================================
// JSON FILE DATABASE
// ============================================

const DB_FILE = path.join(__dirname, 'members.json');

// Initialize database
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            members: [
                {
                    id: 1,
                    first_name: 'Ahmed',
                    last_name: 'Hassan',
                    email: 'ahmed@ziyarah.com',
                    phone: '+971 50 123 4567',
                    company: 'Ziyarah HQ',
                    position: 'CEO',
                    dob: '1985-03-15',
                    membership_type: 'VIP',
                    status: 'active',
                    registered_at: new Date().toISOString()
                },
                {
                    id: 2,
                    first_name: 'Fatima',
                    last_name: 'Ali',
                    email: 'fatima@ziyarah.com',
                    phone: '+971 50 234 5678',
                    company: 'Ziyarah Marketing',
                    position: 'Marketing Director',
                    dob: '1990-07-22',
                    membership_type: 'Premium',
                    status: 'active',
                    registered_at: new Date().toISOString()
                },
                {
                    id: 3,
                    first_name: 'Omar',
                    last_name: 'Said',
                    email: 'omar@ziyarah.com',
                    phone: '+971 50 345 6789',
                    company: 'Ziyarah Finance',
                    position: 'Finance Manager',
                    dob: '1988-11-30',
                    membership_type: 'Regular',
                    status: 'active',
                    registered_at: new Date().toISOString()
                }
            ],
            nextId: 4
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Database initialized with sample data');
    }
}

function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ Error reading database:', err.message);
        return { members: [], nextId: 1 };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

initDB();

// ============================================
// CREATE SERVER
// ============================================

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`${method} ${pathname}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ============================================
    // API ROUTES
    // ============================================

    // GET all members
    if (pathname === '/api/members' && method === 'GET') {
        const db = readDB();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.members));
        console.log(`📊 GET /api/members - ${db.members.length} members`);
        return;
    }

    // GET single member
    if (pathname.startsWith('/api/members/') && method === 'GET' && pathname !== '/api/members') {
        const id = parseInt(pathname.split('/')[3]);
        if (isNaN(id)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid ID' }));
            return;
        }

        const db = readDB();
        const member = db.members.find(m => m.id === id);
        
        if (!member) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Member not found' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(member));
        return;
    }

    // POST register member (Self-registration)
    if (pathname === '/api/register' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('📝 Registration data:', data);
                
                const { firstName, lastName, email, phone, company, position, dob, membershipType } = data;

                // Validation
                if (!firstName || !lastName || !email) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'First name, last name, and email are required' }));
                    return;
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid email format' }));
                    return;
                }

                const db = readDB();
                
                // Check duplicate email
                if (db.members.some(m => m.email.toLowerCase() === email.toLowerCase())) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ error: 'Email already registered. Please use different email.' }));
                    return;
                }

                // Create new member
                const newMember = {
                    id: db.nextId++,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone?.trim() || null,
                    company: company?.trim() || null,
                    position: position?.trim() || null,
                    dob: dob || null,
                    membership_type: membershipType || 'Regular',
                    status: 'active',
                    registered_at: new Date().toISOString()
                };

                db.members.push(newMember);
                writeDB(db);

                console.log(`✅ New member registered: ${firstName} ${lastName} (${email})`);
                
                res.writeHead(201);
                res.end(JSON.stringify({ 
                    success: true,
                    message: 'Registration successful! Welcome to ZIYARAH BUSINESS GROUP.',
                    member: newMember 
                }));
            } catch (err) {
                console.error('❌ Registration error:', err);
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid data format: ' + err.message }));
            }
        });
        return;
    }

    // PUT update member
    if (pathname.startsWith('/api/members/') && method === 'PUT') {
        const id = parseInt(pathname.split('/')[3]);
        if (isNaN(id)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid ID' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const db = readDB();
                const index = db.members.findIndex(m => m.id === id);
                
                if (index === -1) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Member not found' }));
                    return;
                }

                // Update member
                db.members[index] = {
                    ...db.members[index],
                    first_name: data.firstName || db.members[index].first_name,
                    last_name: data.lastName || db.members[index].last_name,
                    email: data.email || db.members[index].email,
                    phone: data.phone || db.members[index].phone,
                    company: data.company || db.members[index].company,
                    position: data.position || db.members[index].position,
                    dob: data.dob || db.members[index].dob,
                    membership_type: data.membershipType || db.members[index].membership_type
                };

                writeDB(db);
                console.log(`🔄 Member updated: ${db.members[index].first_name} ${db.members[index].last_name}`);
                
                res.writeHead(200);
                res.end(JSON.stringify({ 
                    success: true,
                    message: 'Profile updated successfully!',
                    member: db.members[index]
                }));
            } catch (err) {
                console.error('❌ Update error:', err);
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid data format' }));
            }
        });
        return;
    }

    // DELETE member
    if (pathname.startsWith('/api/members/') && method === 'DELETE') {
        const id = parseInt(pathname.split('/')[3]);
        if (isNaN(id)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid ID' }));
            return;
        }

        const db = readDB();
        const index = db.members.findIndex(m => m.id === id);
        
        if (index === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Member not found' }));
            return;
        }

        const deleted = db.members[index];
        db.members.splice(index, 1);
        writeDB(db);

        console.log(`🗑️ Member deleted: ${deleted.first_name} ${deleted.last_name}`);
        res.writeHead(200);
        res.end(JSON.stringify({ 
            success: true,
            message: 'Member deleted successfully',
            member: deleted 
        }));
        return;
    }

    // ============================================
    // SERVE STATIC FILES
    // ============================================

    // Map routes to files
    let filePath;
    if (pathname === '/') {
        filePath = path.join(__dirname, 'public', 'index.html');
    } else if (pathname === '/register') {
        filePath = path.join(__dirname, 'public', 'register.html');
    } else if (pathname === '/admin') {
        filePath = path.join(__dirname, 'public', 'admin.html');
    } else {
        filePath = path.join(__dirname, 'public', pathname);
    }

    const ext = path.extname(filePath);
    let contentType = 'text/html';
    
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.json') contentType = 'application/json';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    if (ext === '.svg') contentType = 'image/svg+xml';
    if (ext === '.ico') contentType = 'image/x-icon';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log(`❌ File not found: ${filePath}`);
            // Try serving index.html as fallback
            fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, data2) => {
                if (err2) {
                    res.writeHead(404);
                    res.end(`
                        <h1>404 - Page Not Found</h1>
                        <p>The page you're looking for doesn't exist.</p>
                        <p><a href="/">Go to Home</a></p>
                    `);
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data2);
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║     ✦ ZIYARAH BUSINESS GROUP - Member Portal               ║');
    console.log('║                                                            ║');
    console.log(`║     🚀 Server running at: http://localhost:${PORT}         ║`);
    console.log(`║     📋 Register: http://localhost:${PORT}/register         ║`);
    console.log(`║     🔐 Admin: http://localhost:${PORT}/admin               ║`);
    console.log('║                                                            ║');
    console.log(`║     💾 Database: members.json (${readDB().members.length} members)  ║`);
    console.log('║                                                            ║');
    console.log('║     Press Ctrl+C to stop the server                        ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
});