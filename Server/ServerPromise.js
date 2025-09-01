const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise'); // <--- เปลี่ยนเป็น promise
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();
const app = express();
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'your-default-secret-key'; // <--- ใช้ secret key จาก env หรือ default
const cors = require('cors');
const http = require('http');
const session = require('express-session');
// const async = require('async'); // ไม่จำเป็นแล้วเมื่อใช้ async/await
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// --- การตั้งค่าพื้นฐาน ---

// อ่าน SSL Certificates (ตรวจสอบ path ให้ถูกต้อง)
// const options = {
//   key: fs.readFileSync('C:/xampp/apache/conf/ssl.key/server.key'),
//   cert: fs.readFileSync('C:/xampp/apache/conf/ssl.crt/server.crt')
// };

// ฟังก์ชันสุ่มรหัสผ่านใหม่
function generateRandomPassword(length = 10) { // <--- เพิ่มความยาวเล็กน้อย
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// CORS Configuration
app.use(cors({
    origin: ['https://lestialv.ddns.net', 'http://localhost:3000'], // <--- เพิ่ม localhost สำหรับ development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

// Multer Storage Configuration (ตรวจสอบ path 'uploads/')
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        // สร้าง directory ถ้ายังไม่มี
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname); // <--- ใช้ path.extname
        const filename = file.fieldname + '-' + uniqueSuffix + extension;
        cb(null, filename);
    }
});
const upload = multer({ storage: storage });

// --- Database Connection Pool ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lestial',
    waitForConnections: true,
    connectionLimit: 10, // ปรับตามความเหมาะสม
    queueLimit: 0
});

// Test connection pool on startup
pool.getConnection()
    .then(connection => {
        console.log('✅ Database pool connected successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database pool connection failed:', err);
        // Consider exiting the process if DB connection is critical
        // process.exit(1);
    });


// --- Middleware ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key', // <--- ใช้ secret จาก env
    resave: false,
    saveUninitialized: true,
    cookie: { // <--- เพิ่มการตั้งค่า cookie (สำคัญสำหรับ HTTPS)
       secure: process.env.NODE_ENV === 'production', // true ถ้าเป็น https
       httpOnly: true,
       sameSite: 'lax' // หรือ 'none' ถ้าต้องการ cross-site แต่ต้อง secure: true
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // <--- ทำให้เข้าถึงไฟล์ /uploads/ ได้

// --- Helper Functions ---
const generateShortUUID = () => uuidv4().split('-')[0].substring(0, 7);
// const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString(); // ไม่ได้ใช้แล้วใน register?

// --- Routes ---

// GET Links
app.get('/api/links', async (req, res) => { // <--- async
    try { // <--- try
        const [results] = await pool.query('SELECT link FROM x_link WHERE ID = 1'); // <--- await pool.query
        if (results.length > 0) {
            res.json(results[0]); // ส่งเฉพาะ object แรกที่มี link
        } else {
            res.status(404).json({ error: 'Link not found' });
        }
    } catch (error) { // <--- catch
        console.error('Error fetching link:', error);
        res.status(500).json({ error: 'Failed to fetch link' });
    }
});

// UPDATE Link
app.put('/api/links/1', async (req, res) => { // <--- async
    const { link: newLink } = req.body; // <--- Destructuring

    if (!newLink) {
        return res.status(400).json({ success: false, message: 'กรุณาส่งข้อมูล link ที่ต้องการอัปเดต' });
    }

    try { // <--- try
        const [results] = await pool.execute('UPDATE x_link SET link = ? WHERE ID = 1', [newLink]); // <--- await pool.execute

        if (results.affectedRows > 0 || results.changedRows > 0) {
             // Note: changedRows might be 0 if the new value is the same as the old one, but affectedRows should be 1 if ID=1 exists.
            res.json({ success: true, message: 'อัปเดตลิงก์สำเร็จ!' });
        } else {
            // This case means ID=1 was not found.
            res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลิงก์ ID 1' });
        }
    } catch (error) { // <--- catch
        console.error('Error updating link:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    }
});

// GET Reading History
app.get('/api/reading-history/:userId', async (req, res) => { // <--- async
    const { userId } = req.params; // <--- Destructuring
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const sql = `
        SELECT rh.novelId, rh.chapterNumber, rh.readAt, n.title AS novelTitle, c.title AS chapterTitle, n.cover_image
        FROM reading_history rh
        JOIN novels n ON rh.novelId = n.id
        LEFT JOIN chapters c ON rh.novelId = c.novel_id AND rh.chapterNumber = c.chapter
        WHERE rh.userId = ?
        ORDER BY rh.readAt DESC
        LIMIT 50`; // <--- เพิ่ม LIMIT เพื่อป้องกันข้อมูลเยอะเกินไป
    try { // <--- try
        const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute
        res.json(results);
    } catch (err) { // <--- catch
        console.error('Database error fetching reading history:', err);
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
});

// POST Register User (with Transaction)
app.post('/register', async (req, res) => { // <--- async
    const { username, password, email, name, lastname } = req.body;

    if (!username || !password || !email || !name || !lastname) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    let connection; // <--- Declare connection variable outside try
    try {
        // 1. Check if username or email already exists (no transaction needed yet)
        const [existingUsers] = await pool.execute(
            'SELECT UserID FROM users WHERE username = ? OR email = ? LIMIT 1',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userID = generateShortUUID();
        // Verification logic seems removed/simplified in original code, assuming direct verification
        // const verificationCode = generateVerificationCode();

        // 3. Start Transaction
        connection = await pool.getConnection(); // <--- Get connection from pool
        await connection.beginTransaction(); // <--- Start transaction

        // 4. Insert into users table
        // Assuming IsVerified is TRUE upon registration based on the original logic flow (no verify step called)
        await connection.execute(
            'INSERT INTO users (UserID, username, password, email, name, lastname, IsVerified, verificationCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userID, username, hashedPassword, email, name, lastname, true, null] // Set IsVerified=true, code=null
        );

        // 5. Insert into address table
        await connection.execute(
            'INSERT INTO address (UserID) VALUES (?)', // Assuming address table only needs UserID initially
            [userID]
        );

        // 6. Commit Transaction
        await connection.commit(); // <--- Commit

        res.status(201).json({ message: 'User registered successfully.' }); // Simplified message

    } catch (err) { // <--- catch
        console.error('Registration error:', err);
        if (connection) await connection.rollback(); // <--- Rollback on error
        res.status(500).json({ error: 'Failed to register user.', detail: err.message });
    } finally {
        if (connection) connection.release(); // <--- ALWAYS release connection
    }
});

// POST Verify Email (Original logic seems deprecated by register flow)
// If you need verification, uncomment and potentially adjust register flow
/*
app.post('/verify', async (req, res) => { // <--- async
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    try { // <--- try
        const [results] = await pool.execute(
            'SELECT UserID FROM users WHERE email = ? AND VerificationCode = ? AND IsVerified = FALSE', // Check IsVerified = FALSE
            [email, code]
        );

        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid verification code, email, or already verified.' });
        }

        // Update IsVerified status and clear code
        const [updateResult] = await pool.execute(
            'UPDATE users SET IsVerified = TRUE, VerificationCode = NULL WHERE Email = ? AND VerificationCode = ?',
            [email, code] // Ensure we update the exact record
        );

        if (updateResult.affectedRows > 0) {
             res.status(200).json({ message: 'Email verified successfully.' });
        } else {
             // Should not happen if select was successful, but good to check
             res.status(400).json({ error: 'Verification failed, possibly due to concurrent update.' });
        }

    } catch (err) { // <--- catch
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Database error during verification.', detail: err.message });
    }
});
*/

// GET Novel Details (by novel ID)
app.get('/novel/:id', async (req, res) => { // <--- async
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid novel ID' });


    const sql = 'SELECT * FROM novels WHERE id = ?';
    try { // <--- try
        const [results] = await pool.execute(sql, [id]); // <--- await pool.execute

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบนิยาย' });
        }
        res.json({ success: true, data: results[0] }); // Send the first result
    } catch (err) { // <--- catch
        console.error("❌ Query error getting novel details:", err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย' });
    }
});

// GET Novel Details (duplicate of /novel/:id ? - Keeping consistent name)
app.get('/novels/:id', async (req, res) => { // <--- async
    const { id: novelId } = req.params; // Use novelId for clarity
     if (!novelId || isNaN(novelId)) return res.status(400).json({ success: false, message: 'Invalid novel ID' });

    const sql = `SELECT * FROM novels WHERE id = ?`;
    try { // <--- try
        const [results] = await pool.execute(sql, [novelId]); // <--- await pool.execute
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนิยาย' });
        }
        res.json({ success: true, novel: results[0] });
    } catch (err) { // <--- catch
        console.error("❌ Query error getting novel details (/novels/:id):", err);
        res.status(500).json({ success: false, message: 'Database error', detail: err.message });
    }
});

// DELETE Novel and Related Data (with Transaction)
app.delete('/api/novels/:novelId', async (req, res) => { // <--- async
    const { novelId } = req.params;

    if (!novelId || isNaN(novelId)) { // <--- Add validation
        return res.status(400).json({ success: false, message: 'ต้องระบุ novelId ที่ถูกต้อง' });
    }

    let connection;
    try { // <--- try for transaction
        connection = await pool.getConnection(); // Get connection
        await connection.beginTransaction(); // Start transaction

        // Delete related data first
        await connection.execute('DELETE FROM chapters WHERE novel_id = ?', [novelId]);
        await connection.execute('DELETE FROM novel_owner WHERE novelID = ?', [novelId]);
        await connection.execute('DELETE FROM reading_history WHERE novelId = ?', [novelId]);
        // Consider deleting from 'favorites_novel' as well if it exists and is related
        // await connection.execute('DELETE FROM favorites_novel WHERE novelId = ?', [novelId]);

        // Finally, delete the novel itself
        const [deleteResult] = await connection.execute('DELETE FROM novels WHERE id = ?', [novelId]);

        await connection.commit(); // Commit transaction

        if (deleteResult.affectedRows > 0) {
            // Successfully deleted
            res.json({ success: true, message: 'ลบนิยายและข้อมูลที่เกี่ยวข้องสำเร็จ' });
        } else {
            // Novel with that ID was not found (already deleted or never existed)
            res.status(404).json({ success: false, message: 'ไม่พบนิยายที่ต้องการลบ' });
        }

    } catch (err) { // <--- catch
        console.error('Error deleting novel and related data:', err);
        if (connection) await connection.rollback(); // Rollback on error
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบนิยาย', detail: err.message });
    } finally {
        if (connection) connection.release(); // ALWAYS release connection
    }
});

// POST Change Password
app.post('/api/change-password', async (req, res) => { // <--- async
    const { userId, oldPassword, newPassword, reNewPassword } = req.body;

    // Basic Validation
    if (!userId || !oldPassword || !newPassword || !reNewPassword) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    if (newPassword !== reNewPassword) {
        return res.status(400).json({ error: 'รหัสผ่านใหม่และยืนยันรหัสไม่ตรงกัน' });
    }
    if (newPassword.length < 6) { // <--- Add minimum length check
       return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }
    if (oldPassword === newPassword) {
        return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม' });
    }

    try { // <--- try
        // 1. Find user
        const [users] = await pool.execute('SELECT UserID, password FROM users WHERE UserID = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
        }
        const user = users[0];

        // 2. Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
        }

        // 3. Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 4. Update password in DB
        const [updateResult] = await pool.execute('UPDATE users SET password = ? WHERE UserID = ?', [hashedNewPassword, userId]);

        if (updateResult.affectedRows > 0) {
            res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        } else {
             // Should not happen if user was found, indicates an issue
             console.error(`Password change failed for UserID ${userId} despite successful old password check.`);
             res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน' });
        }

    } catch (err) { // <--- catch
        console.error('Error changing password:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', detail: err.message });
    }
});

// GET All Novels (for listing)
app.get("/api/novels", async (req, res) => { // <--- async
    // Consider adding pagination (LIMIT, OFFSET) for large datasets
    const sql = "SELECT id, title, description, Count, cover_image, author, status FROM novels ORDER BY created_at DESC LIMIT 100"; // Added LIMIT
    try { // <--- try
        const [results] = await pool.query(sql); // <--- await pool.query
        res.json(results);
    } catch (err) { // <--- catch
        console.error("Error fetching all novels:", err);
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
});

// GET User's Favorite Novels (IDs only)
app.get('/api/favorites/:userId', async (req, res) => { // <--- async
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const sql = 'SELECT novelId FROM favorites_novel WHERE UserId = ?';
    try { // <--- try
        const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute
        res.json(results); // Results are already in the format [{ novelId: X }, ...]
    } catch (err) { // <--- catch
        console.error("Database Error fetching novel favorites:", err);
        res.status(500).json({ error: "Failed to fetch novel favorites", details: err.message });
    }
});

// POST Add Novel to Favorites
app.post('/api/favorites', async (req, res) => { // <--- async
    const { userId, novelId } = req.body;

    if (!userId || !novelId || isNaN(novelId)) { // <--- Add validation
        return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง" });
    }

    try { // <--- try
        // 1. Check if already favorited (optional, INSERT IGNORE or check first)
        const [existing] = await pool.execute(
           "SELECT 1 FROM favorites_novel WHERE UserId = ? AND novelId = ? LIMIT 1",
           [userId, novelId]
        );

        if (existing.length > 0) {
             return res.status(409).json({ success: false, message: "มีนิยายเรื่องนี้ในรายการโปรดแล้ว" }); // 409 Conflict
        }

        // 2. Insert into favorites
        const insertSql = "INSERT INTO favorites_novel (UserId, novelId) VALUES (?, ?)";
        const [insertResult] = await pool.execute(insertSql, [userId, novelId]);

        if (insertResult.affectedRows > 0) {
            res.status(201).json({ success: true, message: "เพิ่มในรายการโปรดสำเร็จ" }); // 201 Created
        } else {
             throw new Error("Failed to insert favorite, affectedRows was 0."); // Should not happen without error
        }

    } catch (err) { // <--- catch
        console.error("Error adding novel to favorites:", err);
        // Check for specific duplicate entry error if not checking first
        if (err.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ success: false, message: "มีนิยายเรื่องนี้ในรายการโปรดแล้ว" });
        }
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการเพิ่มรายการโปรด", detail: err.message });
    }
});

// DELETE Novel from Favorites
app.delete('/api/favorites', async (req, res) => { // <--- async
    // Assuming body contains { userId, novelId }
    const { userId, novelId } = req.body;
    if (!userId || !novelId || isNaN(novelId)) { // <--- Add validation
        return res.status(400).json({ error: 'Missing or invalid userId or novelId in request body' });
    }

    const sql = 'DELETE FROM favorites_novel WHERE UserId = ? AND novelId = ?';
    try { // <--- try
        const [result] = await pool.execute(sql, [userId, novelId]); // <--- await pool.execute

        // Check if a row was actually deleted
        if (result.affectedRows > 0) {
            res.json({ success: true, message: "ลบออกจากรายการโปรดสำเร็จ" });
        } else {
             // No favorite found matching the criteria
             res.status(404).json({ success: false, message: "ไม่พบรายการโปรดที่ต้องการลบ" });
        }
    } catch (err) { // <--- catch
        console.error("Database Error deleting novel favorite:", err);
        res.status(500).json({ error: "Failed to delete novel favorite", details: err.message });
    }
});

// GET Chapter Details (handles free, paid, owned, purchase needed logic)
app.get('/chapter/:novelId/:chapter', async (req, res) => { // <--- async
    const { novelId, chapter } = req.params;
    const userId = req.query.userId || null; // Get userId from query param

    if (!novelId || isNaN(novelId) || !chapter || isNaN(chapter)) {
        return res.status(400).json({ success: false, message: 'Invalid novel ID or chapter number' });
    }

    try { // <--- try
        // 1. Get chapter details
        const [chapterResult] = await pool.execute(
            'SELECT id, novel_id, title, content, chapter, price, created_at FROM chapters WHERE novel_id = ? AND chapter = ?',
            [novelId, chapter]
        );

        if (chapterResult.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบตอนที่ระบุ' });
        }
        const chap = chapterResult[0];
        const chapterDataForClient = { // Selectively expose data
             id: chap.id,
             novel_id: chap.novel_id,
             title: chap.title,
             price: chap.price,
             chapter: chap.chapter,
             created_at: chap.created_at,
             // content: chap.content // Content is sent only if accessible
         };


        // 2. Handle Free Chapter
        if (chap.price <= 0) {
            chapterDataForClient.content = chap.content; // Add content for free chapter
            return res.json({ success: true, chapter: chapterDataForClient });
        }

        // --- Paid Chapter Logic ---

        // 3. Check if user is logged in
        if (!userId) {
            // Not logged in, needs purchase/login, but don't send content
            return res.json({ success: false, loginRequired: true, chapter: chapterDataForClient });
        }

        // 4. Check if user owns the chapter
        const [ownedResult] = await pool.execute(
            'SELECT 1 FROM novel_owner WHERE UserID = ? AND ChapterID = ? AND novelID = ? LIMIT 1',
            [userId, chap.chapter, chap.novel_id] // Assuming ChapterID in novel_owner is the chapter number
        );

        if (ownedResult.length > 0) {
            // User owns it, send content
            chapterDataForClient.content = chap.content;
            return res.json({ success: true, chapter: chapterDataForClient });
        }

        // 5. User is logged in, doesn't own it -> Check coins (don't send content yet)
        // This route is just GET, purchase is a separate POST. Indicate purchase is needed.
         return res.json({
             success: false,
             needToPurchase: true,
             chapter: chapterDataForClient // Send chapter details (without content) so client knows price etc.
         });

         /* // Original logic checked coins here, but GET shouldn't imply purchase readiness.
         // The frontend should call POST /purchase if user confirms.
        const [userResult] = await pool.execute('SELECT coins FROM users WHERE UserID = ?', [userId]);

        if (userResult.length === 0) {
            // Should not happen if userId is valid, but handle defensively
            return res.status(404).json({ success: false, message: 'User not found (internal check)' });
        }

        if (userResult[0].coins < chap.price) {
            return res.json({
                success: false,
                notEnoughCoins: true, // User needs to top up
                chapter: chapterDataForClient
             });
        } else {
            // User has enough coins, but hasn't purchased yet.
            return res.json({
                success: false,
                needToPurchase: true, // User can purchase
                chapter: chapterDataForClient
            });
        }
        */

    } catch (err) { // <--- catch
        console.error("Error fetching chapter details:", err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตอน', detail: err.message });
    }
});


// POST Purchase Chapter (with Transaction)
app.post('/purchase', async (req, res) => { // <--- async
    const { userId, chapterId, novelId } = req.body; // chapterId here is the chapter *number*

    if (!userId || !chapterId || isNaN(chapterId) || !novelId || isNaN(novelId)) {
        return res.status(400).json({ success: false, message: 'ข้อมูลสำหรับซื้อตอนไม่ครบถ้วนหรือไม่ถูกต้อง' });
    }

    let connection;
    try { // <--- try for transaction
        // 1. Get chapter details (price) and check existence
        const [chapterResult] = await pool.execute(
            'SELECT id, price FROM chapters WHERE novel_id = ? AND chapter = ?',
            [novelId, chapterId]
        );

        if (chapterResult.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบตอนนิยายที่ต้องการซื้อ' });
        }
        const chapter = chapterResult[0];

        // Ensure chapter is not free (shouldn't be purchasable)
        if (chapter.price <= 0) {
            return res.status(400).json({ success: false, message: 'ตอนนี้อ่านฟรี ไม่จำเป็นต้องซื้อ' });
        }

        // 2. Check if user already owns the chapter
         const [ownedResult] = await pool.execute(
             'SELECT 1 FROM novel_owner WHERE UserID = ? AND ChapterID = ? AND novelID = ? LIMIT 1',
             [userId, chapterId, novelId]
         );
         if (ownedResult.length > 0) {
             return res.status(409).json({ success: false, message: 'คุณซื้อตอนนี้ไปแล้ว' }); // 409 Conflict
         }


        // --- Start Transaction ---
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 3. Get user coins (lock the row for update within transaction)
        const [userResult] = await connection.execute(
            'SELECT coins FROM users WHERE UserID = ? FOR UPDATE', // Lock the user row
            [userId]
        );

        if (userResult.length === 0) {
            // Rollback not strictly needed as nothing changed yet, but good practice
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
        const userCoins = userResult[0].coins;

        // 4. Check if user has enough coins
        if (userCoins < chapter.price) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'เหรียญไม่พอ กรุณาเติมเงิน' });
        }

        // 5. Deduct coins
        await connection.execute(
            'UPDATE users SET coins = coins - ? WHERE UserID = ?',
            [chapter.price, userId]
        );

        // 6. Add ownership record
        await connection.execute(
            'INSERT INTO novel_owner (UserID, ChapterID, novelID) VALUES (?, ?, ?)',
            [userId, chapterId, novelId]
        );

        // 7. Commit Transaction
        await connection.commit();

        res.json({ success: true, message: 'ซื้อตอนสำเร็จ' });

    } catch (err) { // <--- catch
        console.error("Error purchasing chapter:", err);
        if (connection) await connection.rollback(); // Rollback on any error
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระหว่างการซื้อ', detail: err.message });
    } finally {
        if (connection) connection.release(); // ALWAYS release connection
    }
});

// GET Min/Max Chapter Number for a Novel
app.get('/api/novel-chapter-range/:novelId', async (req, res) => { // <--- async
    const { novelId } = req.params;
    if (!novelId || isNaN(novelId)) return res.status(400).json({ success: false, message: 'Invalid novel ID' });

    const sql = 'SELECT MIN(chapter) AS minChapter, MAX(chapter) AS maxChapter FROM chapters WHERE novel_id = ?';
    try { // <--- try
        const [results] = await pool.execute(sql, [novelId]); // <--- await pool.execute

        // results will contain [{ minChapter: X, maxChapter: Y }] even if no chapters exist (X, Y will be null)
        // or if only one chapter exists (X=Y).
        if (!results || results.length === 0) {
             // This case is unlikely with MIN/MAX unless the table is empty or an error occurred
             return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลช่วงตอนของนิยายนี้' });
        }
         // Return the result, handle nulls on the client-side if necessary
         res.json({ success: true, minChapter: results[0].minChapter, maxChapter: results[0].maxChapter });

    } catch (err) { // <--- catch
        console.error("Error fetching chapter range:", err);
        res.status(500).json({ success: false, message: 'Database error', detail: err.message });
    }
});

// GET Specific Chapter by Chapter *Database ID* (distinct from /chapter/:novelId/:chapter)
app.get('/chapters/:id', async (req, res) => { // <--- async
    const { id: chapterDbId } = req.params; // Use chapterDbId for clarity
    if (!chapterDbId || isNaN(chapterDbId)) return res.status(400).json({ success: false, message: 'Invalid chapter database ID' });

    const sql = `SELECT * FROM chapters WHERE id = ?`; // Query by primary key 'id'
    try { // <--- try
        const [results] = await pool.execute(sql, [chapterDbId]); // <--- await pool.execute
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลตอน' });
        }
        // Potentially hide content based on ownership/price if this endpoint is publicly accessible
        // For now, returning all data assuming it's for admin/internal use
        res.json({ success: true, chapter: results[0] });
    } catch (err) { // <--- catch
        console.error("Error fetching chapter by DB ID:", err);
        res.status(500).json({ success: false, message: 'Database error', detail: err.message });
    }
});

// POST Update Novel Details
app.post('/update-novel', async (req, res) => { // <--- async
    const { id, title, description, status } = req.body;

    // Basic validation
    if (!id || isNaN(id) || !title || !description || !status) {
         return res.status(400).json({ success: false, message: 'ข้อมูลสำหรับอัปเดตนิยายไม่ครบถ้วน' });
    }
    // Add more specific validation if needed (e.g., status enum)

    const sql = `
        UPDATE novels
        SET title = ?, description = ?, status = ?
        WHERE id = ?`;
    try { // <--- try
        const [result] = await pool.execute(sql, [title, description, status, id]); // <--- await pool.execute

        if (result.affectedRows > 0) {
            res.json({ success: true, message: '✅ อัปเดตนิยายสำเร็จ' });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบนิยายที่ต้องการอัปเดต' });
        }
    } catch (err) { // <--- catch
        console.error('❌ Update novel error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตนิยาย', detail: err.message });
    }
});

// POST Update Chapter Details (and update novel's chapter count)
app.post('/update-chapter', async (req, res) => { // <--- async
    const { id, title, content, price, NovelNumber, novel_id } = req.body; // NovelNumber is the new chapter number

    // Basic Validation
    if (!id || isNaN(id) || !title || !content || price === undefined || price === null || isNaN(price) || !NovelNumber || isNaN(NovelNumber) || !novel_id || isNaN(novel_id)) {
        return res.status(400).json({ success: false, message: 'ข้อมูลสำหรับอัปเดตตอนไม่ครบถ้วนหรือไม่ถูกต้อง' });
    }
     if (NovelNumber <= 0) {
        return res.status(400).json({ success: false, message: 'หมายเลขตอนต้องเป็นค่าบวก' });
     }

    let connection;
    try { // <--- try for transaction
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Check for chapter number conflict (excluding the current chapter being updated)
        const [conflictCheck] = await connection.execute(
           'SELECT 1 FROM chapters WHERE novel_id = ? AND chapter = ? AND id != ? LIMIT 1',
           [novel_id, NovelNumber, id]
        );
        if (conflictCheck.length > 0) {
           await connection.rollback();
           return res.status(409).json({ success: false, message: `หมายเลขตอนที่ ${NovelNumber} มีอยู่แล้วสำหรับนิยายเรื่องนี้` });
        }

        // 2. Update the specific chapter
        const updateChapterSql = `
            UPDATE chapters
            SET title = ?, content = ?, price = ?, chapter = ?
            WHERE id = ? AND novel_id = ?`; // Added novel_id check for safety
        const [updateResult] = await connection.execute(updateChapterSql, [title, content, price, NovelNumber, id, novel_id]);

        if (updateResult.affectedRows === 0) {
             // Chapter not found or novel_id didn't match
             await connection.rollback();
             return res.status(404).json({ success: false, message: 'ไม่พบตอนที่ต้องการอัปเดต หรือ ID นิยายไม่ตรงกัน' });
        }

        // 3. Find the new highest chapter number for this novel
        const [maxChapterResult] = await connection.execute(
            'SELECT MAX(chapter) AS maxChapter FROM chapters WHERE novel_id = ?',
            [novel_id]
        );
        const maxChapter = maxChapterResult[0]?.maxChapter || 0; // Default to 0 if no chapters

        // 4. Update the Count in the novels table
        await connection.execute(
            'UPDATE novels SET Count = ? WHERE id = ?',
            [maxChapter, novel_id]
        );

        // 5. Commit the transaction
        await connection.commit();

        res.json({ success: true, message: '✅ อัปเดตตอนและจำนวนตอนในนิยายสำเร็จ' });

    } catch (err) { // <--- catch
        console.error('❌ Update chapter/novel count error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', detail: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// POST Upload/Add New Chapter (and update novel's chapter count)
app.post('/upload-chapter', async (req, res) => { // <--- async
    const { novel_id, title, content, price } = req.body;

    // Basic Validation
    if (!novel_id || isNaN(novel_id) || !title || !content || price === undefined || price === null || isNaN(price)) {
        return res.status(400).json({ success: false, message: 'ข้อมูลสำหรับเพิ่มตอนใหม่ไม่ครบถ้วนหรือไม่ถูกต้อง' });
    }

    let connection;
    try { // <--- try for transaction
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Get the current highest chapter number for this novel (lock the novel row or chapters implicitly)
        // Locking chapters table might be too broad, let's rely on transaction isolation + MAX()
        const [latestChapterResult] = await connection.execute(
            'SELECT MAX(chapter) AS latest FROM chapters WHERE novel_id = ?', // FOR UPDATE might be needed if concurrent adds are frequent
            [novel_id]
        );
        const latest = latestChapterResult[0]?.latest ?? 0; // Default to 0 if no chapters yet
        const newChapterNumber = latest + 1;

        // 2. Insert the new chapter
        const insertSql = `
            INSERT INTO chapters (novel_id, title, content, chapter, price)
            VALUES (?, ?, ?, ?, ?)`;
        const [insertResult] = await connection.execute(insertSql, [novel_id, title, content, newChapterNumber, price]);
        const newChapterDbId = insertResult.insertId; // Get the new chapter's database ID

        // 3. Update the Count in the novels table to the new highest chapter number
        const updateNovelCountSQL = `UPDATE novels SET Count = ? WHERE id = ?`;
        await connection.execute(updateNovelCountSQL, [newChapterNumber, novel_id]);

        // 4. Commit the transaction
        await connection.commit();

        res.status(201).json({
             success: true,
             message: 'เพิ่มตอนใหม่เรียบร้อยแล้ว',
             chapterNumber: newChapterNumber, // Send back the new chapter number
             chapterId: newChapterDbId // Send back the new chapter DB ID
         });

    } catch (err) { // <--- catch
        console.error('❌ Error uploading chapter/updating count:', err);
        if (connection) await connection.rollback();
        // Check if the error was due to novel_id not existing in 'novels' table (foreign key constraint)
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(404).json({ success: false, message: `ไม่พบนิยาย ID: ${novel_id} ไม่สามารถเพิ่มตอนได้` });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มตอน', detail: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// GET All Chapters for a Specific Novel
app.get('/get-chapters', async (req, res) => { // <--- async
    const { id: novelId } = req.query; // Read 'id' from query parameters

    if (!novelId || isNaN(novelId)) {
        return res.status(400).json({ success: false, message: 'ต้องระบุ novel_id ที่ถูกต้องใน query parameter (?id=...)' });
    }

    const sql = `
        SELECT id, novel_id, title, chapter, price, created_at
        FROM chapters
        WHERE novel_id = ?
        ORDER BY chapter ASC`; // Select only necessary fields for listing

    try { // <--- try
        const [results] = await pool.execute(sql, [novelId]); // <--- await pool.execute
        res.json({ success: true, chapters: results });
    } catch (err) { // <--- catch
        console.error("Error fetching chapters for novel:", err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการตอน', detail: err.message });
    }
});

// DELETE User Address (by address ID)
app.delete('/api/addresses/:addressId', async (req, res) => { // <--- async
    const { addressId } = req.params;
    if (!addressId || isNaN(addressId)) {
        return res.status(400).json({ error: "Invalid address ID" });
    }

    const sql = 'DELETE FROM address WHERE id = ?';
    try { // <--- try
        const [result] = await pool.execute(sql, [addressId]); // <--- await pool.execute
        if (result.affectedRows > 0) {
            res.json({ success: true, message: "ลบที่อยู่สำเร็จ" });
        } else {
            res.status(404).json({ error: "Address not found" });
        }
    } catch (err) { // <--- catch
        console.error("Error deleting address:", err);
        res.status(500).json({ error: "Delete failed", detail: err.message });
    }
});

// GET Owned Chapter Numbers for a User and Novel
app.get('/check-owner', async (req, res) => { // <--- async
    const { userId, novelId } = req.query;

    if (!userId || !novelId || isNaN(novelId)) {
        return res.status(400).json({ success: false, message: 'Missing or invalid userId or novelId query parameters' });
    }

    const sql = `
        SELECT ChapterID FROM novel_owner
        WHERE UserID = ? AND novelID = ?
        ORDER BY ChapterID ASC`; // Assuming ChapterID is the chapter number

    try { // <--- try
        const [results] = await pool.execute(sql, [userId, novelId]); // <--- await pool.execute

        const ownedChapters = results.map(row => row.ChapterID); // Extract just the numbers
        res.json({ success: true, ownedChapters });
    } catch (err) { // <--- catch
        console.error('Database error checking chapter ownership:', err);
        res.status(500).json({ success: false, message: 'DB Error checking ownership', detail: err.message });
    }
});

// POST Upload New Novel (with cover image)
app.post('/upload-novel', upload.single('image'), async (req, res) => { // <--- async, middleware first
    const { title, author, description, userId, username } = req.body;
    // Construct the URL path for the image based on the static route
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null; // Use URL path

    // Validation
    if (!title || !description || !userId || !username) { // Author might be optional? Adjust if needed
        // If upload failed but data is invalid, we might have an orphaned file.
        // Consider deleting req.file.path if validation fails after upload.
        if (req.file) {
           fs.unlink(req.file.path, (err) => { // Attempt to delete uploaded file
               if (err) console.error("Error deleting orphaned upload file:", err);
           });
        }
        return res.status(400).json({ success: false, message: 'ข้อมูลสำหรับสร้างนิยายไม่ครบถ้วน' });
    }
    // Add more validation (length limits etc.)

    const sql = `INSERT INTO novels (title, description, cover_image, userid, author, uploadby, status, Count)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`; // Added status and Count defaults

    try { // <--- try
        const [result] = await pool.execute(sql, [
            title,
            description,
            imagePath,
            userId,
            author || username, // Default author to username if empty?
            username,
            'ongoing', // Default status to 'ongoing' or 'draft'?
            0 // Default chapter Count to 0
        ]); // <--- await pool.execute

        if (result.affectedRows > 0) {
             res.status(201).json({
                  success: true,
                  message: 'บันทึกนิยายเรียบร้อยแล้ว',
                  novelId: result.insertId // Return the ID of the newly created novel
             });
        } else {
             throw new Error("Failed to insert novel, affectedRows was 0.");
        }
    } catch (err) { // <--- catch
        console.error('❌ Upload novel error:', err);
         // If DB insert fails after file upload, delete the file
         if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting upload file after DB error:", unlinkErr);
            });
         }
        res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกข้อมูลนิยายได้', detail: err.message });
    }
});

// GET Members (assuming 'member' is a different table)
app.get('/api/members', async (req, res) => { // <--- async
    const sql = 'SELECT * FROM member ORDER BY ID ASC'; // Adjust table/column names if needed
    try { // <--- try
        const [results] = await pool.query(sql); // <--- await pool.query
        res.json(results);
    } catch (err) { // <--- catch
        console.error("Error fetching members:", err);
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
});

// GET Novels (Public Search)
app.get('/novels', async (req, res) => { // <--- async
    const search = req.query.search || '';
    // Consider adding status filter e.g., WHERE status = 'published' AND title LIKE ?
    const sql = `
        SELECT id, title, description, Count, cover_image, author, status, created_at
        FROM novels
        WHERE title LIKE ?
        ORDER BY created_at DESC
        LIMIT 50`; // Add LIMIT for safety
    const searchTerm = `%${search}%`;

    try { // <--- try
        const [results] = await pool.execute(sql, [searchTerm]); // <--- await pool.execute
        res.json({ success: true, data: results });
    } catch (err) { // <--- catch
        console.error("❌ Query error searching novels:", err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหานิยาย', detail: err.message });
    }
});

// GET Novels (User's Own Novels Search)
app.get('/api/novel', async (req, res) => { // <--- async
    const search = req.query.search || '';
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'กรุณาส่ง userId มาด้วย' });
    }

    const sql = `
        SELECT id, title, description, Count, cover_image, author, status, created_at, uploadby
        FROM novels
        WHERE userid = ? AND title LIKE ?
        ORDER BY created_at DESC
        LIMIT 100`; // Add LIMIT
    const searchTerm = `%${search}%`;

    try { // <--- try
        const [results] = await pool.execute(sql, [userId, searchTerm]); // <--- await pool.execute

        // Process results to ensure cover_image path is correct if needed (already handled by static route)
        // const processedResults = results.map(novel => ({
        //     ...novel,
        //     cover_image: novel.cover_image ? novel.cover_image : null // Ensure consistency
        // }));

        res.json({ success: true, data: results }); // Send original results
    } catch (err) { // <--- catch
        console.error("❌ Query error searching user's novels:", err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหานิยายของคุณ', error: err.message });
    }
});

// POST Login
app.post('/login', async (req, res) => { // <--- async
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    try { // <--- try
        // Select user data, including necessary fields for the session/token
        const sql = 'SELECT UserID, username, password, email, name, lastname, Roles, coins, IsVerified FROM users WHERE username = ? LIMIT 1';
        const [results] = await pool.execute(sql, [username]); // <--- await pool.execute

        if (results.length === 0) {
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }); // Keep messages vague for security
        }

        const user = results[0];

        // Check if password exists (should always exist if user found)
        if (!user.password) {
             console.error(`User ${username} found but has no password hash.`);
             return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ (รหัสผ่าน)' });
        }

        // Compare password
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }); // Keep messages vague
        }

        // Optional: Check if account is verified (if verification flow is active)
        // if (!user.IsVerified) {
        //    return res.status(403).json({ error: 'บัญชียังไม่ได้ยืนยันอีเมล', verificationNeeded: true }); // 403 Forbidden
        // }


        // --- Login successful ---

        // Remove password from user object before sending/signing token
        const userDataForToken = { ...user };
        delete userDataForToken.password;


        // Create JWT Token
        const token = jwt.sign(
            {
                userId: user.UserID,
                username: user.username,
                roles: user.Roles // Include roles if needed for frontend authorization
                // Add other non-sensitive data if needed
            },
            secretKey,
            { expiresIn: '1h' } // Token expiration time (e.g., 1 hour)
        );

        // Send back user data (without password) and the token
        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: userDataForToken, // Send user details (needed for frontend state)
            token: token          // Send the JWT
        });

        // Alternatively, use session-based login (if not using JWT)
        /*
        req.session.user = { // Store user data in session
             userId: user.UserID,
             username: user.username,
             roles: user.Roles,
             // ... other needed data
        };
        req.session.save(err => { // Explicitly save session before sending response
             if (err) {
                  console.error("Session save error:", err);
                  return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกเซสชัน' });
             }
             res.status(200).json({ message: 'เข้าสู่ระบบสำเร็จ', user: userDataForToken });
        });
        */


    } catch (err) { // <--- catch
        console.error("Login error:", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบระหว่างการเข้าสู่ระบบ', detail: err.message });
    }
});


// POST Forgot Password (Send Reset Email with New Password) - More secure than sending link usually
app.post('/api/reset-password', async (req, res) => { // <--- async
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'กรุณากรอกอีเมล' });

    // Always return a generic success message to prevent email enumeration attacks
    const genericSuccessMessage = 'หากมีอีเมลนี้อยู่ในระบบ คุณจะได้รับอีเมลพร้อมคำแนะนำในการรีเซ็ตรหัสผ่าน';

    try { // <--- try
        // 1. Find user by email
        const [users] = await pool.execute('SELECT UserID, username FROM users WHERE email = ? LIMIT 1', [email]);

        if (users.length === 0) {
            // User not found, but return generic message
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.json({ success: true, message: genericSuccessMessage });
        }
        const user = users[0];

        // 2. Generate a new strong random password
        const newPassword = generateRandomPassword(12); // Generate a 12-char password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 3. Update the user's password in the database
        const [updateResult] = await pool.execute(
            'UPDATE users SET password = ? WHERE UserID = ?',
            [hashedPassword, user.UserID]
        );

        if (updateResult.affectedRows === 0) {
            // Should not happen if user was found, indicates potential race condition or DB issue
            console.error(`Failed to update password for UserID ${user.UserID} during reset.`);
             // Still send generic success to client, but log the error
             return res.json({ success: true, message: genericSuccessMessage });
        }

        // 4. Send the *new* password via email (Inform user to change it immediately)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'รหัสผ่านใหม่สำหรับบัญชี Lestial V ของคุณ',
            text: `สวัสดีคุณ ${user.username},\n\nรหัสผ่านสำหรับบัญชี Lestial V ของคุณถูกรีเซ็ตแล้ว\n\nรหัสผ่านใหม่ของคุณคือ: ${newPassword}\n\nกรุณาเข้าสู่ระบบด้วยรหัสผ่านนี้และเปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัยของคุณ\n\nหากคุณไม่ได้ร้องขอการรีเซ็ตนี้ กรุณาติดต่อเราทันที\n\nขอบคุณครับ,\nทีมงาน Lestial V`,
            html: `<p>สวัสดีคุณ ${user.username},</p><p>รหัสผ่านสำหรับบัญชี Lestial V ของคุณถูกรีเซ็ตแล้ว</p><p>รหัสผ่านใหม่ของคุณคือ: <strong>${newPassword}</strong></p><p>กรุณาเข้าสู่ระบบด้วยรหัสผ่านนี้และ<strong>เปลี่ยนรหัสผ่านทันที</strong>เพื่อความปลอดภัยของคุณ</p><p>หากคุณไม่ได้ร้องขอการรีเซ็ตนี้ กรุณาติดต่อเราทันที</p><p>ขอบคุณครับ,<br/>ทีมงาน Lestial V</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending password reset email:', error);
                // Log error, but still send generic success to client
            } else {
                console.log('Password reset email sent to:', email, info.response);
            }
             // Always return generic success message
             res.json({ success: true, message: genericSuccessMessage });
        });

    } catch (err) { // <--- catch
        console.error("Error processing password reset request:", err);
        // Return generic success even on internal errors for security
        res.json({ success: true, message: genericSuccessMessage });
    }
});


// GET User Profile (including address)
app.get('/api/users/:id', async (req, res) => { // <--- async
    const { id: userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    try { // <--- try
        // Use a JOIN to get user and address data in one query
        const sql = `
            SELECT
                u.UserID, u.username, u.email, u.name, u.lastname, u.coins, u.Roles, u.IsVerified, u.created_at,
                a.id as addressId, a.telephone, a.address as streetAddress, a.province, a.district, a.zipcode, a.imgprofile
            FROM users u
            LEFT JOIN address a ON u.UserID = a.UserID
            WHERE u.UserID = ?`; // Use LEFT JOIN in case address doesn't exist yet

        const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = results[0];

        // Structure the response nicely
        const responseData = {
            UserID: userData.UserID,
            username: userData.username,
            email: userData.email,
            name: userData.name,
            lastname: userData.lastname,
            coins: userData.coins,
            Roles: userData.Roles,
            IsVerified: userData.IsVerified,
            created_at: userData.created_at,
            address: userData.addressId ? { // Include address object only if it exists
                id: userData.addressId,
                telephone: userData.telephone,
                streetAddress: userData.streetAddress,
                province: userData.province,
                district: userData.district,
                zipcode: userData.zipcode,
                imgprofile: userData.imgprofile ? `/uploads/${userData.imgprofile}` : null // Construct profile image URL
            } : null
        };

        res.json(responseData);

    } catch (err) { // <--- catch
        console.error('Error fetching user profile data:', err);
        res.status(500).json({ error: 'Failed to fetch user data', detail: err.message });
    }
});


// POST Topup with Slip (Manual Verification Implied) - Transactional Update
app.post('/slip', upload.single('image'), async (req, res) => { // <--- async
    const { ref, amount, userId } = req.body;
    const imageFile = req.file; // Get file object

    // Validation
    if (!ref || !amount || isNaN(amount) || Number(amount) <= 0 || !userId || !imageFile) {
         // Delete uploaded file if validation fails
         if (imageFile) fs.unlink(imageFile.path, err => { if (err) console.error("Error deleting invalid slip upload:", err); });
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน หรือไม่ถูกต้อง (ref, amount, userId, image)' });
    }

    const imagePath = imageFile.filename; // Store filename in DB, serve via static route
    const topupAmount = Number(amount);

    let connection;
    try { // <--- try for transaction
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Check if 'ref' already exists in the topup table (within transaction)
        const [existingRef] = await connection.execute(
            'SELECT ID FROM topup WHERE ref = ? LIMIT 1 FOR UPDATE', // Lock for check
            [ref]
        );

        if (existingRef.length > 0) {
            await connection.rollback();
            // Delete uploaded file as ref is duplicate
            fs.unlink(imageFile.path, err => { if (err) console.error("Error deleting duplicate slip upload:", err); });
            return res.status(409).json({ error: 'รายการอ้างอิง (ref) นี้มีอยู่ในระบบแล้ว' }); // 409 Conflict
        }

        // 2. Insert topup record (assuming status 'pending' until approved by admin?)
        // Add a 'status' column: 'pending', 'approved', 'rejected'
        // Add an 'approved_at', 'rejected_at', 'admin_notes' column?
        const topupSql = 'INSERT INTO topup (UserID, imgslip, ref, amount, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
        await connection.execute(topupSql, [userId, imagePath, ref, topupAmount, 'approved']); // Assuming auto-approved for now


        // 3. Update user's coins (Only if approved immediately, otherwise do this when admin approves)
        const updateUserSql = 'UPDATE users SET coins = coins + ? WHERE UserID = ?';
        await connection.execute(updateUserSql, [topupAmount, userId]);


        // 4. Commit transaction
        await connection.commit();

        res.json({
            message: 'บันทึกข้อมูลการเติมเงินสำเร็จ', // Adjust message if pending approval
            ref: ref,
            amount: topupAmount,
            imgslip: `/uploads/${imagePath}` // Return URL path
        });

    } catch (err) { // <--- catch
        console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลเติมเงิน:', err);
        if (connection) await connection.rollback();
        // Delete uploaded file on error
        fs.unlink(imageFile.path, unlinkErr => { if (unlinkErr) console.error("Error deleting slip upload after DB error:", unlinkErr); });
        // Check for foreign key error if UserID doesn't exist
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({ error: `ไม่พบผู้ใช้ UserID: ${userId}` });
        }
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', detail: err.message });
    } finally {
        if (connection) connection.release();
    }
});


// GET Products (All or Filtered)
app.get('/products', async (req, res) => { // <--- async
    // Add filtering/searching/pagination later if needed
    // Example: /products?type=Book&search=Fantasy&page=1&limit=20
    const sql = 'SELECT * FROM product ORDER BY Product_id DESC LIMIT 200'; // Added LIMIT
    try { // <--- try
        const [results] = await pool.query(sql); // <--- await pool.query
        // Process image paths if necessary (e.g., prepend /uploads/)
        const processedResults = results.map(p => ({
             ...p,
             Product_img: p.Product_img ? `/uploads/${p.Product_img}` : null
        }));
        res.json(processedResults);
    } catch (error) { // <--- catch
        console.error("Database Error fetching products:", error);
        res.status(500).json({ error: 'Database query failed', detail: error.message });
    }
});

// GET Distinct Product Types
app.get('/product-types', async (req, res) => { // <--- async
    const sql = 'SELECT DISTINCT product_type FROM product ORDER BY product_type';
    try { // <--- try
        const [results] = await pool.query(sql); // <--- await pool.query
        res.json(results.map(row => row.product_type)); // Return array of strings
    } catch (err) { // <--- catch
        console.error("Error fetching product types:", err);
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
});

// GET Single Product Details
app.get('/products/:id', async (req, res) => { // <--- async
    const { id: productId } = req.params;
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid Product ID' });
    }

    const sql = 'SELECT * FROM product WHERE Product_id = ?';
    try { // <--- try
        const [results] = await pool.execute(sql, [productId]); // <--- await pool.execute

        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = results[0];
        product.Product_img = product.Product_img ? `/uploads/${product.Product_img}` : null; // Fix image path
        res.json(product);

    } catch (error) { // <--- catch
        console.error("Database Error fetching single product:", error);
        res.status(500).json({ error: 'Database query failed', detail: error.message });
    }
});

// DELETE Product
app.delete('/products/:id', async (req, res) => { // <--- async
    const { id: productId } = req.params;
     if (!productId || isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid Product ID' });
    }

    // TODO: Consider related data - What happens if this product is in orders, favorites, carts?
    // Option 1: Prevent deletion if referenced (check first).
    // Option 2: Use ON DELETE SET NULL / ON DELETE CASCADE (database level).
    // Option 3: Delete related records here (requires transaction).

    // For now, just delete the product record. WARNING: May leave orphaned references.
    const sql = 'DELETE FROM product WHERE Product_id = ?';
    try { // <--- try
         // Optional: Get image filename before deleting to remove file
         const [productData] = await pool.execute("SELECT Product_img FROM product WHERE Product_id = ?", [productId]);

        const [result] = await pool.execute(sql, [productId]); // <--- await pool.execute

        if (result.affectedRows > 0) {
             // Attempt to delete image file if it existed
             if (productData.length > 0 && productData[0].Product_img) {
                 const imageFilePath = path.join(__dirname, 'uploads', productData[0].Product_img);
                 fs.unlink(imageFilePath, (err) => {
                      if (err && err.code !== 'ENOENT') { // Ignore 'file not found' errors
                           console.error(`Error deleting product image ${imageFilePath}:`, err);
                      }
                 });
             }
            res.json({ message: 'Product deleted successfully' });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (err) { // <--- catch
        console.error('Error deleting product:', err);
        // Check for foreign key constraint errors if related data prevents deletion
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(409).json({ error: 'Cannot delete product: It is referenced in other records (e.g., orders, favorites).', code: err.code });
        }
        res.status(500).json({ error: 'Failed to delete product', detail: err.message });
    }
});

// GET Products grouped by Category (for homepage/shop overview)
app.get('/api/products', async (req, res) => { // <--- async
    // Get all products (or maybe filter by status='in-stock'?)
    // Order by type and then maybe recency within type?
    const sql = `
        SELECT Product_type, Product_id, Product_name, Product_price, Product_img, Product_description, Product_count, Product_status
        FROM product
        WHERE Product_status = 'in-stock' AND Product_count > 0 -- Example filter
        ORDER BY Product_type ASC, Product_id DESC`; // Order to easily group and slice

    try { // <--- try
        const [results] = await pool.query(sql); // <--- await pool.query

        const categories = {};
        results.forEach(product => {
            // Fix image path
            product.Product_img = product.Product_img ? `/uploads/${product.Product_img}` : null;

            if (!categories[product.Product_type]) {
                categories[product.Product_type] = {
                    name: product.Product_type,
                    products: []
                };
            }
            // Add product to its category
            categories[product.Product_type].products.push(product);
        });

        // Format for the client, maybe limit products per category shown initially
        const formattedCategories = Object.values(categories).map(category => ({
            name: category.name,
            // Slice to show N newest products per category on the overview page
            products: category.products.slice(0, 4) // Example: Show newest 4
        }));

        res.json(formattedCategories);

    } catch (err) { // <--- catch
        console.error("Error fetching products by category:", err);
        res.status(500).json({ error: 'Failed to fetch products', detail: err.message });
    }
});

// POST Add Product to Favorites (Assuming different favorites table: 'favorites')
app.post('/api/Favorite', async (req, res) => { // <--- async
    const { UserID, Product_id } = req.body;

    if (!UserID || !Product_id || isNaN(Product_id)) {
        return res.status(400).json({ error: 'Missing or invalid UserID or Product_id' });
    }

    const sql = `INSERT INTO favorites (UserID, Product_id) VALUES (?, ?)`;
    try { // <--- try
        await pool.execute(sql, [UserID, Product_id]); // <--- await pool.execute
        res.status(201).json({ message: 'Favorite added successfully' }); // 201 Created
    } catch (err) { // <--- catch
        if (err.code === 'ER_DUP_ENTRY') {
            // Already favorited
            return res.status(409).json({ error: 'Product already in favorites' }); // 409 Conflict
        }
         if (err.code === 'ER_NO_REFERENCED_ROW_2') {
             // UserID or Product_id doesn't exist
             return res.status(404).json({ error: 'User or Product not found' });
        }
        console.error("Error adding product favorite:", err);
        res.status(500).json({ error: 'Failed to add favorite', detail: err.message });
    }
});

// DELETE Product from Favorites
app.delete('/api/Favorite', async (req, res) => { // <--- async
    // Assuming body contains { UserID, Product_id }
    const { UserID, Product_id } = req.body;

    if (!UserID || !Product_id || isNaN(Product_id)) {
        return res.status(400).json({ error: 'Missing or invalid UserID or Product_id' });
    }

    const sql = `DELETE FROM favorites WHERE UserID = ? AND Product_id = ?`;
    try { // <--- try
        const [result] = await pool.execute(sql, [UserID, Product_id]); // <--- await pool.execute

        if (result.affectedRows > 0) {
            res.json({ message: 'Favorite removed successfully' });
        } else {
            // Favorite not found for this user/product combination
            res.status(404).json({ error: 'Favorite not found' });
        }
    } catch (err) { // <--- catch
        console.error("Error removing product favorite:", err);
        res.status(500).json({ error: 'Failed to remove favorite', detail: err.message });
    }
});

// GET User Role/Permissions Check
app.get('/api/checkroles/:id', async (req, res) => { // <--- async
    const { id: userId } = req.params;
     if (!userId) return res.status(400).json({ error: 'User ID is required' });

    // It's generally better to verify the role via a validated JWT or session
    // rather than a direct API call like this, but translating the original...
    const sql = 'SELECT UserID, username, Roles FROM users WHERE UserID = ?';
    try { // <--- try
        const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]); // Send UserID, username, Roles
    } catch (err) { // <--- catch
        console.error('Error fetching user roles:', err);
        res.status(500).json({ error: 'Failed to fetch user data', detail: err.message });
    }
});
// POST Update/Insert Reading History
app.post('/api/reading-history', async (req, res) => { // <--- async
  const { userId, novelId, chapterNumber } = req.body;
  if (!userId || !novelId || !chapterNumber || isNaN(novelId) || isNaN(chapterNumber)) {
      return res.status(400).json({ success: false, message: "Missing or invalid data (userId, novelId, chapterNumber)" });
  }

  try { // <--- try
      // Use INSERT ... ON DUPLICATE KEY UPDATE for atomicity and simplicity
      const sql = `
          INSERT INTO reading_history (userId, novelId, chapterNumber, readAt)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
              chapterNumber = VALUES(chapterNumber),
              readAt = VALUES(readAt)
      `;
      const [result] = await pool.execute(sql, [userId, novelId, chapterNumber]); // <--- await pool.execute

      // result.affectedRows will be 1 for INSERT, 2 for UPDATE (usually)
      if (result.affectedRows > 0) {
          // Determine if it was an insert or update based on insertId
           const action = result.insertId === 0 ? 'updated' : 'inserted';
           res.json({ success: true, status: action });
      } else {
           // This might happen if data was identical and no update occurred. Treat as success.
           res.json({ success: true, status: 'unchanged' });
      }

  } catch (err) { // <--- catch
      console.error("❌ Error upserting reading history:", err);
      // Check for foreign key errors (e.g., userId or novelId doesn't exist)
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
           return res.status(404).json({ success: false, message: 'User or Novel not found.' });
      }
      res.status(500).json({ success: false, message: 'Database error', detail: err.message });
  }
});

// GET User's Favorite Products (Full Product Details)
app.get('/api/Favorites', async (req, res) => { // <--- async
  const { userId } = req.query; // Read from query string
  if (!userId) return res.status(400).json({ error: 'Missing userId query parameter' });

  const sql = `
      SELECT p.*
      FROM favorites f
      JOIN product p ON f.Product_id = p.Product_id
      WHERE f.UserID = ?
      ORDER BY f.favorited_at DESC`; // Assuming favorites table has a timestamp

  try { // <--- try
      const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute
       // Process image paths
      const processedResults = results.map(p => ({
           ...p,
           Product_img: p.Product_img ? `/uploads/${p.Product_img}` : null
      }));
      res.json(processedResults);
  } catch (err) { // <--- catch
      console.error("Error fetching favorite products:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// GET User's Favorite Novels (Full Novel Details)
app.get('/api/FavoritesNovel', async (req, res) => { // <--- async
  const { userId } = req.query; // Read from query string
  if (!userId) return res.status(400).json({ error: 'Missing userId query parameter' });

  const sql = `
      SELECT n.id, n.title, n.description, n.Count, n.cover_image, n.author, n.status, n.created_at
      FROM favorites_novel f
      JOIN novels n ON f.novelId = n.id
      WHERE f.UserID = ?
      ORDER BY f.favorited_at DESC`; // Assuming favorites_novel table has a timestamp

  try { // <--- try
      const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute
       // Process cover image paths (assuming they are stored relative to uploads)
       const processedResults = results.map(novel => ({
           ...novel,
           cover_image: novel.cover_image ? novel.cover_image : null // Already includes /uploads/ prefix from upload? Check consistency
       }));
      res.json(processedResults);
  } catch (err) { // <--- catch
      console.error("Error fetching favorite novels:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// GET Products by Category Name
app.get('/api/category/:name', async (req, res) => { // <--- async
  try { // <--- Moved try block up
      const categoryName = decodeURIComponent(req.params.name); // Decode URI component
      if (!categoryName) {
           return res.status(400).json({ error: 'Category name is required' });
      }

      const sql = `
          SELECT *
          FROM product
          WHERE Product_type = ? AND Product_status = 'in-stock' AND Product_count > 0 -- Example filter
          ORDER BY Product_id DESC
          LIMIT 100`; // Add LIMIT

      const [results] = await pool.execute(sql, [categoryName]); // <--- await pool.execute
       // Process image paths
       const processedResults = results.map(p => ({
           ...p,
           Product_img: p.Product_img ? `/uploads/${p.Product_img}` : null
       }));
      res.json(processedResults);
  } catch (err) { // <--- catch
      console.error('Error fetching category products:', err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST Upload/Add New Product
app.post('/api/uploadproducts', upload.single('image'), async (req, res) => { // <--- async
  const { name, price, quantity, category, details, status } = req.body;
  const imageFile = req.file;
  const imagePath = imageFile ? `uploads/${imageFile.filename}` : null; // Use filename, serve via static route

  // Basic validation
  if (!name || !price || isNaN(price) || quantity === undefined || quantity === null || isNaN(quantity) || !category || !status) {
      // Delete uploaded file if validation fails
      if (imageFile) fs.unlink(imageFile.path, err => { if (err) console.error("Error deleting invalid product upload:", err); });
      return res.status(400).json({ error: "ข้อมูลสินค้าไม่ครบถ้วนหรือไม่ถูกต้อง (name, price, quantity, category, status)" });
  }

  const sql = `
      INSERT INTO product (
          Product_name, Product_price, Product_count, Product_type,
          Product_img, Product_description, Product_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

  try { // <--- try
      const [result] = await pool.execute(sql, [
          name,
          parseFloat(price), // Ensure price is number
          parseInt(quantity, 10), // Ensure quantity is integer
          category,
          imagePath ? imagePath.replace('uploads/', '') : null, // Store relative path without 'uploads/'
          details || null, // Allow empty details
          status
      ]); // <--- await pool.execute

      res.status(201).json({ // 201 Created
           message: "เพิ่มสินค้าสำเร็จ!",
           productId: result.insertId,
           imageUrl: imagePath ? `/uploads/${imagePath}`: null // Return full URL path
      });
  } catch (err) { // <--- catch
      console.error('Error adding product:', err);
       // Delete uploaded file if DB insert fails
       if (imageFile) fs.unlink(imageFile.path, unlinkErr => { if (unlinkErr) console.error("Error deleting product upload after DB error:", unlinkErr); });
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า", detail: err.message });
  }
});


// POST Update Cart (Bulk - Replace Cart) - Requires Transaction
app.post('/api/cart', async (req, res) => { // <--- async
  const { UserID, cartItems } = req.body;

  if (!UserID || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: 'Invalid request body (UserID, cartItems[] required)' });
  }

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Validate all items first (check existence and stock)
      const productIds = cartItems.map(item => item.Product_id).filter(id => id); // Get valid IDs
      let productData = [];
      if (productIds.length > 0) {
          const [productsInDb] = await connection.execute(
              `SELECT Product_id, Product_name, Product_count, Product_status FROM product WHERE Product_id IN (?)`,
              [productIds]
          );
          productData = productsInDb;
      }

      // Check each item
      for (const item of cartItems) {
           if (!item.Product_id || isNaN(item.Product_id) || !item.quantity || isNaN(item.quantity) || item.quantity < 0) {
               throw new Error(`ข้อมูลสินค้าในตะกร้าไม่ถูกต้อง: ${JSON.stringify(item)}`); // Throw error to rollback
           }
          const dbProduct = productData.find(p => p.Product_id === item.Product_id);
          if (!dbProduct) {
              throw new Error(`ไม่พบสินค้า Product ID: ${item.Product_id}`); // Throw error
          }
          if (dbProduct.Product_status !== 'in-stock') {
               throw new Error(`สินค้า '${dbProduct.Product_name}' ไม่พร้อมจำหน่าย`);
          }
          if (dbProduct.Product_count < item.quantity) {
              throw new Error(`สินค้า '${dbProduct.Product_name}' มีไม่เพียงพอ (ต้องการ ${item.quantity}, มี ${dbProduct.Product_count})`); // Throw error
          }
      }

      // 2. Clear existing cart for the user
      await connection.execute('DELETE FROM carts WHERE UserID = ?', [UserID]);

      // 3. Insert new cart items if any valid items exist
      if (cartItems.length > 0) {
           // Filter out items with quantity 0 before inserting
           const validItems = cartItems.filter(item => item.quantity > 0);
           if (validItems.length > 0) {
               const insertSql = 'INSERT INTO carts (UserID, Product_id, quantity) VALUES ?'; // Use bulk insert syntax
               const values = validItems.map(item => [UserID, item.Product_id, item.quantity]);
               await connection.query(insertSql, [values]); // Use connection.query for bulk insert helper
           }
      }

      // 4. Commit transaction
      await connection.commit();

      res.json({ success: true, message: 'อัปเดตตะกร้าสินค้าสำเร็จ' });

  } catch (err) { // <--- catch
      console.error("❌ Error updating cart:", err);
      if (connection) await connection.rollback(); // Rollback on any error
      res.status(err instanceof Error && (err.message.includes('ไม่พบสินค้า') || err.message.includes('ไม่เพียงพอ') || err.message.includes('ไม่ถูกต้อง')) ? 400 : 500) // Use 400 for validation errors
         .json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
      if (connection) connection.release(); // ALWAYS release connection
  }
});


// DELETE Chapter (and update novel count) - Requires Transaction
app.delete('/chapters/:id', async (req, res) => { // <--- async
  const { id: chapterDbId } = req.params;
  if (!chapterDbId || isNaN(chapterDbId)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter database ID' });
  }

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Get novel_id of the chapter to be deleted
      const [chapterResult] = await connection.execute(
          'SELECT novel_id FROM chapters WHERE id = ? FOR UPDATE', // Lock the row
          [chapterDbId]
      );

      if (chapterResult.length === 0) {
          await connection.rollback(); // Nothing to delete
          return res.status(404).json({ success: false, message: 'ไม่พบตอนนี้' });
      }
      const novelId = chapterResult[0].novel_id;

      // 2. Delete the chapter
      const [deleteResult] = await connection.execute('DELETE FROM chapters WHERE id = ?', [chapterDbId]);

      if (deleteResult.affectedRows === 0) {
          // Should not happen if selected, but check anyway
           await connection.rollback();
           return res.status(404).json({ success: false, message: 'ไม่พบตอนนี้ (อาจถูกลบไปแล้ว)' });
      }

      // 3. Find the new highest chapter number for this novel
      const [maxChapterResult] = await connection.execute(
          'SELECT MAX(chapter) AS maxChapter FROM chapters WHERE novel_id = ?',
          [novelId]
      );
      const maxChapter = maxChapterResult[0]?.maxChapter ?? 0; // Use 0 if no chapters left

      // 4. Update the Count in the novels table
      await connection.execute(
          'UPDATE novels SET Count = ? WHERE id = ?',
          [maxChapter, novelId]
      );

      // 5. Commit the transaction
      await connection.commit();

      res.json({ success: true, message: 'ลบตอนและอัปเดตจำนวนตอนสำเร็จ' });

  } catch (err) { // <--- catch
      console.error("❌ Error deleting chapter/updating count:", err);
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบตอน', detail: err.message });
  } finally {
      if (connection) connection.release();
  }
});

// DELETE Item from Cart
app.delete('/api/cart/delete', async (req, res) => { // <--- async
  const { UserID, Product_id } = req.body;

  if (!UserID || !Product_id || isNaN(Product_id)) {
      return res.status(400).json({ error: 'Missing or invalid UserID or Product_id' });
  }

  const sql = `DELETE FROM carts WHERE UserID = ? AND Product_id = ?`;
  try { // <--- try
      const [result] = await pool.execute(sql, [UserID, Product_id]); // <--- await pool.execute

      if (result.affectedRows > 0) {
          res.json({ success: true, message: 'Product removed from cart successfully' });
      } else {
          res.status(404).json({ success: false, message: 'Product not found in user cart' });
      }
  } catch (err) { // <--- catch
      console.error("Error removing product from cart:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// GET Cart Contents for User (with Product Details)
app.get("/api/cart/:userId", async (req, res) => { // <--- async
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const sql = `
      SELECT
          c.UserID, c.Product_id, c.quantity,
          p.Product_name, p.Product_price, p.Product_img, p.Product_description, p.Product_status, p.Product_count
      FROM carts c
      JOIN product p ON c.Product_id = p.Product_id
      WHERE c.UserID = ?`;

  try { // <--- try
      const [result] = await pool.execute(sql, [userId]); // <--- await pool.execute
       // Process image paths
       const processedResult = result.map(item => ({
           ...item,
           Product_img: item.Product_img ? `/uploads/${item.Product_img}` : null
       }));
      res.json(processedResult);
  } catch (err) { // <--- catch
      console.error("Error fetching user cart:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});


// POST Get Product Details for Order Preview (Show Order)
app.post("/api/showorder", async (req, res) => { // <--- async
  const { userId, productIds } = req.body; // Assuming productIds is an array of IDs

  if (!userId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "❌ UserID และ Product_ids (array) จำเป็นต้องมีค่า" });
  }

  // Ensure productIds contains only numbers
  const validProductIds = productIds.filter(id => !isNaN(id));
  if (validProductIds.length === 0) {
       return res.status(400).json({ error: "❌ ไม่พบ Product IDs ที่ถูกต้อง" });
  }

  // Use IN clause safely with placeholders generated based on array length
  const placeholders = validProductIds.map(() => '?').join(',');
  const sql = `SELECT * FROM product WHERE Product_id IN (${placeholders})`;

  try { // <--- try
      const [result] = await pool.execute(sql, validProductIds); // <--- await pool.execute
       // Process image paths
       const processedResult = result.map(p => ({
           ...p,
           Product_img: p.Product_img ? `/uploads/${p.Product_img}` : null
       }));
      res.json(processedResult);
  } catch (err) { // <--- catch
      console.error("Error fetching products for order preview:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST Add Item to Cart (Single Item) - Use UPSERT logic
app.post('/api/carts', async (req, res) => { // <--- async
  const { Product_id, UserID, quantity } = req.body;

  if (!Product_id || isNaN(Product_id) || !UserID || !quantity || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง (Product_id, UserID, quantity > 0 required)' });
  }

  // Use INSERT ... ON DUPLICATE KEY UPDATE to handle adding or increasing quantity
  const sql = `
      INSERT INTO carts (Product_id, UserID, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
  `;

  try { // <--- try
      // Optional: Check product existence and stock before adding
      const [productCheck] = await pool.execute(
           'SELECT Product_count, Product_status FROM product WHERE Product_id = ?',
           [Product_id]
      );
      if (productCheck.length === 0) {
           return res.status(404).json({ error: 'ไม่พบสินค้า' });
      }
      if (productCheck[0].Product_status !== 'in-stock') {
          return res.status(400).json({ error: 'สินค้าไม่พร้อมจำหน่าย' });
      }
      // Check stock vs requested quantity (and potentially existing cart quantity if updating)
      // This part is slightly complex with ON DUPLICATE KEY UPDATE. A simpler approach might be:
      // 1. SELECT existing quantity.
      // 2. Check total desired quantity against stock.
      // 3. INSERT or UPDATE accordingly. (Requires transaction for safety).
      // For now, proceeding with the simple UPSERT.

      const [results] = await pool.execute(sql, [Product_id, UserID, quantity]); // <--- await pool.execute

      if (results.affectedRows > 0) {
          res.status(201).json({ message: 'เพิ่มสินค้าลงตะกร้าหรืออัปเดตจำนวนแล้ว' }); // 201 Created or 200 OK
      } else {
           // Should not happen without error with this UPSERT logic
           throw new Error("Cart update failed unexpectedly.");
      }
  } catch (err) { // <--- catch
      console.error('Error adding/updating cart item:', err);
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
          return res.status(404).json({ error: 'User หรือ Product ไม่พบในระบบ' });
      }
      if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') { // Example if you have check constraints
          return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง (เช่น จำนวนติดลบ)' });
      }
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มสินค้าลงตะกร้า', detail: err.message });
  }
});


// GET User Cart and Favorite Counts
app.get('/api/user-badge-counts/:userId', async (req, res) => { // <--- async
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  // Define queries
  const cartQuery = 'SELECT SUM(quantity) AS cartCount FROM carts WHERE UserID = ?';
  const favQuery = 'SELECT COUNT(*) AS favCount FROM favorites WHERE UserID = ?'; // Assuming 'favorites' table for products
  const favNovelQuery = 'SELECT COUNT(*) AS favNovelCount FROM favorites_novel WHERE UserID = ?'; // Assuming 'favorites_novel' table

  try { // <--- try
      // Execute queries in parallel
      const [
          [cartResult], // Destructure inner array for cart
          [favResult],    // Destructure inner array for favorites
          [favNovelResult] // Destructure inner array for novel favorites
       ] = await Promise.all([
          pool.execute(cartQuery, [userId]),
          pool.execute(favQuery, [userId]),
          pool.execute(favNovelQuery, [userId])
       ]); // <--- await Promise.all

      // Extract counts, defaulting to 0 if null/undefined
      const cartCount = cartResult?.[0]?.cartCount ?? 0;
      const favCount = favResult?.[0]?.favCount ?? 0;
      const favNovelCount = favNovelResult?.[0]?.favNovelCount ?? 0;

      // Send combined results
      res.json({
          cartCount: cartCount,
          favCount: favCount,
          favNovelCount: favNovelCount,
          totalFavCount: favCount + favNovelCount // Combine if needed by frontend
       });

  } catch (err) { // <--- catch
      console.error('❌ Error querying user badge counts:', err);
      res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลจำนวนได้', detail: err.message });
  }
});

// GET User Orders (with Product Details)
app.get('/api/user-orders/:userId', async (req, res) => { // <--- async
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const sql = 'SELECT * FROM orders WHERE UserID = ? ORDER BY order_date DESC';

  try { // <--- try
      const [orders] = await pool.execute(sql, [userId]); // <--- await pool.execute

      if (orders.length === 0) {
          return res.json({ orders: [], productDetailsMap: {} }); // Return empty if no orders
      }

      // Collect all unique product IDs from all orders
      const allProductIds = new Set();
      orders.forEach(order => {
          try {
              const products = JSON.parse(order.Product || '[]'); // Default to empty array
              order.Product = products; // Replace JSON string with parsed array
              products.forEach(p => {
                  if (p.product_id) allProductIds.add(p.product_id);
               });
          } catch (e) {
              console.error(`❌ JSON parse error for OrderID ${order.OrderID}:`, e);
              order.Product = []; // Set to empty array on parse error
              order.parseError = true; // Flag the error
          }
      });

      const uniqueIds = Array.from(allProductIds);
      let productDetailsMap = {}; // Use a map for easy lookup

      // Fetch product details if there are any IDs
      if (uniqueIds.length > 0) {
          const placeholders = uniqueIds.map(() => '?').join(',');
          const productSql = `SELECT Product_id, Product_name, Product_img, Product_price FROM product WHERE Product_id IN (${placeholders})`;
          const [productDetails] = await pool.execute(productSql, uniqueIds); // <--- await pool.execute

          // Create a map for quick lookup: { productId: { details } }
           productDetails.forEach(p => {
               p.Product_img = p.Product_img ? `/uploads/${p.Product_img}` : null; // Process image path
               productDetailsMap[p.Product_id] = p;
           });
      }

      // Optionally enrich orders with product details directly (or send map separately)
      // orders.forEach(order => {
      //      if (Array.isArray(order.Product)) {
      //           order.Product = order.Product.map(p => ({
      //                ...p,
      //                details: productDetailsMap[p.product_id] || { Product_name: 'ไม่พบสินค้า', Product_img: null, Product_price: null } // Add details or default
      //           }));
      //      }
      // });


      // Send back orders (with parsed Product array) and the product details map
      res.json({ orders, productDetailsMap });

  } catch (err) { // <--- catch
      console.error("Error fetching user orders:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});


// PUT Update Cart Item Quantity (Single Item)
app.put('/api/carts/update', async (req, res) => { // <--- async
  const { Product_id, UserID, quantity } = req.body;

  // Validate quantity
  if (!Product_id || isNaN(Product_id) || !UserID || quantity === undefined || quantity === null || isNaN(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง (Product_id, UserID, quantity >= 0 required)' });
  }

  try { // <--- try
      let sql;
      let params;

      if (quantity === 0) {
          // If quantity is 0, delete the item
          sql = 'DELETE FROM carts WHERE Product_id = ? AND UserID = ?';
          params = [Product_id, UserID];
      } else {
          // Otherwise, update the quantity
          sql = 'UPDATE carts SET quantity = ? WHERE Product_id = ? AND UserID = ?';
          params = [quantity, Product_id, UserID];
      }

      const [results] = await pool.execute(sql, params); // <--- await pool.execute

      if (results.affectedRows > 0) {
           res.json({ message: quantity === 0 ? 'ลบสินค้าออกจากตะกร้าแล้ว' : 'อัปเดตจำนวนสินค้าแล้ว' });
      } else {
           // No row found matching Product_id and UserID
           res.status(404).json({ error: 'ไม่พบสินค้าในตะกร้าของผู้ใช้นี้' });
      }

  } catch (err) { // <--- catch
      console.error('Error updating cart item quantity:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตตะกร้า', detail: err.message });
  }
});

// POST Update Cart Item Quantity (Alternative Endpoint)
// This seems redundant with the PUT endpoint above, choose one. Assuming PUT is preferred RESTfully.
// Converting this one too for completeness.
app.post("/api/cart/update", async (req, res) => { // <--- async
  const { userId, productId, quantity } = req.body;

   if (!userId || !productId || isNaN(productId) || quantity === undefined || quantity === null || isNaN(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง (userId, productId, quantity >= 0 required)' });
  }

  try { // <--- try
      let sql;
      let params;

      if (quantity === 0) {
          // If quantity is 0, delete the item
          sql = "DELETE FROM carts WHERE UserID = ? AND Product_id = ?";
          params = [userId, productId];
      } else {
          // Otherwise, update the quantity
          sql = "UPDATE carts SET quantity = ? WHERE UserID = ? AND Product_id = ?";
          params = [quantity, userId, productId];
      }
      const [results] = await pool.execute(sql, params); // <--- await pool.execute

      if (results.affectedRows > 0) {
           res.json({ message: quantity === 0 ? "Removed from cart" : "Cart updated" });
      } else {
           res.status(404).json({ error: "Item not found in user's cart" });
      }

  } catch (err) { // <--- catch
      console.error("Error updating cart item (POST):", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST Cancel Order - Requires Transaction
app.post('/api/cancel-order', async (req, res) => { // <--- async
  const { orderId, userId } = req.body;
  if (!orderId || !userId) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน (orderId, userId required)' });
  }

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Get current order details and lock the row
      const [orderResult] = await connection.execute(
          'SELECT OrderID, Status, Total, totalAfterCoins, Product, payby FROM orders WHERE OrderID = ? AND UserID = ? FOR UPDATE',
          [orderId, userId]
      );

      if (orderResult.length === 0) {
          await connection.rollback(); // No need to rollback, but good practice
          return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อ หรือคำสั่งซื้อนี้ไม่ใช่ของคุณ' });
      }
      const order = orderResult[0];

      // Check if order can be cancelled
      const cancellableStatuses = ['รอพนักงานรับคำสั่งซื้อ', 'รอการชำระเงิน', 'พนักงานรับคำสั่งซื้อ']; // Define which statuses can be cancelled
      if (!cancellableStatuses.includes(order.Status)) {
           await connection.rollback();
           return res.status(400).json({ success: false, message: `ไม่สามารถยกเลิกคำสั่งซื้อในสถานะ "${order.Status}" ได้` });
      }

      // 2. Update order status to "ยกเลิกคำสั่งซื้อ"
      const newStatus = 'ยกเลิกคำสั่งซื้อ';
      await connection.execute(
          'UPDATE orders SET Status = ? WHERE OrderID = ?',
          [newStatus, orderId]
      );

      let refundAmount = 0;
      let stockRestored = false;
      let coinsRefunded = false;

      // 3. Refund coins if applicable
      // Refund if status was 'รอพนักงานรับคำสั่งซื้อ' (paid fully by coins)
      // OR if status was 'รอการชำระเงิน' but paid partially by coins
      if (order.Status === 'รอพนักงานรับคำสั่งซื้อ' || (order.Status === 'รอการชำระเงิน' && (order.payby === 'coins' || order.payby === 'coins_and_promptpay'))) {
           // Calculate refund amount (coins used)
          refundAmount = order.Total - order.totalAfterCoins; // Assuming totalAfterCoins is the amount *paid by promptpay*, so Total - that = coins used
           if (refundAmount > 0) {
               await connection.execute(
                   'UPDATE users SET coins = coins + ? WHERE UserID = ?',
                   [refundAmount, userId]
               );
               coinsRefunded = true;
           }
      }

      // 4. Restore product stock (only if it was previously deducted, i.e., status was 'รอพนักงานรับคำสั่งซื้อ')
      let productsToRestore = [];
      if (order.Status === 'รอพนักงานรับคำสั่งซื้อ') {
          try {
              productsToRestore = JSON.parse(order.Product || '[]');
          } catch (e) {
               console.error(`Error parsing Product JSON for order ${orderId} during cancellation:`, e);
               // Decide how to handle - maybe log and continue without restoring stock?
               // For safety, we might rollback here.
               await connection.rollback();
               return res.status(500).json({ success: false, message: 'ข้อมูลสินค้าในคำสั่งซื้อไม่ถูกต้อง ไม่สามารถยกเลิกได้' });
          }

          if (productsToRestore.length > 0) {
              const updateStockTasks = productsToRestore.map(item => {
                  if (!item.product_id || !item.quantity || isNaN(item.quantity)) {
                      console.warn(`Skipping stock restore for invalid item in order ${orderId}:`, item);
                      return Promise.resolve(); // Skip invalid items
                  }
                  return connection.execute(
                      'UPDATE product SET Product_count = Product_count + ? WHERE Product_id = ?',
                      [item.quantity, item.product_id]
                  );
              });

              await Promise.all(updateStockTasks);
              stockRestored = true;
          }
      }

      // 5. Commit transaction
      await connection.commit();

      let message = 'ยกเลิกคำสั่งซื้อสำเร็จ';
      if (coinsRefunded) message += ` คืน ${refundAmount} เหรียญแล้ว`;
      if (stockRestored) message += ' คืนสต็อกสินค้าแล้ว';

      res.json({ success: true, message: message });

  } catch (err) { // <--- catch
      console.error("❌ Error cancelling order:", err);
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบขณะยกเลิกคำสั่งซื้อ', detail: err.message });
  } finally {
      if (connection) connection.release();
  }
});


// GET User Coins
app.get('/api/users/coins/:userId', async (req, res) => { // <--- async
  const { userId } = req.params;
   if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try { // <--- try
      const [results] = await pool.execute("SELECT coins FROM users WHERE UserID = ?", [userId]); // <--- await pool.execute

      if (results.length === 0) {
          return res.status(404).json({ message: "User not found" });
      }
      res.json({ coins: results[0].coins });
  } catch (error) { // <--- catch
      console.error("Error fetching user coins:", error);
      res.status(500).json({ message: 'Database error', detail: error.message });
  }
});

// POST Create Order (Paid by Coins) - Requires Transaction
app.post('/api/order', async (req, res) => { // <--- async
  const { userId, products, address, total, totalAfterCoins, status, payby } = req.body; // Assuming total is the amount to pay *by coins*

  // Validation
  if (!userId || !products || !Array.isArray(products) || products.length === 0 || !address || typeof address !== 'object' || !total || isNaN(total) || total < 0) {
      return res.status(400).json({ message: "ข้อมูลคำสั่งซื้อไม่ครบถ้วนหรือไม่ถูกต้อง" });
  }
  // Validate product structure
  for(const p of products) {
      if (!p.product_id || isNaN(p.product_id) || !p.quantity || isNaN(p.quantity) || p.quantity <= 0) {
          return res.status(400).json({ message: `ข้อมูลสินค้าไม่ถูกต้อง: ${JSON.stringify(p)}` });
      }
  }
   // Assuming payby = 'coins' for this endpoint
  const finalPayby = payby || 'coins';
  const finalStatus = status || 'รอพนักงานรับคำสั่งซื้อ'; // Default status for coin payment

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // --- Generate Order ID ---
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      // Get count within transaction for safety against race conditions
      const [[{ orderCount }]] = await connection.execute(
          "SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(order_date) = CURDATE() FOR UPDATE"
      );
      const newOrderCount = orderCount + 1;
      const orderId = `LSV-${day}${month}${year}-${newOrderCount}`;
      // --- End Generate Order ID ---

      // --- Check User Coins and Product Stock ---
      // Lock user row
      const [userResult] = await connection.execute('SELECT coins FROM users WHERE UserID = ? FOR UPDATE', [userId]);
      if (userResult.length === 0) {
          throw new Error("ไม่พบผู้ใช้");
      }
      if (userResult[0].coins < total) {
          throw new Error("เหรียญไม่พอชำระเงิน");
      }

      // Check stock for all products
      const productIds = products.map(p => p.product_id);
      const placeholders = productIds.map(() => '?').join(',');
      const [productData] = await connection.execute(
           `SELECT Product_id, Product_name, Product_count, Product_status FROM product WHERE Product_id IN (${placeholders}) FOR UPDATE`,
           productIds
      );
       const productMap = new Map(productData.map(p => [p.Product_id, p]));

       for (const item of products) {
           const dbProduct = productMap.get(item.product_id);
           if (!dbProduct) throw new Error(`ไม่พบสินค้า ID: ${item.product_id}`);
           if (dbProduct.Product_status !== 'in-stock') throw new Error(`สินค้า '${dbProduct.Product_name}' ไม่พร้อมจำหน่าย`);
           if (dbProduct.Product_count < item.quantity) throw new Error(`สินค้า '${dbProduct.Product_name}' มีไม่เพียงพอ (ต้องการ ${item.quantity}, มี ${dbProduct.Product_count})`);
       }
      // --- End Check User Coins and Product Stock ---


      // --- Perform Order Operations ---
      // 1. Insert Order
      await connection.execute(
          "INSERT INTO orders (OrderID, UserID, Product, Address, Total, totalAfterCoins, order_date, Status, payby) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)",
          [orderId, userId, JSON.stringify(products), JSON.stringify(address), total, totalAfterCoins ?? 0, finalStatus, finalPayby]
      );

      // 2. Deduct Coins
      await connection.execute("UPDATE users SET coins = coins - ? WHERE UserID = ?", [total, userId]);

      // 3. Clear Cart (Delete items that were ordered)
      const cartPlaceholders = productIds.map(() => '?').join(',');
      await connection.execute(`DELETE FROM carts WHERE UserID = ? AND Product_id IN (${cartPlaceholders})`, [userId, ...productIds]);

      // 4. Update Product Stock
      const stockUpdateTasks = products.map(item =>
          connection.execute(
              'UPDATE product SET Product_count = Product_count - ? WHERE Product_id = ?',
              [item.quantity, item.product_id]
          )
      );
      await Promise.all(stockUpdateTasks);
      // --- End Perform Order Operations ---


      // --- Commit Transaction ---
      await connection.commit();

      res.status(201).json({ message: "ชำระเงินและสร้างคำสั่งซื้อสำเร็จ!", orderId });

  } catch (err) { // <--- catch
      console.error("❌ Error creating order (coins):", err);
      if (connection) await connection.rollback();
      res.status(err.message.includes('ไม่พบ') || err.message.includes('ไม่พอ') ? 400 : 500)
         .json({ error: err.message || "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ" });
  } finally {
      if (connection) connection.release();
  }
});


// GET User Addresses
app.get('/api/addresses/:userId', async (req, res) => { // <--- async
  const { userId } = req.params;
   if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try { // <--- try
      const [results] = await pool.execute("SELECT * FROM address WHERE UserID = ? ORDER BY is_default DESC, id DESC", [userId]); // <--- await pool.execute
      res.json(results);
  } catch (err) { // <--- catch
      console.error("❌ SQL Error fetching addresses:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST Check if Item Exists in Cart
app.post('/api/carts/check', async (req, res) => { // <--- async
  const { Product_id, UserID } = req.body;

  if (!Product_id || isNaN(Product_id) || !UserID) {
       return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง (Product_id, UserID required)' });
  }

  const sql = 'SELECT quantity FROM carts WHERE Product_id = ? AND UserID = ?';
  try { // <--- try
      const [results] = await pool.execute(sql, [Product_id, UserID]); // <--- await pool.execute

      if (results.length > 0) {
          res.json({ exists: true, quantity: results[0].quantity });
      } else {
          res.json({ exists: false, quantity: 0 }); // Return quantity 0 for consistency
      }
  } catch (err) { // <--- catch
      console.error('DB Error checking cart item:', err);
      res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// POST Add New User Address
app.post('/api/addresses/:userId', async (req, res) => { // <--- async
  const { userId } = req.params;
  const {
      firstName, lastName, phone,
      address, province, district, sub_district, postal,
      is_default // Optional: flag if this should be the default address
  } = req.body;

   if (!userId || !firstName || !lastName || !phone || !address || !province || !district || !sub_district || !postal) {
        return res.status(400).json({ error: 'ข้อมูลที่อยู่ไม่ครบถ้วน' });
   }
  // Basic validation (lengths, formats) could be added here

   let connection;
  try { // <--- try (use transaction if setting default)
       connection = await pool.getConnection();
       await connection.beginTransaction();

       // If setting this as default, unset other defaults first
       if (is_default) {
            await connection.execute('UPDATE address SET is_default = 0 WHERE UserID = ? AND is_default = 1', [userId]);
       }

      const sql = `
          INSERT INTO address (
              UserID, firstName, lastName, telephone,
              address, province, district, sub_district, postal, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const values = [
          userId, firstName, lastName, phone,
          address, province, district, sub_district, postal, is_default ? 1 : 0
      ];

      const [result] = await connection.execute(sql, values); // <--- await connection.execute

      await connection.commit(); // Commit transaction

      const newAddress = { // Construct response object
          id: result.insertId, // Use 'id' instead of 'addressID' if table uses 'id'
          UserID: userId,
          firstName, lastName, telephone: phone,
          address, province, district, sub_district, postal,
          is_default: is_default ? 1 : 0
      };
      res.status(201).json(newAddress); // 201 Created

  } catch (err) { // <--- catch
      if (connection) await connection.rollback();
      console.error("❌ Error inserting address:", err);
       if (err.code === 'ER_NO_REFERENCED_ROW_2') {
           return res.status(404).json({ error: 'User not found' });
       }
      res.status(500).json({ error: "Insert failed", detail: err.message });
  } finally {
      if (connection) connection.release();
  }
});


// POST Create Order (Paid by PromptPay Only) - Requires Transaction
app.post('/api/promptpay', async (req, res) => { // <--- async
  const { userId, products, address, total, totalAfterCoins, status, payby } = req.body;

  // Validation
  if (!userId || !products || !Array.isArray(products) || products.length === 0 || !address || typeof address !== 'object' || !total || isNaN(total) || total < 0) {
      return res.status(400).json({ message: "ข้อมูลคำสั่งซื้อไม่ครบถ้วนหรือไม่ถูกต้อง" });
  }
   for(const p of products) { /* ... validation from /api/order ... */ }
  const finalPayby = payby || 'promptpay';
  const finalStatus = status || 'รอการชำระเงิน'; // Default for promptpay

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // --- Generate Order ID (Same as /api/order) ---
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const [[{ orderCount }]] = await connection.execute(
          "SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(order_date) = CURDATE() FOR UPDATE"
      );
      const newOrderCount = orderCount + 1;
      const orderId = `LSV-${day}${month}${year}-${newOrderCount}`;
      // --- End Generate Order ID ---

      // --- Check Product Stock (No need to check coins here) ---
      const productIds = products.map(p => p.product_id);
      const placeholders = productIds.map(() => '?').join(',');
      const [productData] = await connection.execute(
           `SELECT Product_id, Product_name, Product_count, Product_status FROM product WHERE Product_id IN (${placeholders}) FOR UPDATE`,
           productIds
      );
       const productMap = new Map(productData.map(p => [p.Product_id, p]));
       for (const item of products) { /* ... stock validation from /api/order ... */
            const dbProduct = productMap.get(item.product_id);
            if (!dbProduct) throw new Error(`ไม่พบสินค้า ID: ${item.product_id}`);
            if (dbProduct.Product_status !== 'in-stock') throw new Error(`สินค้า '${dbProduct.Product_name}' ไม่พร้อมจำหน่าย`);
            if (dbProduct.Product_count < item.quantity) throw new Error(`สินค้า '${dbProduct.Product_name}' มีไม่เพียงพอ (ต้องการ ${item.quantity}, มี ${dbProduct.Product_count})`);
       }
      // --- End Check Product Stock ---


      // --- Perform Order Operations ---
      // 1. Insert Order
      await connection.execute(
          "INSERT INTO orders (OrderID, UserID, Product, Address, Total, totalAfterCoins, order_date, Status, payby) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)",
          [orderId, userId, JSON.stringify(products), JSON.stringify(address), total, totalAfterCoins ?? total, finalStatus, finalPayby] // totalAfterCoins = total for promptpay only
      );

      // 2. Clear Cart (Delete items that were ordered)
       const cartPlaceholders = productIds.map(() => '?').join(',');
       await connection.execute(`DELETE FROM carts WHERE UserID = ? AND Product_id IN (${cartPlaceholders})`, [userId, ...productIds]);

      // 3. DO NOT Deduct Stock Yet - Stock should only be deducted when payment is confirmed (e.g., via webhook or manual approval)
      // --- End Perform Order Operations ---

      // --- Commit Transaction ---
      await connection.commit();

      res.status(201).json({ message: "สร้างคำสั่งซื้อสำเร็จ กรุณาชำระเงิน", orderId });

  } catch (err) { // <--- catch
      console.error("❌ Error creating order (promptpay):", err);
      if (connection) await connection.rollback();
      res.status(err.message.includes('ไม่พบ') || err.message.includes('ไม่พอ') ? 400 : 500)
         .json({ error: err.message || "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ" });
  } finally {
      if (connection) connection.release();
  }
});

// POST Create Order (Paid by Coins + PromptPay) - Requires Transaction
app.post('/api/coins_and_promptpay', async (req, res) => { // <--- async
  const { userId, products, address, total, coins, totalAfterCoins, status, payby } = req.body; // 'coins' is the amount paid by coins

  // Validation
  if (!userId || !products || !Array.isArray(products) || products.length === 0 || !address || typeof address !== 'object' || !total || isNaN(total) || total < 0 || !coins || isNaN(coins) || coins < 0 || !totalAfterCoins || isNaN(totalAfterCoins) || totalAfterCoins < 0) {
      return res.status(400).json({ message: "ข้อมูลคำสั่งซื้อไม่ครบถ้วนหรือไม่ถูกต้อง" });
  }
   if (Math.abs((coins + totalAfterCoins) - total) > 0.01) { // Check if amounts add up (allow small float errors)
       return res.status(400).json({ message: "ยอดชำระไม่ถูกต้อง (coins + promptpay != total)" });
   }
   for(const p of products) { /* ... validation from /api/order ... */ }
  const finalPayby = payby || 'coins_and_promptpay';
  const finalStatus = status || 'รอการชำระเงิน'; // Default for combined payment

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // --- Generate Order ID (Same as /api/order) ---
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const [[{ orderCount }]] = await connection.execute(
          "SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(order_date) = CURDATE() FOR UPDATE"
      );
      const newOrderCount = orderCount + 1;
      const orderId = `LSV-${day}${month}${year}-${newOrderCount}`;
      // --- End Generate Order ID ---


      // --- Check User Coins and Product Stock ---
       // Lock user row
       const [userResult] = await connection.execute('SELECT coins FROM users WHERE UserID = ? FOR UPDATE', [userId]);
       if (userResult.length === 0) throw new Error("ไม่พบผู้ใช้");
       if (userResult[0].coins < coins) throw new Error("เหรียญไม่พอสำหรับส่วนที่ชำระด้วยเหรียญ"); // Check against 'coins' amount

       // Check stock (same as /api/order)
       const productIds = products.map(p => p.product_id);
       const placeholders = productIds.map(() => '?').join(',');
       const [productData] = await connection.execute(
            `SELECT Product_id, Product_name, Product_count, Product_status FROM product WHERE Product_id IN (${placeholders}) FOR UPDATE`,
            productIds
       );
        const productMap = new Map(productData.map(p => [p.Product_id, p]));
        for (const item of products) { /* ... stock validation from /api/order ... */
             const dbProduct = productMap.get(item.product_id);
             if (!dbProduct) throw new Error(`ไม่พบสินค้า ID: ${item.product_id}`);
             if (dbProduct.Product_status !== 'in-stock') throw new Error(`สินค้า '${dbProduct.Product_name}' ไม่พร้อมจำหน่าย`);
             if (dbProduct.Product_count < item.quantity) throw new Error(`สินค้า '${dbProduct.Product_name}' มีไม่เพียงพอ (ต้องการ ${item.quantity}, มี ${dbProduct.Product_count})`);
        }
      // --- End Check User Coins and Product Stock ---


      // --- Perform Order Operations ---
      // 1. Insert Order
      await connection.execute(
          "INSERT INTO orders (OrderID, UserID, Product, Address, Total, totalAfterCoins, order_date, Status, payby) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)",
          [orderId, userId, JSON.stringify(products), JSON.stringify(address), total, totalAfterCoins, finalStatus, finalPayby]
      );

      // 2. Deduct Coins (only the 'coins' part)
      await connection.execute("UPDATE users SET coins = coins - ? WHERE UserID = ?", [coins, userId]);

      // 3. Clear Cart
       const cartPlaceholders = productIds.map(() => '?').join(',');
       await connection.execute(`DELETE FROM carts WHERE UserID = ? AND Product_id IN (${cartPlaceholders})`, [userId, ...productIds]);

      // 4. DO NOT Deduct Stock Yet (Same reason as promptpay only)
      // --- End Perform Order Operations ---


      // --- Commit Transaction ---
      await connection.commit();

      res.status(201).json({ message: "สร้างคำสั่งซื้อสำเร็จ กรุณาชำระเงินส่วนที่เหลือ", orderId });

  } catch (err) { // <--- catch
      console.error("❌ Error creating order (coins + promptpay):", err);
      if (connection) await connection.rollback();
      res.status(err.message.includes('ไม่พบ') || err.message.includes('ไม่พอ') ? 400 : 500)
         .json({ error: err.message || "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ" });
  } finally {
      if (connection) connection.release();
  }
});


// POST Create Order and Items (Example using separate items table) - Transaction Required
// Assuming `db` is the pool here from the original code context.
app.post("/ordersDate", async (req, res) => { // <--- async
  const { products, order_date } = req.body; // order_date might not be needed if using NOW()

  if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products in order" });
  }
   // Validate product structure in array
   for (const p of products) {
       if (!p.product_id || isNaN(p.product_id) || !p.quantity || isNaN(p.quantity) || p.quantity <= 0) {
           return res.status(400).json({ error: `Invalid product data: ${JSON.stringify(p)}` });
       }
   }

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection(); // Use pool
      await connection.beginTransaction();

      // Insert into orders table (assuming minimal data here, add UserID etc. as needed)
      const orderQuery = "INSERT INTO orders (order_date, Status) VALUES (NOW(), ?)"; // Example: use NOW()
      const [orderResult] = await connection.execute(orderQuery, ['pending']); // Use connection.execute
      const orderId = orderResult.insertId;

      // Insert into order_items table
      const itemQuery = `INSERT INTO order_items (order_id, product_id, quantity) VALUES ?`; // Bulk insert
      const itemValues = products.map(product => [orderId, product.product_id, product.quantity]);
      await connection.query(itemQuery, [itemValues]); // Use connection.query for bulk helper

      await connection.commit(); // Commit transaction

      res.status(201).json({ message: "Order placed", order_id: orderId });

  } catch (error) { // <--- catch
      console.error("Error creating order with items:", error);
      if (connection) await connection.rollback();
      res.status(500).json({ error: "Internal Server Error", detail: error.message });
  } finally {
      if (connection) connection.release();
  }
});


// GET Orders (Admin/All or User Specific) with Formatted Product List
app.get('/orders', async (req, res) => { // <--- async
  const { userID } = req.query; // Parameter name changed to match frontend?
  let sql = `
      SELECT OrderID, UserID, Product, Address, order_date, Total, totalAfterCoins, Status, Post_Tracking, is_read
      FROM orders
  `;
  const params = [];

  if (userID) {
      sql += ' WHERE UserID = ?';
      params.push(userID);
  }
  sql += ' ORDER BY order_date DESC LIMIT 500'; // Add LIMIT

  try { // <--- try
      const [results] = await pool.execute(sql, params); // <--- await pool.execute

      const formattedResults = results.map(order => {
          let products = [];
          let productString = 'ข้อมูลสินค้าไม่ถูกต้อง';
           let productIds = [];
          try {
              products = JSON.parse(order.Product || '[]');
               productString = products.map(p => `${p.name || `ID:${p.product_id}`} x ${p.quantity || '?'}`).join('<br/>');
               productIds = products.map(p => p.product_id).filter(id => id); // Extract IDs
          } catch (e) {
              console.error(`Error parsing Product JSON for OrderID ${order.OrderID}: ${e.message}`);
          }
          // Address parsing can be added here if needed

          return {
              OrderID: order.OrderID,
              UserID: order.UserID, // Include UserID
              Product: productString, // Formatted string
              Product_ids: productIds, // Array of IDs
              OrderDate: order.order_date,
              Price: order.Total,
              AfterCoins: order.totalAfterCoins,
              Status: order.Status,
              PostTracking: order.Post_Tracking || '-',
              is_read: order.is_read // Include read status
              // Address: parsedAddressObject (if parsing address)
          };
      });

      res.json(formattedResults);
  } catch (err) { // <--- catch
      console.error("Error fetching orders:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// GET Search Products
app.get('/api/search', async (req, res) => { // <--- async
  const search = req.query.q;

  if (!search) return res.status(400).json({ error: 'Missing search query (q parameter)' });

  const sql = `
      SELECT * FROM product
      WHERE (Product_name LIKE ? OR Product_description LIKE ?)
        AND Product_status = 'in-stock' -- Example: only search active products
      LIMIT 50`; // Add LIMIT
  const keyword = `%${search}%`;

  try { // <--- try
      const [results] = await pool.execute(sql, [keyword, keyword]); // <--- await pool.execute
      // Process image paths
      const processedResults = results.map(p => ({
          ...p,
          Product_img: p.Product_img ? `/uploads/${p.Product_img}` : null
      }));
      res.json(processedResults);
  } catch (err) { // <--- catch
      console.error("Error searching products:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});


// GET Specific Order Details (with Products and Address)
app.get('/api/order/:orderId', async (req, res) => { // <--- async
  const { orderId } = req.params;
  if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

  try { // <--- try
      // Get order details
      const [orderResults] = await pool.execute("SELECT * FROM orders WHERE OrderID = ?", [orderId]); // <--- await pool.execute

      if (orderResults.length === 0) {
          return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
      }
      const order = orderResults[0];

      // Parse Product JSON
      let products = [];
      try {
          products = JSON.parse(order.Product || '[]');
      } catch (jsonErr) {
          console.error(`Product JSON parse error for Order ${orderId}:`, jsonErr);
          // Decide how to handle - return error or empty array?
           return res.status(500).json({ error: 'ข้อมูล Product ในคำสั่งซื้อไม่ถูกต้อง', detail: jsonErr.message });
      }

      // Parse Address JSON
      let addressData = {};
      let formattedAddress = { name: '', phone: '', full_address: '', full: '' }; // Default structure
      try {
           addressData = JSON.parse(order.Address || '{}');
           // Format address (handle different possible structures)
            formattedAddress = {
                 name: addressData.name || `${addressData.firstName || ''} ${addressData.lastName || ''}`.trim() || 'N/A',
                 phone: addressData.phone || addressData.telephone || 'N/A',
                 full: addressData.full || `${addressData.address || ''} ${addressData.sub_district || ''} ${addressData.district || ''} ${addressData.province || ''} ${addressData.postal || ''}`.trim() || 'N/A'
             };
             formattedAddress.full_address = formattedAddress.full; // Assign to full_address too
      } catch (jsonErr2) {
          console.error(`Address JSON parse error for Order ${orderId}:`, jsonErr2);
           // Use default empty address if parsing fails
      }


      // Get Product Details
      let fullProductData = [];
      const productIds = products.map(p => p.product_id).filter(id => id); // Get valid IDs

      if (productIds.length > 0) {
          const placeholders = productIds.map(() => '?').join(',');
          const productSql = `SELECT Product_id, Product_name, Product_img, Product_price FROM product WHERE Product_id IN (${placeholders})`;
          const [productDetails] = await pool.execute(productSql, productIds); // <--- await pool.execute
          const productDetailsMap = new Map(productDetails.map(p => [p.Product_id, p]));

          // Combine product info with quantity from order
          fullProductData = products.map(p => {
              const info = productDetailsMap.get(p.product_id);
              return {
                  Product_id: p.product_id,
                  quantity: p.quantity || '?',
                  ...(info ? { // Spread details if found
                       Product_name: info.Product_name,
                       Product_img: info.Product_img ? `/uploads/${info.Product_img}` : null,
                       Product_price: info.Product_price
                  } : { // Default if product info not found
                       Product_name: 'ไม่พบสินค้า',
                       Product_img: null,
                       Product_price: null
                  })
              };
          });
      }

      // Construct final response
      res.json({
          orderId: order.OrderID,
          userId: order.UserID, // Include userId
          status: order.Status,
          orderDate: order.order_date,
          total: order.Total,
          totalAfterCoins: order.totalAfterCoins,
          postTracking: order.Post_Tracking,
          payby: order.payby, // Include payment method
          address: formattedAddress,
          products: fullProductData
      });

  } catch (err) { // <--- catch
      console.error(`Error fetching order details for ${orderId}:`, err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ', detail: err.message });
  }
});


// POST Update Order Status and Tracking - Requires Transaction for Logging
app.post("/api/update-order-status", async (req, res) => { // <--- async
  const { orderId, tracking, status, userId } = req.body; // Get userId performing the action

  // Validation
  if (!orderId || !status) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน (orderId, status required)" });
  }
  if (status === "พนักงานจัดส่ง" && (!tracking || tracking.trim() === "")) {
      return res.status(400).json({ success: false, message: "กรุณากรอกเลขพัสดุสำหรับสถานะ 'พนักงานจัดส่ง'" });
  }
  if (!userId) {
      // Require the ID of the admin/user making the change for logging
      return res.status(401).json({ success: false, message: "ไม่ได้รับอนุญาต (ไม่พบข้อมูลผู้ดำเนินการ)" });
  }

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Get current status and tracking to log the change
      const [oldResults] = await connection.execute(
          'SELECT Status, Post_Tracking FROM orders WHERE OrderID = ? FOR UPDATE', // Lock row
          [orderId]
      );

      if (oldResults.length === 0) {
          await connection.rollback();
          return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
      }
      const oldData = oldResults[0];

      // Prevent unnecessary updates if data hasn't changed
       if (oldData.Status === status && (oldData.Post_Tracking || null) === (tracking || null)) {
           await connection.rollback();
           return res.json({ success: true, message: "ข้อมูลไม่มีการเปลี่ยนแปลง" });
       }

      // 2. Update the order
      const updateSql = `UPDATE orders SET Status = ?, Post_Tracking = ? WHERE OrderID = ?`;
      await connection.execute(updateSql, [status, tracking || null, orderId]); // <--- await connection.execute

      // 3. Log the edit
      const logSql = `
          INSERT INTO order_edit_logs (order_id, user_id, action, old_data, new_data)
          VALUES (?, ?, ?, ?, ?)`;
      const logValues = [
          orderId,
          userId, // Log who made the change
          'update-status',
          JSON.stringify(oldData), // Log old status/tracking
          JSON.stringify({ Status: status, Post_Tracking: tracking || null }) // Log new status/tracking
      ];
      await connection.execute(logSql, logValues); // <--- await connection.execute

      // 4. Commit transaction
      await connection.commit();

      res.json({ success: true, message: "อัปเดตสถานะคำสั่งซื้อสำเร็จ" });

  } catch (err) { // <--- catch
      console.error("Database error updating order status:", err);
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", detail: err.message });
  } finally {
      if (connection) connection.release();
  }
});


// GET Order Edit Logs
app.get('/api/order-edit-logs', async (req, res) => { // <--- async
  const { orderId } = req.query;
  let sql = `SELECT log_id, order_id, user_id, action, old_data, new_data, edited_at FROM order_edit_logs`; // Select specific columns
  const params = [];

  if (orderId) {
      sql += ` WHERE order_id = ?`;
      params.push(orderId);
  }
  sql += ` ORDER BY edited_at DESC LIMIT 100`; // Add LIMIT

  try { // <--- try
      const [results] = await pool.execute(sql, params); // <--- await pool.execute
      res.json(results);
  } catch (err) { // <--- catch
      console.error("Error fetching order edit logs:", err);
      res.status(500).json({ error: 'Failed to fetch logs', detail: err.message });
  }
});

// POST Add Novel to Favorites (Duplicate of /api/favorites, but keeping as requested)
app.post("/api/add-favorite", async (req, res) => { // <--- async
  const { userId, novelId } = req.body;

  if (!userId || !novelId || isNaN(novelId)) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน (userId, novelId required)" });
  }

  try { // <--- try
      // Use INSERT IGNORE to simplify - it won't insert if the key exists, and won't throw an error.
      const sql = "INSERT IGNORE INTO favorites_novel (UserId, novelId, favorited_at) VALUES (?, ?, NOW())";
      const [result] = await pool.execute(sql, [userId, novelId]); // <--- await pool.execute

      if (result.affectedRows > 0) {
          // Insert was successful
          res.status(201).json({ success: true, message: "เพิ่มในรายการโปรดแล้ว" });
      } else {
          // No rows affected - means it was already favorited (due to INSERT IGNORE)
          res.status(200).json({ success: true, message: "มีในรายการโปรดแล้ว" }); // Return success, maybe different message
      }
  } catch (err) { // <--- catch
      console.error("Error adding novel favorite:", err);
       if (err.code === 'ER_NO_REFERENCED_ROW_2') {
           return res.status(404).json({ success: false, message: 'User หรือ Novel ไม่พบในระบบ' });
       }
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการเพิ่มรายการโปรด", detail: err.message });
  }
});


// PUT Update Product Details (Handles Image Upload/Change) - Transaction for Logging
app.put('/products/:id', upload.single('productImage'), async (req, res) => { // <--- async
  const { id: productId } = req.params;
  const userId = req.body.userId || req.session?.userId || 'unknown'; // Get user performing action
  const {
      Product_name, Product_price, Product_count, Product_type,
      Product_status, Product_description
  } = req.body;
  const newUploadedFile = req.file; // The newly uploaded file object

  // --- Utility to delete file ---
   const deleteFile = (filePath) => {
       if (!filePath) return;
       // Assume filePath is relative like 'uploads/products/filename.jpg'
       const fullPath = path.join(__dirname, filePath); // Adjust base path if needed
       fs.unlink(fullPath, (err) => {
           if (err && err.code !== 'ENOENT') {
               console.error(`Error deleting file ${fullPath}:`, err);
           }
       });
   };
   // --- End Utility ---

  // Validation
  if (!productId || isNaN(productId)) {
       if (newUploadedFile) deleteFile(`uploads/products/${newUploadedFile.filename}`);
      return res.status(400).json({ error: 'Invalid Product ID' });
  }
   if (!Product_name || !Product_price || isNaN(Product_price) || Product_count === undefined || isNaN(Product_count) || !Product_type || !Product_status) {
       if (newUploadedFile) deleteFile(`uploads/products/${newUploadedFile.filename}`);
       return res.status(400).json({ error: 'ข้อมูลสินค้าไม่ครบถ้วนหรือไม่ถูกต้อง' });
   }

  let connection;
  try { // <--- try for transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Get current product data (including image path) and lock the row
      const [selectResults] = await connection.execute(
           'SELECT * FROM product WHERE Product_id = ? FOR UPDATE',
           [productId]
      );

      if (selectResults.length === 0) {
          await connection.rollback();
           if (newUploadedFile) deleteFile(`uploads/products/${newUploadedFile.filename}`);
          return res.status(404).json({ error: 'Product not found' });
      }
      const oldData = selectResults[0];
       const currentImagePath = oldData.Product_img || null; // Path stored in DB (e.g., 'products/filename.jpg')

      // Determine the new image path (use new file if uploaded, otherwise keep old)
       // Store relative path *within* uploads dir, e.g., 'products/newfile.jpg'
      const newImagePath = newUploadedFile
         ? `products/${newUploadedFile.filename}` // Relative path inside 'uploads'
         : currentImagePath;

      // 2. Update the product in the database
      const updateSql = `
          UPDATE product SET
              Product_name = ?, Product_price = ?, Product_count = ?,
              Product_type = ?, Product_img = ?, Product_description = ?, Product_status = ?
          WHERE Product_id = ?`;
      const updateValues = [
          Product_name, parseFloat(Product_price), parseInt(Product_count, 10), Product_type,
          newImagePath, // Store the potentially new relative path
          Product_description || null, Product_status, productId
      ];
      await connection.execute(updateSql, updateValues); // <--- await connection.execute

      // 3. Log the edit
      const newDataForLog = { ...req.body, Product_img: newImagePath }; // Capture new state
      delete newDataForLog.userId; // Don't log userId in data fields

      const logSql = `
          INSERT INTO product_edit_logs (product_id, user_id, action, old_data, new_data)
          VALUES (?, ?, ?, ?, ?)`;
      const logValues = [
          productId, userId, 'update',
          JSON.stringify(oldData), // Log the full old record
          JSON.stringify(newDataForLog) // Log the new state
      ];
      await connection.execute(logSql, logValues); // <--- await connection.execute

      // 4. Commit the transaction
      await connection.commit();

      // 5. Delete the old image file *after* commit, only if a new image was uploaded and is different
      if (newUploadedFile && currentImagePath && currentImagePath !== newImagePath) {
           deleteFile(path.join('uploads', currentImagePath)); // Delete old file relative to uploads dir
      }

      res.json({
           message: 'Product updated successfully',
           product: { ...newDataForLog, Product_id: productId } // Return updated data
       });

  } catch (err) { // <--- catch
      console.error("Error updating product:", err);
      if (connection) await connection.rollback();
       // Delete the *newly uploaded* file if the transaction failed
       if (newUploadedFile) deleteFile(`uploads/products/${newUploadedFile.filename}`);
      res.status(500).json({ error: 'Failed to update product', detail: err.message });
  } finally {
      if (connection) connection.release();
  }
});

// GET Product Edit Logs
app.get('/api/product-edit-logs', async (req, res) => { // <--- async
  const { productId } = req.query; // optional filter
  let sql = `SELECT log_id, product_id, user_id, action, old_data, new_data, edited_at FROM product_edit_logs`;
  const params = [];
  if (productId && !isNaN(productId)) { // Validate productId
      sql += ` WHERE product_id = ?`;
      params.push(productId);
  }
  sql += ` ORDER BY edited_at DESC LIMIT 100`; // Add LIMIT

  try { // <--- try
      const [results] = await pool.execute(sql, params); // <--- await pool.execute
      res.json(results);
  } catch (err) { // <--- catch
      console.error("Error fetching product edit logs:", err);
      res.status(500).json({ error: 'Failed to fetch logs', detail: err.message });
  }
});

// POST Update Product Image Only
app.post('/updateProductImage', upload.single('image'), async (req, res) => { // <--- async
  const { productId } = req.body;
  const newImageFile = req.file; // Uploaded file object

  if (!productId || isNaN(productId) || !newImageFile) {
      // Delete uploaded file if validation fails
      if (newImageFile) fs.unlink(newImageFile.path, err => { if (err) console.error("Error deleting invalid image upload:", err); });
      return res.status(400).json({ success: false, message: 'Missing required fields (productId, image)' });
  }

  const newImageRelativePath = `uploads/${newImageFile.filename}`; // Path for response/storage

  let connection;
  try { // <--- try (use transaction if logging/deleting old file)
       connection = await pool.getConnection();
       await connection.beginTransaction();

       // Optional: Get old image path to delete later
       const [oldData] = await connection.execute('SELECT Product_img FROM product WHERE Product_id = ? FOR UPDATE', [productId]);
       if (oldData.length === 0) {
           await connection.rollback();
           fs.unlink(newImageFile.path, err => { if (err) console.error("Error deleting image upload for non-existent product:", err); });
           return res.status(404).json({ success: false, message: 'Product not found' });
       }
       const oldImageRelativePath = oldData[0].Product_img;


      const sql = `UPDATE product SET Product_img = ? WHERE Product_id = ?`;
      // Store only filename or relative path in DB
      const imagePathForDb = newImageFile.filename;
      const [result] = await connection.execute(sql, [imagePathForDb, productId]); // <--- await pool.execute

      // Optional: Log this change (requires user ID)
      // await connection.execute('INSERT INTO product_edit_logs ...');

       await connection.commit(); // Commit transaction

       // Delete old image file if it exists and is different
        if (oldImageRelativePath && oldImageRelativePath !== imagePathForDb) {
             const oldFullPath = path.join(__dirname, 'uploads', oldImageRelativePath); // Adjust path if needed
             fs.unlink(oldFullPath, (err) => {
                 if (err && err.code !== 'ENOENT') {
                     console.error(`Error deleting old product image ${oldFullPath}:`, err);
                 }
             });
         }


      res.json({
           success: true,
           message: 'Product image updated successfully',
           newImage: `/uploads/${imagePathForDb}` // Return full URL path
      });
  } catch (err) { // <--- catch
       if (connection) await connection.rollback();
       // Delete the newly uploaded file if transaction failed
       fs.unlink(newImageFile.path, unlinkErr => { if (unlinkErr) console.error("Error deleting image upload after DB error:", unlinkErr); });
      console.error('Error updating product image:', err);
      res.status(500).json({ success: false, message: 'Database error', detail: err.message });
  } finally {
       if (connection) connection.release();
  }
});

// GET Admin Orders (Similar to /orders but maybe less formatting?)
app.get('/adminorders', async (req, res) => { // <--- async
  const sql = `
      SELECT o.*, u.username -- Include username for admin view
      FROM orders o
      LEFT JOIN users u ON o.UserID = u.UserID -- Join to get username
      ORDER BY o.order_date DESC
      LIMIT 500`; // Add LIMIT

  try { // <--- try
      const [results] = await pool.query(sql); // <--- await pool.query

      if (results.length === 0) {
          return res.json([]); // Return empty array if no orders
      }

      const formattedResults = results.map(order => {
           // Basic parsing, avoid complex formatting if not needed for admin table
          let productsParsed = [];
          let addressParsed = {};
           try { productsParsed = JSON.parse(order.Product || '[]'); } catch (e) { /* ignore */ }
           try { addressParsed = JSON.parse(order.Address || '{}'); } catch (e) { /* ignore */ }

          return {
              ...order, // Include all original order fields
              Product: productsParsed, // Parsed product array
              Address: addressParsed, // Parsed address object
              username: order.username // Added from JOIN
          };
      });

      res.json(formattedResults);
  } catch (err) { // <--- catch
      console.error("Error fetching admin orders:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// GET Admin Orders Filtered by Month/Year
app.get('/adminorders/month/:month/year/:year', async (req, res) => { // <--- async
  const { month, year } = req.params;

  // Validate month and year
  if (!month || isNaN(month) || month < 1 || month > 12 || !year || isNaN(year) || year < 2000 || year > 2100) {
       return res.status(400).json({ error: 'Invalid month or year parameter' });
  }

  const sql = `
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.UserID = u.UserID
      WHERE MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?
      ORDER BY o.order_date DESC
      LIMIT 500`; // Add LIMIT

  try { // <--- try
      const [results] = await pool.execute(sql, [month, year]); // <--- await pool.execute

      if (results.length === 0) {
          return res.json([]); // Return empty array if no orders match
      }

       // Same formatting as /adminorders
      const formattedResults = results.map(order => {
          let productsParsed = [];
          let addressParsed = {};
           try { productsParsed = JSON.parse(order.Product || '[]'); } catch (e) { /* ignore */ }
           try { addressParsed = JSON.parse(order.Address || '{}'); } catch (e) { /* ignore */ }

          return {
               ...order,
               Product: productsParsed,
               Address: addressParsed,
               username: order.username
           };
      });

      res.json(formattedResults);
  } catch (err) { // <--- catch
      console.error("Error fetching admin orders by month/year:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST Update Single Product Field (Admin Quick Edit)
app.post('/updateProduct', async (req, res) => { // <--- async
  const { productId, columnName, newValue, userId } = req.body; // Include userId for logging
  const allowedColumns = ['Product_name', 'Product_price', 'Product_count', 'Product_type', 'Product_description', 'Product_status'];

  // Validation
  if (!productId || isNaN(productId) || !columnName || !allowedColumns.includes(columnName) || newValue === undefined) { // Allow null/empty string for description
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน' });
  }
   if (!userId) {
       return res.status(401).json({ success: false, message: 'ไม่ได้รับอนุญาต (ไม่พบข้อมูลผู้ดำเนินการ)' });
   }
   // Add specific validation for price/count if needed (e.g., must be number)

   let connection;
   try { // --- Use transaction for logging ---
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Get old value for logging
        const [oldDataResult] = await connection.execute(
             `SELECT ?? FROM product WHERE Product_id = ? FOR UPDATE`, // Use ?? for column name, lock row
             [columnName, productId]
        );
        if (oldDataResult.length === 0) {
             await connection.rollback();
             return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
        }
        const oldData = { [columnName]: oldDataResult[0][columnName] };


       // 2. Update the product field
       const sql = `UPDATE product SET ?? = ? WHERE Product_id = ?`; // Use ?? for safe column name injection
       const [result] = await connection.execute(sql, [columnName, newValue, productId]); // <--- await pool.execute

       if (result.affectedRows === 0) {
            // Should not happen if select worked, but check anyway
             await connection.rollback();
             return res.status(404).json({ success: false, message: 'ไม่พบสินค้า (อาจถูกลบไปแล้ว)' });
        }

       // 3. Log the edit
       const newData = { [columnName]: newValue };
       const logSql = `INSERT INTO product_edit_logs (product_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?)`;
       await connection.execute(logSql, [productId, userId, 'quick-update', JSON.stringify(oldData), JSON.stringify(newData)]);

        await connection.commit(); // Commit transaction

       res.json({ success: true, message: 'Product updated successfully' });

   } catch (err) { // <--- catch
        if (connection) await connection.rollback();
       console.error('Error quick-updating product:', err);
       res.status(500).json({ success: false, message: 'Database error', detail: err.message });
   } finally {
        if (connection) connection.release();
   }
});

// PUT Update Order Post Tracking
app.put('/orders/:orderID/post-tracking', async (req, res) => { // <--- async
  const { orderID } = req.params;
  const { PostTracking, userId } = req.body; // Include userId for logging

   if (!orderID || !userId) { // Basic validation
       return res.status(400).json({ error: 'OrderID and UserID are required.' });
   }
  // Call the generic status update endpoint for consistency and logging
   try {
        const response = await fetch(`http://localhost:${PORT}/api/update-order-status`, { // Assuming running on same host/port
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderID,
                tracking: PostTracking || null,
                status: 'พนักงานจัดส่ง', // Assume setting tracking means setting status
                userId: userId
             })
        });
        const data = await response.json();
        res.status(response.status).json(data);
   } catch (fetchError) {
        console.error("Error calling internal update-order-status:", fetchError);
        res.status(500).json({ error: "Internal communication error" });
   }

   /* // Direct update (without logging consistency)
  const sql = `UPDATE orders SET Post_Tracking = ? WHERE OrderID = ?`;
  try { // <--- try
      const [result] = await pool.execute(sql, [PostTracking || null, orderID]); // <--- await pool.execute
      if (result.affectedRows > 0) {
           res.json({ message: 'Post Tracking updated successfully' });
      } else {
           res.status(404).json({ error: 'Order not found' });
      }
  } catch (err) { // <--- catch
      console.error("Error updating post tracking:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
  */
});

// PUT Update Order Status
app.put('/orders/:orderID/status', async (req, res) => { // <--- async
  const { orderID } = req.params;
  const { Status, userId } = req.body; // Include userId for logging

  if (!orderID || !Status || !userId) { // Basic validation
       return res.status(400).json({ error: 'OrderID, Status, and UserID are required.' });
   }
    // Call the generic status update endpoint for consistency and logging
   try {
        const response = await fetch(`http://localhost:${PORT}/api/update-order-status`, { // Assuming running on same host/port
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderID,
                tracking: null, // Tracking might need to be passed if status requires it
                status: Status,
                userId: userId
             })
        });
        const data = await response.json();
        res.status(response.status).json(data);
   } catch (fetchError) {
        console.error("Error calling internal update-order-status:", fetchError);
        res.status(500).json({ error: "Internal communication error" });
   }
  /* // Direct update (without logging consistency)
  const sql = `UPDATE orders SET Status = ? WHERE OrderID = ?`;
  try { // <--- try
      const [result] = await pool.execute(sql, [Status, orderID]); // <--- await pool.execute
      if (result.affectedRows > 0) {
           res.json({ message: 'Status updated successfully' });
      } else {
           res.status(404).json({ error: 'Order not found' });
      }
  } catch (err) { // <--- catch
      console.error("Error updating order status:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
  */
});


// GET Users for Access Control Page
app.get('/accesscontrol', async (req, res) => { // <--- async
  // Select necessary fields, potentially join with address if needed
  const sql = `
      SELECT UserID, username, email, name, lastname, Roles, coins, IsVerified, created_at
      FROM users
      ORDER BY created_at DESC`; // Or order by username, etc.

  try { // <--- try
      const [results] = await pool.query(sql); // <--- await pool.query

      // No complex formatting needed usually, just return the user list
      res.json(results);
  } catch (err) { // <--- catch
      console.error("Error fetching users for access control:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// POST Add/Update Cart Item (UPSERT) - Alternative Endpoint
// Redundant with POST /api/carts, prefer that one. Converting for completeness.
app.post('/updatecart', async (req, res) => { // <--- async
  const { UserID, Product_id, quantity } = req.body;

  if (!UserID || !Product_id || isNaN(Product_id) || !quantity || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง (UserID, Product_id, quantity > 0 required)" });
  }

  // Using INSERT ... ON DUPLICATE KEY UPDATE
  const sql = `
      INSERT INTO carts (UserID, Product_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
  `;

  try { // <--- try
       // Optional: Add stock check here before executing UPSERT (requires transaction for safety)

      const [results] = await pool.execute(sql, [UserID, Product_id, quantity]); // <--- await pool.execute

      if (results.affectedRows > 0) {
          res.json({ message: "สินค้าเพิ่มลงในตะกร้าหรืออัปเดตจำนวนแล้ว!" });
      } else {
          // This case is unlikely with UPSERT unless there's a constraint violation not caught
          throw new Error("Cart update failed unexpectedly.");
      }
  } catch (err) { // <--- catch
      console.error("Error in /updatecart:", err);
       if (err.code === 'ER_NO_REFERENCED_ROW_2') {
          return res.status(404).json({ error: 'User หรือ Product ไม่พบในระบบ' });
       }
      res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์", detail: err.message });
  }
});


// GET Cart Item Count for User
app.get('/api/cartcount/:userId', async (req, res) => { // <--- async
  const { userId } = req.params;
   if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const sql = "SELECT SUM(quantity) AS count FROM carts WHERE UserID = ?";
  try { // <--- try
      const [results] = await pool.execute(sql, [userId]); // <--- await pool.execute
      // results will be like [{ count: 10 }] or [{ count: null }] if no items
      const count = results[0]?.count ?? 0; // Use nullish coalescing for safety
      res.json({ count });
  } catch (err) { // <--- catch
      console.error("Error getting cart count:", err);
      res.status(500).json({ error: "Error getting cart count", detail: err.message });
  }
});


// PUT Update Cart Item Quantity (Increase/Decrease) - Alternative endpoint
// Seems overly complex compared to setting quantity directly. PUT /api/carts/update is better.
// Converting for completeness, but logic might need review based on actual use case.
app.put('/api/cart/:productId', async (req, res) => { // <--- async
   // Requires UserID to know *which* cart to update
   const { userId } = req.body; // Assuming userId is sent in body or available from session/token
   const { productId } = req.params;
   const { quantityChange } = req.body; // e.g., +1 or -1

   if (!userId || !productId || isNaN(productId) || !quantityChange || isNaN(quantityChange)) {
       return res.status(400).json({ error: 'Invalid input (userId, productId, quantityChange required)' });
   }

   let connection;
   try { // --- Transaction needed for SELECT then UPDATE ---
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Get current quantity and lock row
        const [rows] = await connection.execute(
             'SELECT quantity FROM carts WHERE Product_id = ? AND UserID = ? FOR UPDATE',
             [productId, userId]
        );

        if (rows.length === 0) {
              await connection.rollback();
             return res.status(404).json({ error: 'Product not found in cart' });
        }
        const currentQuantity = rows[0].quantity;

        // 2. Calculate new quantity
        const newQuantity = currentQuantity + quantityChange;

        // 3. Update or Delete based on new quantity
        if (newQuantity <= 0) {
             // Remove item if quantity drops to 0 or below
             await connection.execute('DELETE FROM carts WHERE Product_id = ? AND UserID = ?', [productId, userId]);
        } else {
             // Optional: Check stock before increasing quantity
             // const [stockCheck] = await connection.execute('SELECT Product_count FROM product WHERE Product_id = ?', [productId]);
             // if (stockCheck[0].Product_count < newQuantity) {
             //      await connection.rollback();
             //      return res.status(400).json({ error: 'Not enough stock' });
             // }
             await connection.execute('UPDATE carts SET quantity = ? WHERE Product_id = ? AND UserID = ?', [newQuantity, productId, userId]);
        }

        await connection.commit(); // Commit transaction
        res.json({ message: 'Quantity updated successfully' });

   } catch (error) { // <--- catch
        if (connection) await connection.rollback();
       console.error("Error updating quantity via change:", error);
       res.status(500).json({ error: 'Failed to update quantity', detail: error.message });
   } finally {
        if (connection) connection.release();
   }
});


// DELETE Remove Item from Cart (Alternative Endpoint)
// DELETE /api/cart/delete seems more standard REST, but converting this too.
app.delete('/api/cart/:productId', async (req, res) => { // <--- async
   // Requires UserID
    const { userId } = req.body; // Assuming userId in body or from session/token
   const { productId } = req.params;

   if (!userId || !productId || isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid input (userId, productId required)' });
   }

   try { // <--- try
        const [result] = await pool.execute('DELETE FROM carts WHERE Product_id = ? AND UserID = ?', [productId, userId]); // <--- await pool.execute

        if (result.affectedRows > 0) {
             res.json({ message: 'Item removed from cart successfully' });
        } else {
             res.status(404).json({ error: 'Item not found in user cart' });
        }
   } catch (error) { // <--- catch
        console.error("Error removing from cart via DELETE /api/cart/:productId :", error);
        res.status(500).json({ error: 'Failed to remove from cart', detail: error.message });
   }
});


// GET All Users (Admin View)
app.get('/users', async (req, res) => { // <--- async
   const sql = `
       SELECT u.UserID, u.username, u.email, u.name, u.lastname, u.Roles, u.coins, u.IsVerified, u.created_at,
              a.telephone, a.address as streetAddress, a.province, a.district, a.zipcode -- Select address fields
       FROM users u
       LEFT JOIN address a ON u.UserID = a.UserID -- Use LEFT JOIN
       ORDER BY u.created_at DESC`; // Or order by UserID, username etc.
   try { // <--- try
        const [results] = await pool.query(sql); // <--- await pool.query
        // Structure address info if needed
        const processedResults = results.map(user => ({
            ...user, // Keep all user fields
            address: { // Create address sub-object
               telephone: user.telephone,
               streetAddress: user.streetAddress,
               province: user.province,
               district: user.district,
               zipcode: user.zipcode
            }
            // Optionally remove the individual address fields from top level if desired
        }));
        res.json(processedResults);
   } catch (err) { // <--- catch
        console.error('MySQL ERROR fetching all users:', err);
        res.status(500).json({ error: 'Database error', detail: err.message });
   }
});

// GET Dashboard Statistics
app.get('/api/dashboard-data', async (req, res) => { // <--- async
   // Consider filtering revenue/orders by a time period (e.g., last 30 days)
   const sql = `
       SELECT
           (SELECT COUNT(*) FROM orders) AS totalOrders,
           (SELECT IFNULL(SUM(Total), 0) -- Sum 'Total' which includes coin + promptpay? Verify calculation basis
            FROM orders
            WHERE status NOT IN ('ยกเลิกคำสั่งซื้อ', 'รอการชำระเงิน') -- Count revenue for completed/shipped orders
           ) AS totalRevenue,
            (SELECT COUNT(*) FROM orders WHERE status = 'รอพนักงานรับคำสั่งซื้อ') AS pendingOrders, -- Example: add pending count
           (SELECT COUNT(*) FROM orders WHERE status = 'ยกเลิกคำสั่งซื้อ') AS canceledOrders,
           (SELECT COUNT(*) FROM users) AS totalUsers, -- Example: add user count
            (SELECT COUNT(*) FROM product WHERE Product_status = 'in-stock') AS totalProducts -- Example: add product count
   `;
   try { // <--- try
        const [result] = await pool.query(sql); // <--- await pool.query
        res.json({ stats: result[0] }); // Result is an array with one object
   } catch (err) { // <--- catch
        console.error("Error fetching dashboard data:", err);
        res.status(500).json({ error: 'Database error', detail: err.message });
   }
});

// GET Monthly Data (Combined Orders, Novels, Products) - Needs Refactoring
// The original logic with nested queries and single connection is flawed.
// Use Promise.all for parallel execution.
app.get('/api/monthly-data', async (req, res) => { // <--- async
  const { month, year } = req.query;

  // Validate input
  if (!month || isNaN(month) || month < 1 || month > 12 || !year || isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Month and year are required and must be valid' });
  }

  try { // <--- try
      // Define queries
      const ordersQuery = `
          SELECT COUNT(*) AS totalOrders,
                 IFNULL(SUM(Total), 0) AS totalRevenue, -- Verify which statuses count towards revenue
                 SUM(CASE WHEN status = 'ยกเลิกคำสั่งซื้อ' THEN 1 ELSE 0 END) AS canceledOrders
          FROM orders
          WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?
            AND status NOT IN ('รอการชำระเงิน') -- Example: Exclude pending payment from revenue?
      `;

      const novelsQuery = `
          SELECT n.id, n.title, n.cover_image, n.status, COUNT(c.id) AS chapterCount
          FROM novels n
          LEFT JOIN chapters c ON c.novel_id = n.id
          WHERE MONTH(n.created_at) = ? AND YEAR(n.created_at) = ? -- Filter novels created in month/year? Or all novels? Adjust as needed
          GROUP BY n.id
          ORDER BY n.created_at DESC
      `;

      const productsQuery = `
          SELECT Product_id, Product_name, Product_price, Product_count, Product_img
          FROM product
          WHERE Product_status = 'in-stock' -- Example: only active products?
          ORDER BY Product_id DESC
      `; // Maybe filter products added in month/year?

      // Execute in parallel
      const [
          [[orderData]], // Destructure twice to get the single object
          [novelData],
          [productData]
      ] = await Promise.all([ // <--- await Promise.all
          pool.execute(ordersQuery, [month, year]),
          pool.execute(novelsQuery, [month, year]), // Assuming filter by novel creation date
          pool.query(productsQuery) // No params here
      ]);

      // Process results (e.g., image paths)
       const processedNovels = novelData.map(n => ({ ...n, cover_image: n.cover_image /* add path if needed */ }));
       const processedProducts = productData.map(p => ({ ...p, Product_img: p.Product_img ? `/uploads/${p.Product_img}` : null }));


      // Send combined data
      res.json({
          orders: orderData || { totalOrders: 0, totalRevenue: 0, canceledOrders: 0 }, // Provide defaults if no orders
          novels: processedNovels,
          products: processedProducts
      });

  } catch (error) { // <--- catch
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ error: 'Error fetching monthly data', detail: error.message });
  }
});

// GET Monthly Revenue Data (for Charts)
app.get('/api/monthly-revenue', async (req, res) => { // <--- async
  const query = `
      SELECT
          DATE_FORMAT(order_date, '%Y-%m') AS month,
          SUM(Total) AS total_revenue -- Verify which statuses contribute
      FROM orders
      WHERE Status NOT IN ('ยกเลิกคำสั่งซื้อ', 'รอการชำระเงิน') -- Example: only count completed/shipped
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12`; // Limit to last 12 months?
  try { // <--- try
      const [results] = await pool.query(query); // <--- await pool.query
      res.json(results);
  } catch (err) { // <--- catch
      console.error("Error fetching monthly revenue:", err);
      res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT Update User Roles and Coins (Admin)
app.put('/users/:UserID', async (req, res) => { // <--- async
  const { UserID } = req.params;
  const { Roles, coins } = req.body;
   const adminUserId = req.body.adminUserId || req.session?.userId || 'unknown'; // User performing the update

  // Validation
  if (!UserID || !Roles || coins === undefined || coins === null || isNaN(coins)) {
      return res.status(400).json({ error: "Missing or invalid required fields (UserID, Roles, coins)" });
  }
  if (!adminUserId || adminUserId === 'unknown') {
       return res.status(401).json({ error: "Unauthorized: Cannot identify administrator" });
  }
  // Add role validation if necessary (e.g., Roles must be 'admin', 'user', etc.)

   let connection;
   try { // --- Transaction for logging ---
       connection = await pool.getConnection();
       await connection.beginTransaction();

       // 1. Get old data for logging
       const [oldDataResult] = await connection.execute(
            'SELECT Roles, coins FROM users WHERE UserID = ? FOR UPDATE',
            [UserID]
       );
       if (oldDataResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'User not found' });
       }
       const oldData = oldDataResult[0];

        // Prevent unnecessary updates
        if (oldData.Roles === Roles && oldData.coins == coins) { // Use loose comparison for coins if needed
            await connection.rollback();
            return res.json({ message: 'No changes detected.' });
        }

      // 2. Update user
      const sql = 'UPDATE users SET Roles = ?, coins = ? WHERE UserID = ?';
      const [result] = await connection.execute(sql, [Roles, coins, UserID]); // <--- await pool.execute


       // 3. Log the change
       const newData = { Roles, coins };
       const logSql = `INSERT INTO user_edit_logs (target_user_id, admin_user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?)`;
       // Assuming a user_edit_logs table exists
       // await connection.execute(logSql, [UserID, adminUserId, 'update-roles-coins', JSON.stringify(oldData), JSON.stringify(newData)]);

        await connection.commit(); // Commit transaction


      res.json({ message: "User updated successfully" });

  } catch (err) { // <--- catch
       if (connection) await connection.rollback();
      console.error("Database Error updating user roles/coins:", err);
      res.status(500).json({ error: "Database error", detail: err.message });
  } finally {
       if (connection) await connection.release();
  }
});

// GET Single Product (Duplicate?) - Reuse /products/:id
// Assuming this is a separate route for some reason
app.get('/api/products/:id', async (req, res) => { // <--- async
  const { id: productId } = req.params;
   if (!productId || isNaN(productId)) {
       return res.status(400).json({ error: 'Invalid Product ID' });
   }

  try { // <--- try
       // Using pool directly instead of db.promise()
      const [rows] = await pool.execute('SELECT * FROM product WHERE Product_id = ?', [productId]); // <--- await pool.execute

      if (rows.length > 0) {
           const product = rows[0];
           product.Product_img = product.Product_img ? `/uploads/${product.Product_img}` : null; // Fix image path
          res.json(product);
      } else {
          res.status(404).json({ message: 'Product not found' });
      }
  } catch (error) { // <--- catch
      console.error('Database error fetching /api/products/:id :', error);
      res.status(500).json({ message: 'Internal Server Error', detail: error.message });
  }
});


// POST Add New Product (Duplicate?) - Reuse /api/uploadproducts
// Assuming this is a separate route for some reason
app.post('/products', upload.single('productImage'), async (req, res) => { // <--- async
  const {
      Product_name, Product_price, Product_count, Product_type, Product_status, Product_description
  } = req.body;
  const newUploadedFile = req.file;
   const userId = req.body.userId || req.session?.userId || 'unknown'; // User performing action

   // --- Utility to delete file ---
    const deleteFile = (filePath) => { /* ... defined earlier ... */ };
    // --- End Utility ---


   // Validation
    if (!Product_name || !Product_price || isNaN(Product_price) || Product_count === undefined || isNaN(Product_count) || !Product_type || !Product_status) {
        if (newUploadedFile) deleteFile(`uploads/products/${newUploadedFile.filename}`);
        return res.status(400).json({ error: 'Missing required product fields' });
    }

   const imagePathForDb = newUploadedFile ? `products/${newUploadedFile.filename}` : null; // Relative path for DB

  const sql = `INSERT INTO product (Product_name, Product_price, Product_count, Product_type, Product_img, Product_description, Product_status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const values = [Product_name, parseFloat(Product_price), parseInt(Product_count, 10), Product_type, imagePathForDb, Product_description || null, Product_status];

   let connection;
  try { // <--- try (Use transaction if logging)
       connection = await pool.getConnection();
       await connection.beginTransaction();

      const [result] = await connection.execute(sql, values); // <--- await connection.execute
       const newProductId = result.insertId;

       // Log the creation
       const newData = { ...req.body, Product_img: imagePathForDb };
       delete newData.userId;
       const logSql = `INSERT INTO product_edit_logs (product_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?)`;
       await connection.execute(logSql, [newProductId, userId, 'create', null, JSON.stringify(newData)]);


        await connection.commit(); // Commit transaction

      res.status(201).json({
           message: 'Product added successfully',
           productId: newProductId,
           imageUrl: imagePathForDb ? `/uploads/${imagePathForDb}` : null
       });
  } catch (error) { // <--- catch
       if (connection) await connection.rollback();
      console.error("Database Insert Error (/products):", error);
       // Delete uploaded file if insert failed
       if (newUploadedFile) deleteFile(`uploads/products/${newUploadedFile.filename}`);
      res.status(500).json({ error: 'Failed to add product', details: error.message });
  } finally {
       if (connection) connection.release();
  }
});

// PUT Update User Profile (User updating their own) - Transaction Recommended
app.put('/usersProfile/:UserID', async (req, res) => { // <--- async
  const { UserID } = req.params;
  // Get data that can be updated by user
  const { username, name, email, address, telephone } = req.body;

   // TODO: Add authentication check here - ensure the logged-in user matches UserID

  // Validate which fields were actually sent for update
  const updates = {};
   if (username !== undefined) updates.username = username;
   if (name !== undefined) updates.name = name;
   if (email !== undefined) updates.email = email;
   // Address fields might be in separate table, handle accordingly
   const addressUpdates = {};
   if (address !== undefined) addressUpdates.address = address;
   if (telephone !== undefined) addressUpdates.telephone = telephone;


   if (Object.keys(updates).length === 0 && Object.keys(addressUpdates).length === 0) {
        return res.status(400).json({ message: 'No data provided for update.' });
   }
   // Add validation for email format, username uniqueness (if changed) etc.

  let connection;
  try { // --- Use transaction for multiple table updates ---
       connection = await pool.getConnection();
       await connection.beginTransaction();

       // Update 'users' table if needed
       if (Object.keys(updates).length > 0) {
            // Check username/email uniqueness if they are being changed
            if (updates.username) {
                 const [existingUser] = await connection.execute('SELECT UserID FROM users WHERE username = ? AND UserID != ?', [updates.username, UserID]);
                 if (existingUser.length > 0) throw new Error("Username already taken");
            }
            if (updates.email) {
                 const [existingEmail] = await connection.execute('SELECT UserID FROM users WHERE email = ? AND UserID != ?', [updates.email, UserID]);
                  if (existingEmail.length > 0) throw new Error("Email already taken");
            }

           const userSetClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
           const userValues = [...Object.values(updates), UserID];
           await connection.execute(`UPDATE users SET ${userSetClauses} WHERE UserID = ?`, userValues);
       }

       // Update 'address' table if needed
       if (Object.keys(addressUpdates).length > 0) {
            // Check if address record exists, if not, INSERT might be needed?
            // Assuming address record exists (created during registration)
             const addressSetClauses = Object.keys(addressUpdates).map(key => `${key} = ?`).join(', ');
             const addressValues = [...Object.values(addressUpdates), UserID];
             const [addressResult] = await connection.execute(`UPDATE address SET ${addressSetClauses} WHERE UserID = ?`, addressValues);
             // Check if address row existed
             // if (addressResult.affectedRows === 0) {
             //      // Optionally insert address row here if it didn't exist
             // }
       }


       await connection.commit(); // Commit transaction
       res.json({ message: 'User profile updated' });

  } catch (err) { // <--- catch
       if (connection) await connection.rollback();
       console.error("Error updating user profile:", err);
       res.status(err.message.includes('already taken') ? 409 : 500)
          .json({ error: err.message || 'Failed to update profile', detail: err.message });
  } finally {
       if (connection) connection.release();
  }
});


// DELETE User and Related Data - Requires Transaction
app.delete('/users/:UserID', async (req, res) => { // <--- async
  const { UserID } = req.params;
  const adminUserId = req.body.adminUserId || req.session?.userId || 'unknown'; // User performing delete

  if (!UserID) return res.status(400).json({ error: 'User ID is required' });
   if (!adminUserId || adminUserId === 'unknown') {
       return res.status(401).json({ error: 'Unauthorized: Cannot identify administrator' });
   }
   // Maybe add check: prevent deleting own admin account?

  let connection;
  try { // --- Use transaction for multiple deletes ---
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Define delete order (dependencies first)
      // Consider other related tables: favorites, favorites_novel, reading_history, novel_owner, orders (set user to null?), logs?
      await connection.execute('DELETE FROM topup WHERE UserID = ?', [UserID]);
      await connection.execute('DELETE FROM carts WHERE UserID = ?', [UserID]);
      await connection.execute('DELETE FROM address WHERE UserID = ?', [UserID]);
      await connection.execute('DELETE FROM favorites WHERE UserID = ?', [UserID]); // Added favorites
      await connection.execute('DELETE FROM favorites_novel WHERE UserID = ?', [UserID]); // Added novel favorites
      await connection.execute('DELETE FROM reading_history WHERE userId = ?', [UserID]); // Added reading history
       await connection.execute('DELETE FROM novel_owner WHERE UserID = ?', [UserID]); // Added novel owner
       // What about novels created by this user? Delete them or set userid to NULL?
       // What about orders? Delete or set UserID to NULL?
       // For now, just deleting user record itself last.

      // Finally, delete the user
      const [deleteResult] = await connection.execute('DELETE FROM users WHERE UserID = ?', [UserID]);

      if (deleteResult.affectedRows === 0) {
           // User didn't exist in the first place
           await connection.rollback();
           return res.status(404).json({ message: 'User not found.' });
      }

       // Optional: Log the deletion
       // await connection.execute('INSERT INTO user_edit_logs (target_user_id, admin_user_id, action) VALUES (?, ?, ?)', [UserID, adminUserId, 'delete-user']);

      await connection.commit(); // Commit transaction

      res.json({ message: 'User and related data deleted successfully' });

  } catch (err) { // <--- catch
      if (connection) await connection.rollback();
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Failed to delete user', detail: err.message });
  } finally {
      if (connection) connection.release();
  }
});


// GET Member by ID
app.get('/api/members/:id', async (req, res) => { // <--- async
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid member ID' });

  try { // <--- try
      const [results] = await pool.execute('SELECT * FROM member WHERE ID = ?', [id]); // <--- await pool.execute

      if (results.length === 0) {
          return res.status(404).json({ error: 'Member not found' });
      }
       // Process image paths
       const member = results[0];
       member.iconimg = member.iconimg ? `/uploads/${member.iconimg}` : null;
       member.img = member.img ? `/uploads/${member.img}` : null;
      res.json(member);
  } catch (err) { // <--- catch
      console.error("Error fetching member by ID:", err);
      res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// PUT Update Member (Handles Image Upload)
app.put('/api/members/:id', upload.fields([ // Middleware runs first
  { name: 'iconimg', maxCount: 1 },
  { name: 'img', maxCount: 1 }
]), async (req, res) => { // <--- async handler
  const { id } = req.params;
  const {
      name, description, x, tiktok, youtube, bgColor,
      'iconimg-old': iconimgOld, // Value from hidden input if no new file
      'img-old': imgOld         // Value from hidden input if no new file
  } = req.body;
   const adminUserId = req.body.adminUserId || req.session?.userId || 'unknown'; // User making change

   // --- File Handling ---
   let newIconPath = null;
   let newImgPath = null;
   if (req.files['iconimg']?.[0]) {
       newIconPath = `uploads/${req.files['iconimg'][0].filename}`; // Relative path for response/deletion
   }
   if (req.files['img']?.[0]) {
        newImgPath = `uploads/${req.files['img'][0].filename}`; // Relative path for response/deletion
   }
   // Determine final paths for DB (use new if uploaded, else old, else null)
   const finalIconPathForDb = newIconPath ? newIconPath.replace('uploads/', '') : (iconimgOld || null);
   const finalImgPathForDb = newImgPath ? newImgPath.replace('uploads/', '') : (imgOld || null);
    // --- End File Handling ---


   // --- Utility to delete file ---
    const deleteFile = (filePath) => { /* ... defined earlier ... */ };
    // --- End Utility ---


    // Validation
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid member ID' });
    if (!name) { // Add other required field checks
         if (newIconPath) deleteFile(newIconPath); // Delete uploaded files on validation error
         if (newImgPath) deleteFile(newImgPath);
         return res.status(400).json({ success: false, message: 'Name is required' });
    }
     if (!adminUserId || adminUserId === 'unknown') {
       // Clean up uploaded files
       if (newIconPath) deleteFile(newIconPath);
       if (newImgPath) deleteFile(newImgPath);
       return res.status(401).json({ success: false, message: "Unauthorized: Cannot identify administrator" });
     }

     let connection;
    try { // --- Transaction for logging & file safety ---
         connection = await pool.getConnection();
         await connection.beginTransaction();

         // 1. Get old data for logging and old image paths
          const [oldDataResult] = await connection.execute('SELECT * FROM member WHERE ID = ? FOR UPDATE', [id]);
          if (oldDataResult.length === 0) {
               await connection.rollback();
               if (newIconPath) deleteFile(newIconPath);
               if (newImgPath) deleteFile(newImgPath);
               return res.status(404).json({ success: false, message: 'Member not found' });
          }
          const oldData = oldDataResult[0];
          const oldIconPath = oldData.iconimg ? `uploads/${oldData.iconimg}` : null;
          const oldImgPath = oldData.img ? `uploads/${oldData.img}` : null;

         // 2. Update member data
         const sql = `
             UPDATE member SET
                 Name = ?, description = ?, X = ?, Tiktok = ?, Youtube = ?,
                 iconimg = ?, img = ?, bgColor = ?
             WHERE ID = ?`;
         await connection.execute(sql, [
              name, description || null, x || null, tiktok || null, youtube || null,
              finalIconPathForDb, finalImgPathForDb, bgColor || null,
              id
          ]); // <--- await connection.execute

          // 3. Log the change (optional)
          // const newData = { ...req.body, iconimg: finalIconPathForDb, img: finalImgPathForDb };
           // Clean up newData object...
          // await connection.execute('INSERT INTO member_edit_logs ...');

          await connection.commit(); // Commit transaction

           // Delete old files *after* commit if they changed
           if (newIconPath && oldIconPath && oldIconPath !== newIconPath) deleteFile(oldIconPath);
           if (newImgPath && oldImgPath && oldImgPath !== newImgPath) deleteFile(oldImgPath);

          res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });

   } catch (err) { // <--- catch
        if (connection) await connection.rollback();
         // Delete newly uploaded files if transaction failed
         if (newIconPath) deleteFile(newIconPath);
         if (newImgPath) deleteFile(newImgPath);
        console.error("Error updating member:", err);
        res.status(500).json({ success: false, message: 'Update failed', detail: err.message });
   } finally {
         if (connection) connection.release();
   }
});


// PUT Mark Order as Read
app.put('/api/orders/:orderId/read', async (req, res) => { // <--- async
  const { orderId } = req.params;
   if (!orderId) return res.status(400).json({ success: false, error: 'Order ID is required' });

  try { // <--- try
      const [result] = await pool.execute(
          'UPDATE orders SET is_read = 1 WHERE OrderID = ? AND is_read = 0', // Only update if currently unread
          [orderId]
      ); // <--- await pool.execute

       // No need to check affectedRows strictly, just confirm success/failure
      res.json({ success: true });
  } catch (err) { // <--- catch
       console.error(`Error marking order ${orderId} as read:`, err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
  }
});

// GET Unread Order Count
app.get('/api/orders/unread-count', async (req, res) => { // <--- async
  const sql = 'SELECT COUNT(*) AS count FROM orders WHERE is_read = 0'; // is_read should be BOOLEAN or TINYINT(1)
  try { // <--- try
      const [[result]] = await pool.query(sql); // <--- await pool.query, double destructure
      res.json({ success: true, count: result.count });
  } catch (err) { // <--- catch
      console.error("Error fetching unread order count:", err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
  }
});

// DELETE Member
app.delete('/api/members/:id', async (req, res) => { // <--- async
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid member ID' });
   const adminUserId = req.body.adminUserId || req.session?.userId || 'unknown'; // User performing delete


   let connection;
   try { // --- Transaction to get file paths before delete ---
       connection = await pool.getConnection();
       await connection.beginTransaction();

       // 1. Get image paths for deletion
        const [oldDataResult] = await connection.execute('SELECT iconimg, img FROM member WHERE ID = ? FOR UPDATE', [id]);
        if (oldDataResult.length === 0) {
             await connection.rollback();
             return res.status(404).json({ success: false, message: 'Member not found' });
        }
        const oldIconPath = oldDataResult[0].iconimg;
        const oldImgPath = oldDataResult[0].img;

       // 2. Delete the member record
       const [result] = await connection.execute('DELETE FROM member WHERE ID = ?', [id]); // <--- await connection.execute

       // 3. Log deletion (optional)
        // await connection.execute('INSERT INTO member_edit_logs ...');

        await connection.commit(); // Commit transaction


        // 4. Delete files after successful commit
        const deleteFile = (filePath) => { /* ... defined earlier ... */ };
        if (oldIconPath) deleteFile(`uploads/${oldIconPath}`);
        if (oldImgPath) deleteFile(`uploads/${oldImgPath}`);


        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });

   } catch (err) { // <--- catch
       if (connection) await connection.rollback();
       console.error("Error deleting member:", err);
       res.status(500).json({ success: false, message: 'Delete failed', detail: err.message });
   } finally {
        if (connection) connection.release();
   }
});

// POST Create Member
app.post('/api/members', upload.fields([ // Middleware runs first
  { name: 'iconimg', maxCount: 1 },
  { name: 'img', maxCount: 1 }
]), async (req, res) => { // <--- async handler
  const {
      name, description, x, tiktok, youtube, bgColor
  } = req.body;
   const adminUserId = req.body.adminUserId || req.session?.userId || 'unknown'; // User performing action


    // --- File Handling ---
    let iconPathForDb = null;
    let imgPathForDb = null;
    let iconPathFull = null;
    let imgPathFull = null;

    if (req.files['iconimg']?.[0]) {
        iconPathFull = `uploads/${req.files['iconimg'][0].filename}`;
        iconPathForDb = req.files['iconimg'][0].filename; // Store only filename? Or relative path? Be consistent.
    }
    if (req.files['img']?.[0]) {
        imgPathFull = `uploads/${req.files['img'][0].filename}`;
         imgPathForDb = req.files['img'][0].filename;
    }
     // --- End File Handling ---

    // --- Utility to delete file ---
     const deleteFile = (filePath) => { /* ... defined earlier ... */ };
     // --- End Utility ---

     // Validation
     if (!name) { // Add other required field checks
          if (iconPathFull) deleteFile(iconPathFull);
          if (imgPathFull) deleteFile(imgPathFull);
          return res.status(400).json({ success: false, message: 'Name is required' });
     }
      if (!adminUserId || adminUserId === 'unknown') {
         if (iconPathFull) deleteFile(iconPathFull);
         if (imgPathFull) deleteFile(imgPathFull);
         return res.status(401).json({ success: false, message: "Unauthorized: Cannot identify administrator" });
     }

      let connection;
     try { // --- Transaction for logging ---
          connection = await pool.getConnection();
          await connection.beginTransaction();

         const sql = `
             INSERT INTO member (Name, description, X, Tiktok, Youtube, iconimg, img, bgColor)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
         const [result] = await connection.execute(sql, [
             name, description || null, x || null, tiktok || null, youtube || null,
             iconPathForDb, imgPathForDb, bgColor || null
         ]); // <--- await connection.execute
          const newMemberId = result.insertId;


          // Log creation (optional)
          // const newData = { ...req.body, iconimg: iconPathForDb, img: imgPathForDb };
          // await connection.execute('INSERT INTO member_edit_logs ...');


          await connection.commit(); // Commit transaction


         res.status(201).json({
              success: true,
              message: 'เพิ่มข้อมูลสำเร็จ',
              memberId: newMemberId,
              iconImageUrl: iconPathForDb ? `/uploads/${iconPathForDb}` : null, // Return full URL path
               imageUrl: imgPathForDb ? `/uploads/${imgPathForDb}` : null
          });

     } catch (err) { // <--- catch
          if (connection) await connection.rollback();
          // Delete uploaded files if transaction failed
          if (iconPathFull) deleteFile(iconPathFull);
          if (imgPathFull) deleteFile(imgPathFull);
          console.error("Error creating member:", err);
          res.status(500).json({ success: false, message: 'Insert failed', detail: err.message });
     } finally {
          if (connection) connection.release();
     }
});

// --- Remove Duplicate/Old Server Startup ---
// The server startup code (http.createServer, https.createServer, pool.end on SIGINT)
// should only exist ONCE in your main server file (likely the first file you shared).
// Remove the startup block from this section if it's a duplicate.
/*
// เริ่มต้นเซิร์ฟเวอร์ (This block should be removed if it's a duplicate)
https.createServer(options, app).listen(3001, () => {
  //console.log('HTTPS Server running on port 3001');
});
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(80, () => {
  //console.log('Redirecting HTTP (80) -> HTTPS');
});
*/


// --- Server Startup ---
const PORT = 3001; // Use environment variable or default
const USE_HTTPS = true; // ตั้งค่าเป็น true ถ้าต้องการใช้ HTTPS และมี certificate files

if (USE_HTTPS && fs.existsSync('C:/xampp/apache/conf/ssl.key/server.key') && fs.existsSync('C:/xampp/apache/conf/ssl.crt/server.crt')) {
    const options = {
        key: fs.readFileSync('C:/xampp/apache/conf/ssl.key/server.key'), // <-- ใส่ path จริง
        cert: fs.readFileSync('C:/xampp/apache/conf/ssl.crt/server.crt') // <-- ใส่ path จริง
    };
    https.createServer(options, app).listen(PORT, () => {
        console.log(`🔒 HTTPS Server running securely on port ${PORT}`);
    });
} else {
    if (USE_HTTPS) {
        console.warn("⚠️ HTTPS requested but certificate files not found. Falling back to HTTP.");
    }
    http.createServer(app).listen(PORT, () => {
        console.log(`🚀 HTTP Server running on port ${PORT}`);
    });
}

// Graceful shutdown (optional but good practice)
process.on('SIGINT', async () => {
    console.log('\n🚦 Received SIGINT, shutting down gracefully...');
    try {
        await pool.end(); // Close database connections
        console.log('Database pool closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});