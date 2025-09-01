const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();
const app = express();
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';
const cors = require('cors');
const http = require('http');
const session = require('express-session');
const async = require('async');
const path = require('path'); // ตรวจสอบว่ามีการ import path และ fs
const fs = require('fs');
const crypto = require('crypto'); // สำหรับสุ่มรหัสผ่าน
const options = {
  key: fs.readFileSync('C:/xampp/apache/conf/ssl.key/server.key'),
  cert: fs.readFileSync('C:/xampp/apache/conf/ssl.crt/server.crt')
};
// ฟังก์ชันสุ่มรหัสผ่านใหม่
function generateRandomPassword(length = 8) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,    // อีเมลที่ใช้ส่ง
    pass: process.env.EMAIL_PASS     // รหัสผ่านแอป (App Password)
  }
});


app.use(cors({
  origin: 'https://lestialv.ddns.net', // ต้นทางที่อนุญาต
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],        // อนุญาตเฉพาะ HTTP methods ที่ต้องการ
  credentials: true               // ถ้ามี cookies หรือ headers เพิ่มเติม
}));


const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // สุ่ม 6 หลัก
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // เปลี่ยนเป็น slash ตั้งแต่ตรงนี้
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop();
    cb(null, filename);

    // สร้าง path ที่เป็น slash และบันทึก path นี้ลงฐานข้อมูล
    const filePath = `uploads/${filename}`; // ใช้ template literal
    // ... โค้ดสำหรับบันทึก filePath ลงฐานข้อมูล ...
  }
});

const upload = multer({ storage: storage });


// ตั้งค่าการเชื่อมต่อฐานข้อมูล
function handleDisconnect() {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lestial',
  });

  connection.connect(err => {
    if (err) {
      //console.log('Error connecting:', err);
      setTimeout(handleDisconnect, 2000); // ลองเชื่อมใหม่
    }
  });

  connection.on('error', err => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      //console.log('Reconnecting after connection lost...');
      handleDisconnect();
    } else {
      throw err;
    }
  });

  return connection;
}

const db = handleDisconnect();
//const db = mysql.createPool({
 // host: 'localhost',
//  user: 'root',
 // password: '',
 // database: 'lestial',
//  waitForConnections: true,
 // connectionLimit: 10,
  //queueLimit: 0
//});

app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// สร้าง UUID แบบ 7 หลัก
const generateShortUUID = () => uuidv4().split('-')[0].substring(0, 7);
app.get('/api/links', (req, res) => {
  
  // ใช้การเชื่อมต่อ 'db' ที่สร้างไว้ในการ query
  db.query('SELECT link FROM x_link', (error, results, fields) => {
      // ตรวจสอบว่ามี error จากฐานข้อมูลหรือไม่
      if (error) {
          console.error('Error fetching data from database:', error);
          return res.status(500).json({ error: 'Failed to fetch data from database' });
      }

      // ถ้าสำเร็จ ส่งข้อมูล (results) กลับไปเป็น JSON
      
      res.json(results);
  });
});
app.get('/api/reading-history/:userId', (req, res) => {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // ดึงข้อมูล reading_history พร้อม novel title และ chapter title ล่าสุด
  const sql = `
    SELECT rh.*, n.title AS novelTitle, c.title AS chapterTitle , n.cover_image AS cover_image
    FROM reading_history rh
    JOIN novels n ON rh.novelId = n.id
    LEFT JOIN chapters c ON rh.novelId = c.novel_id AND rh.chapterNumber = c.chapter
    WHERE rh.userId = ?
    ORDER BY rh.readAt DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', detail: err });
    res.json(results);
  });
});
app.put('/api/links/1', (req, res) => {
  // 1. ดึงข้อมูล link ใหม่ออกจาก request body
  const newLink = req.body.link; // เราคาดหวังว่า frontend จะส่ง {"link": "..."} มา

  // 2. ตรวจสอบว่ามีข้อมูล link ส่งมาหรือไม่
  if (!newLink) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งข้อมูล link ที่ต้องการอัปเดต' });
  }

  // 3. สร้าง SQL Query สำหรับ UPDATE (ใช้ placeholder ? เพื่อความปลอดภัย)
  const sql = 'UPDATE x_link SET link = ? WHERE ID = 1';

  // 4. สั่ง query ไปยังฐานข้อมูล
  db.query(sql, [newLink], (error, results, fields) => {
      // 5. จัดการ Error (ถ้ามี)
      if (error) {
          console.error('Error updating data:', error);
          return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
      }

      // 6. ตรวจสอบผลลัพธ์การ UPDATE
      if (results.affectedRows > 0) {
          // อัปเดตสำเร็จ (มีแถวที่ได้รับผลกระทบ)
          //console.log('Link updated successfully for ID = 1');
          res.json({ success: true, message: 'อัปเดตลิงก์สำเร็จ!' });
      } else if (results.changedRows > 0) {
           // กรณีที่ค่าใหม่เหมือนค่าเก่า MySQL อาจรายงาน affectedRows=1 แต่ changedRows=0
           // แต่บางเวอร์ชัน/คอนฟิกอาจรายงาน affectedRows=0 ถ้าค่าไม่เปลี่ยน
           // เช็ค changedRows ด้วยเพื่อความแน่ใจ (ถ้าเวอร์ชัน MySQL รองรับ)
           //console.log('Link updated successfully for ID = 1 (value was the same or changed)');
           res.json({ success: true, message: 'อัปเดตลิงก์สำเร็จ!' });
      }
       else {
          // ไม่พบ ID = 1 หรือไม่มีการเปลี่ยนแปลงข้อมูล
          //console.log('Link for ID = 1 not found or data was the same.');
          res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลิงก์ ID 1 หรือข้อมูลไม่มีการเปลี่ยนแปลง' });
      }
  });
});


// สมัครสมาชิก
app.post('/register', async (req, res) => {
  const { username, password, email, name, lastname } = req.body;
  if (!username || !password || !email || !name || !lastname) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // ตรวจสอบ Username และ Email
  db.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, email],
    async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: 'ชื่อผู้ใช้หรืออีเมลมีอยู่แล้ว' });
      }

      // แฮชรหัสผ่าน
      const hashedPassword = await bcrypt.hash(password, 10);

      // สร้าง UserID และรหัสยืนยัน
      const userID = generateShortUUID();
      const verificationCode = generateVerificationCode();

      // บันทึกข้อมูลลงฐานข้อมูล
      db.beginTransaction(err => {
        if (err) {
          console.error('Transaction error:', err);
          return res.status(500).json({ error: 'Transaction error' });
        }

        // บันทึกข้อมูล users ลงฐานข้อมูล
        db.query(
          'INSERT INTO users (UserID, username, password, email, name, lastname, verificationCode) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userID, username, hashedPassword, email, name, lastname, verificationCode],
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error('Insert user error:', err);
                res.status(500).json({ error: 'Failed to register user.' });
              });
            }

            // บันทึกข้อมูล address ลงฐานข้อมูล
            db.query(
              'INSERT INTO address (UserID) VALUES (?)',
              [userID],
              (err, result) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Insert address error:', err);
                    res.status(500).json({ error: 'Failed to register user.' });
                  });
                }

                // commit transaction ถ้าไม่มี error
                db.commit(err => {
                  if (err) {
                    console.error('Commit error:', err);
                    return res.status(500).json({ error: 'Failed to register user.' });
                  }

                  // ไม่ต้องส่งอีเมล
                  res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
                });
              }
            );
          }
        );
      });
    }
  );
});


app.post('/verify', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  db.query(
    'SELECT * FROM users WHERE email = ? AND VerificationCode = ?',
    [email, code],
    (err, results) => {
      if (err) throw err;

      if (results.length === 0) {
        return res.status(400).json({ error: 'Invalid verification code or email.' });
      }

      // อัปเดตสถานะ IsVerified
      db.query(
        'UPDATE users SET IsVerified = TRUE, VerificationCode = NULL WHERE Email = ?',
        [email],
        (err, result) => {
          if (err) throw err;
          res.status(200).json({ message: 'Email verified successfully.' });
        }
      );
    }
  );
});
app.get('/novel/:id', (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT *
    FROM novels 
    WHERE id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Query error:", err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบนิยาย' });
    }

    res.json({ success: true, data: results[0] });
  });
});
app.get('/novels/:id', (req, res) => {
  const novelId = req.params.id;
  const sql = `SELECT * FROM novels WHERE id = ?`;
  db.query(sql, [novelId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนิยาย' });

    res.json({ success: true, novel: results[0] });
  });
});
app.delete('/api/novels/:novelId', (req, res) => {
  const novelId = req.params.novelId;

  if (!novelId) {
    return res.status(400).json({ success: false, message: 'ต้องระบุ novelId' });
  }

  // 1. ลบ chapters ที่เกี่ยวข้อง
  db.query('DELETE FROM chapters WHERE novel_id = ?', [novelId], (err) => {
    if (err) {
      console.error('Error deleting chapters:', err);
      return res.status(500).json({ success: false, message: 'ลบ chapters ไม่สำเร็จ' });
    }

    // 2. ลบ novel_owner ที่เกี่ยวข้อง
    db.query('DELETE FROM novel_owner WHERE novelID = ?', [novelId], (err2) => {
      if (err2) {
        console.error('Error deleting novel_owner:', err2);
        return res.status(500).json({ success: false, message: 'ลบ novel_owner ไม่สำเร็จ' });
      }

      // 3. ลบ reading_history ที่เกี่ยวข้อง
      db.query('DELETE FROM reading_history WHERE novelId = ?', [novelId], (err3) => {
        if (err3) {
          console.error('Error deleting reading_history:', err3);
          return res.status(500).json({ success: false, message: 'ลบ reading_history ไม่สำเร็จ' });
        }

        // 4. ลบ novels
        db.query('DELETE FROM novels WHERE id = ?', [novelId], (err4, result) => {
          if (err4) {
            console.error('Error deleting novel:', err4);
            return res.status(500).json({ success: false, message: 'ลบ novel ไม่สำเร็จ' });
          }
          res.json({ success: true, message: 'ลบนิยายและข้อมูลที่เกี่ยวข้องสำเร็จ' });
        });
      });
    });
  });
});
app.post('/api/change-password', (req, res) => {
  const { userId, oldPassword, newPassword, reNewPassword } = req.body;

  if (!userId || !oldPassword || !newPassword || !reNewPassword) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }
  if (newPassword !== reNewPassword) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่และยืนยันรหัสไม่ตรงกัน' });
  }

  db.query('SELECT * FROM users WHERE UserID = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    const user = results[0];
    bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
      }
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
        db.query('UPDATE users SET password = ? WHERE UserID = ?', [hashedPassword, userId], (err) => {
          if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
          res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        });
      });
    });
  });
});

app.get("/api/novels", (req, res) => {
  const query = "SELECT id, title, description, Count, cover_image, author,status FROM novels ORDER BY created_at DESC";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});
app.get('/api/favorites/:userId', (req, res) => {
  const { userId } = req.params;
  if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
  }
  // ดึงเฉพาะ novelId จากตาราง favorites_novel
  db.query('SELECT novelId FROM favorites_novel WHERE UserId = ?', [userId], (err, results) => {
    if (err) {
        console.error("Database Error fetching novel favorites:", err.message);
        return res.status(500).json({ error: "Failed to fetch novel favorites", details: err.message });
    }
    // ส่งผลลัพธ์กลับในรูปแบบ array of objects [{ novelId: 1 }, { novelId: 2 }] ตามที่ Frontend คาดหวัง
    res.json(results); // ผลลัพธ์จาก mysql2 ปกติจะเป็น array of RowDataPacket objects อยู่แล้ว
  });
});
app.post('/api/favorites', (req, res) => {
  const { userId, novelId } = req.body;

  if (!userId || !novelId) {
    return res.json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
  }

  // ตรวจสอบว่ามีในรายการโปรดอยู่แล้วหรือยัง
  const checkSql = "SELECT * FROM favorites_novel WHERE UserId = ? AND novelId = ?";
  db.query(checkSql, [userId, novelId], (err, result) => {
    if (err) return res.json({ success: false, message: "เกิดข้อผิดพลาด" });

    if (result.length > 0) {
      return res.json({ success: false, message: "มีในรายการโปรดแล้ว" });
    }

    // เพิ่มลง favorites_novel
    const insertSql = "INSERT INTO favorites_novel (UserId, novelId) VALUES (?, ?)";
    db.query(insertSql, [userId, novelId], (err2) => {
      if (err2) return res.json({ success: false, message: "ไม่สามารถเพิ่มได้" });

      res.json({ success: true });
    });
  });
});
app.delete('/api/favorites', (req, res) => {
  // อ่าน userId และ novelId จาก request body ตามที่ Frontend ส่งมา
  const { userId, novelId } = req.body;
  if (!userId || !novelId) {
    return res.status(400).json({ error: 'Missing userId or novelId in request body' });
  }
  // ลบข้อมูลออกจากตาราง favorites_novel
  db.query('DELETE FROM favorites_novel WHERE UserId = ? AND novelId = ?', [userId, novelId], (err, result) => {
    if (err) {
        console.error("Database Error deleting novel favorite:", err.message);
        return res.status(500).json({ error: "Failed to delete novel favorite", details: err.message });
    }
    // ส่ง success กลับไปเสมอ แม้ว่าจะไม่มีข้อมูลให้ลบก็ตาม เพื่อให้ UI อัปเดตได้
    res.json({ success: true });
  });
});


app.get('/chapter/:novelId/:chapter', (req, res) => {
  const novelId = req.params.novelId;
  const chapter = req.params.chapter;
  const userId = req.query.userId || null;
  
  db.query('SELECT * FROM chapters WHERE novel_id = ? AND chapter = ?', [novelId, chapter], (err, result) => {
    if (err || result.length === 0) {
      return res.json({ success: false, message: 'ไม่พบตอน' });
    }
    const chap = result[0];
    
    if ( chap.price <= 0) {
      return res.json({ success: true, chapter: {
        id: chap.id,
        title: chap.title,
        price: chap.price,
        chapter: chap.chapter,
        content: chap.content,
        created_at: chap.created_at
      }});
    }
    if (chap.price === 0) {
      return res.json({ success: true, chapter: { id: chap.id, title: chap.title, price: chap.price, chapter: chap.chapter, content: chap.content, created_at: chap.created_at } });
    } 

    if (!userId && chap.price > 0) {
      return res.json({ success: false, loginRequired: true });
    }
  
    db.query('SELECT * FROM novel_owner WHERE UserID = ? AND ChapterID = ? AND novelID = ?', [userId, chapter, novelId], (err, owned) => {
      
      if (owned.length > 0) {
        
        return res.json({ success: true, chapter: chap });
      }
      

      db.query('SELECT coins FROM users WHERE UserID = ?', [userId], (err, users) => {
        if (users.length === 0) return res.json({ success: false });
        if (users[0].coins < chap.price) {
          return res.json({ success: false, notEnoughCoins: true });
        }

        return res.json({ success: false, needToPurchase: true, chapter: { id: chap.id, title: chap.title, price: chap.price, chapter: chap.chapter, content: chap.content, created_at: chap.created_at } });
      });
    });
  
  });
});

app.post('/purchase', (req, res) => {
  const userId = req.body.userId;
  const chapterId = req.body.chapterId;
  const novelId = req.body.novelId;

  db.query('SELECT * FROM chapters WHERE novel_id = ? AND chapter = ?', [novelId, chapterId], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error (chapters)' });
    if (result.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบตอนนิยาย' });

    const chapter = result[0]; // ✅ เก็บข้อมูลตอน

    db.query('SELECT coins FROM users WHERE UserID = ?', [userId], (err, users) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error (users)' });
      if (users.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

      if (users[0].coins < chapter.price) {
        return res.status(400).json({ success: false, message: 'เหรียญไม่พอ' });
      }

      db.query('UPDATE users SET coins = coins - ? WHERE UserID = ?', [chapter.price, userId], (err, updateResult) => {
        if (err) return res.status(500).json({ success: false, message: 'Error updating coins' });

        db.query('INSERT INTO novel_owner (UserID, ChapterID, novelID) VALUES (?, ?, ?)', [userId, chapterId, novelId], (err, insertResult) => {
          if (err) return res.status(500).json({ success: false, message: 'Error inserting ownership' });

          return res.json({ success: true });
        });
      });
    });
  });
});
app.get('/api/novel-chapter-range/:novelId', (req, res) => {
  const novelId = req.params.novelId;
  db.query(
    'SELECT MIN(chapter) AS minChapter, MAX(chapter) AS maxChapter FROM chapters WHERE novel_id = ?',
    [novelId],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      if (!results || results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
      res.json({ success: true, ...results[0] });
    }
  );
});

app.get('/chapters/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM chapters WHERE id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลตอน' });

    res.json({ success: true, chapter: results[0] });
  });;
});
app.post('/update-novel', (req, res) => {
  const { id, title, description, status } = req.body;

  const sql = `
    UPDATE novels
    SET title = ?, description = ?,  status = ?
    WHERE id = ?
  `;

  db.query(sql, [title, description, status, id], (err, result) => {
    if (err) {
      console.error('❌ Update error:', err);
      return res.status(500).json({ success: false, message: 'Update failed' });
    }
    res.json({ success: true, message: '✅ อัปเดตนิยายสำเร็จ' });
  });
});
// อัปเดต chapter และอัปเดต Count ใน novels ให้เป็น chapter ที่มากที่สุดของ novel_id นั้น
app.post('/update-chapter', (req, res) => {
  const { id, title, content, price, NovelNumber, novel_id } = req.body;

  // 1. อัปเดต chapter
  const sql = `
    UPDATE chapters
    SET title = ?, content = ?, price = ?, chapter = ?
    WHERE id = ?
  `;

  db.query(sql, [title, content, price, NovelNumber, id], (err, result) => {
    if (err) {
      console.error('❌ Update error:', err);
      return res.status(500).json({ success: false, message: 'Update failed' });
    }

    // 2. หา chapter ที่มากที่สุดของ novel_id นี้
    db.query(
      'SELECT MAX(chapter) AS maxChapter FROM chapters WHERE novel_id = ?',
      [novel_id],
      (err2, results2) => {
        if (err2) {
          console.error('❌ Error finding max chapter:', err2);
          return res.status(500).json({ success: false, message: 'Update chapter but failed to update novel count' });
        }
        const maxChapter = results2[0]?.maxChapter || 0;

        // 3. อัปเดต Count ใน novels
        db.query(
          'UPDATE novels SET Count = ? WHERE id = ?',
          [maxChapter, novel_id],
          (err3) => {
            if (err3) {
              console.error('❌ Error updating novel Count:', err3);
              return res.status(500).json({ success: false, message: 'Chapter updated but failed to update Count' });
            }
            res.json({ success: true, message: '✅ อัปเดตนิยายสำเร็จ' });
          }
        );
      }
    );
  });
});


app.post('/upload-chapter', (req, res) => {
  const { novel_id, title, content, price } = req.body;

  const getChapterSQL = `SELECT MAX(chapter) AS latest FROM chapters WHERE novel_id = ?`;
  db.query(getChapterSQL, [novel_id], (err, results) => {
    if (err) {
      console.error('❌ Error getting latest chapter:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    const latest = results[0].latest ?? 0;
    const newChapter = latest + 1;

    const insertSQL = `
      INSERT INTO chapters (novel_id, title, content, chapter, price)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(insertSQL, [novel_id, title, content, newChapter, price], (err2) => {
      if (err2) {
        console.error('❌ Error inserting chapter:', err2);
        return res.status(500).json({ success: false, message: 'Insert failed' });
      }

      // 👉 อัปเดต Count +1 ในตาราง novels
      const updateNovelCountSQL = `
        UPDATE novels SET Count = Count + 1 WHERE id = ?
      `;
      db.query(updateNovelCountSQL, [novel_id], (err3) => {
        if (err3) {
          console.error('❌ Error updating novel Count:', err3);
          return res.status(500).json({ success: false, message: 'Chapter inserted but failed to update count' });
        }

        res.json({ success: true, message: 'เพิ่มตอนใหม่เรียบร้อยแล้ว', chapter: newChapter });
      });
    });
  });
});



app.get('/get-chapters', (req, res) => {
  const novelId = req.query.id;

  if (!novelId) {
    return res.status(400).json({ success: false, message: 'ต้องระบุ novel_id' });
  }

  const sql = `
    SELECT *
    FROM chapters 
    WHERE novel_id = ? 
    ORDER BY chapter ASC
  `;

  db.query(sql, [novelId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }

    res.json({ success: true, chapters: results });
  });
});
app.delete('/api/addresses/:addressId', (req, res) => {
    const addressId = req.params.addressId;
    db.query('DELETE FROM address WHERE id = ?', [addressId], (err, result) => {
        if (err) return res.status(500).json({ error: "Delete failed" });
        res.json({ success: true });
    });
});
// GET /check-owner
// ตรวจสอบว่า user เป็นเจ้าของ chapter หรือไม่
app.get('/check-owner', (req, res) => {
  const { userId, novelId } = req.query;

  if (!userId || !novelId) {
    return res.json({ success: false, message: 'Missing parameters' });
  }

  const sql = `
    SELECT ChapterID FROM novel_owner 
    WHERE UserID = ? AND novelID = ?
  `;

  db.query(sql, [userId, novelId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'DB Error' });
    }

    const ownedChapters = results.map(row => row.ChapterID);
    res.json({ success: true, ownedChapters });
  });
});


app.post('/upload-novel', upload.single('image'), (req, res) => {
  const { title, author, description, userId, username } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !description || !userId || !username) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const sql = `INSERT INTO novels (title, description, cover_image, userid, author, uploadby) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [title, description, imagePath, userId, author, username], (err) => {
    if (err) {
      console.error('❌ Upload novel error:', err);
      return res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกข้อมูลได้' });
    }
    res.json({ success: true, message: 'บันทึกนิยายเรียบร้อยแล้ว' });
  });
});
app.get('/api/members', (req, res) => {
  db.query('SELECT * FROM member ORDER BY ID ASC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

app.get('/novels', (req, res) => {
  const search = req.query.search || '';
  const sql = `
    SELECT *
    FROM novels 
    WHERE title LIKE ?
    ORDER BY created_at DESC
  `;
  db.query(sql, [`%${search}%`], (err, results) => {
    if (err) {
      console.error("❌ Query error:", err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
    res.json({ success: true, data: results });
  });
});


app.get('/api/novel', (req, res) => {
  const search = req.query.search || '';
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'กรุณาส่ง userId มาด้วย' });
  }

  const sql = `
    SELECT * FROM novels
    WHERE userid = ? AND title LIKE ?
    ORDER BY created_at DESC
  `;
  const params = [userId, `%${search}%`];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Query error:", err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: err });
    }

    const processedResults = results.map(novel => ({
      ...novel,
      cover_image: novel.cover_image && !novel.cover_image.startsWith('/')
        ? `/${novel.cover_image}` : novel.cover_image
    }));

    res.json({ success: true, data: processedResults });
  });
});



// เข้าสู่ระบบ
// API สำหรับการเข้าสู่ระบบ (Login)
/**app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
      const sql = 'SELECT * FROM users WHERE username = ?';
      db.query(sql, [username], async (err, results) => {
          if (err) return res.status(500).json({ error: 'Database error' });

          if (results.length === 0) {
              return res.status(400).json({ error: 'Invalid username or password' });
          }

          const user = results[0];

          // **Crucial Check:** Make sure user.Password exists and is a string
          if (!user.password || typeof user.password !== 'string') {
              console.error("User's password hash is missing or invalid:", user);  // Log for debugging
              return res.status(500).json({ error: 'Internal server error (invalid password data)' }); // More secure error
          }

          const isMatch = await bcrypt.compare(password, user.password);

          if (!isMatch) {
              return res.status(400).json({ error: 'Invalid username or password' });
          }
          const userId = user.UserID; // ดึง userId จากฐานข้อมูล (หรือที่เก็บ userId ของคุณ)
          res.status(200).json({ message: 'Login successful!', userId: userId },);
      });
  } catch (err) {
      console.error("Login error:", err); // Log the full error for debugging
      res.status(500).json({ error: 'Server error' });
  }
});*/
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (results.length === 0) {
          return res.status(401).json({ error: 'ชื่อผู้ใช้ไม่ถูกต้อง' });
      }

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
          return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
      }

      // Remove password before sending to frontend
      delete user.password;

      // Optional JWT (ถ้าต้องการ auth token)
      const token = jwt.sign({ userId: user.UserID }, 'secretKey', { expiresIn: '1h' });

      return res.status(200).json({ message: 'เข้าสู่ระบบสำเร็จ', user, token });
  });
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // ตรวจสอบว่ามี Email ในระบบหรือไม่
  db.query('SELECT * FROM users WHERE Email = ?', [email], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(404).json({ error: 'Email not found.' });
    }

    const user = results[0];
    const token = jwt.sign({ id: user.UserID }, JWT_SECRET, { expiresIn: '15m' }); // Token มีอายุ 15 นาที
    const resetLink = `http://localhost/resetpassword/${token}`;

    // ส่งอีเมล
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password',
      text: `Click the following link to reset your password: ${resetLink}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send reset email.' });
      }

      res.status(200).json({ message: 'Reset link sent to your email.' });
    });
  });
});

// **Reset Password**
app.post('/reset-password', (req, res) => {
  const { oldPassword, newPassword, userId} = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide both passwords' });
  }


  if (!userId) {
    return res.status(401).json({ message: 'You must be logged in' });
  }

  // ค้นหาผู้ใช้จากฐานข้อมูล
  db.query('SELECT * FROM users WHERE UserID = ?', [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = results[0];
    bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect old password' });
      }

      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: 'Error resetting password' });

        db.query('UPDATE users SET password = ? WHERE UserID = ?', [hashedPassword, userId], (err) => {
          if (err) return res.status(500).json({ message: 'Error resetting password' });
          res.json({ message: 'Password has been reset' });
        });
      });
    });
  });
});

app.post('/api/reset-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'กรุณากรอกอีเมล' });

  // 1. ตรวจสอบว่ามี email ในระบบหรือไม่
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) {
      // เพื่อความปลอดภัย ตอบเหมือนกันเสมอ
      return res.json({ success: true, message: 'ถ้ามีอีเมลนี้ในระบบ จะได้รับอีเมลรีเซ็ตรหัสผ่าน' });
    }

    // 2. สุ่มรหัสผ่านใหม่และ hash
    const newPassword = generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. อัปเดตรหัสผ่านใหม่ในฐานข้อมูล
    db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err2) => {
      if (err2) return res.status(500).json({ error: 'Database error' });

      // 4. ส่งรหัสผ่านใหม่ไปทางอีเมล
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'รหัสผ่านใหม่สำหรับ Lestial V',
        text: `รหัสผ่านใหม่ของคุณคือ: ${newPassword}\n\nกรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัย`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        // ตอบกลับเหมือนกันเสมอเพื่อความปลอดภัย
        return res.json({ success: true, message: 'ถ้ามีอีเมลนี้ในระบบ จะได้รับอีเมลรีเซ็ตรหัสผ่าน' });
      });
    });
  });
});

app.post('/cart', (req, res) => {
  const { userId, productId } = req.body;
  const query = 'INSERT INTO carts (user_id, product_id) VALUES (?, ?)';
  db.query(query, [userId, productId], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send('Product added to cart');
  });
});

app.get('/api/checkroles/:id', (req,res) => {
  const userId = req.params.id; // Get UserID after authentication


  // 2. Fetch user data (including Roles)
  db.query('SELECT * FROM users WHERE UserID = ?', [userId], (err, results) => {
      if (err) {
          console.error('Error fetching user data:', err);
          res.status(500).json({ error: 'Failed to fetch user data' });
          return;
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      res.json(results[0]); // Send user data (including Roles)
  });
});

app.get('/api/users/me', (req, res) => {

  if (!req.user.UserID) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const userID = req.user.UserID; // Access UserID here

  const query = `SELECT u.UserID, u.username, u.email, a.telephone, a.address, u.coins, a.imgprofile
                 FROM users u
                 INNER JOIN address a ON u.username = a.username
                 WHERE u.UserID = ?`; // หรือ WHERE u.UserID = ? ถ้า UserID เป็น primary key

  db.query(query, [userID], (err, results) => {
    if (err) {
      console.error('Error fetching user data:', err);
      res.status(500).json({ error: 'Failed to fetch user data' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(results[0]); // ส่งข้อมูลผู้ใช้กลับไป
  });
});

app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  
  // ดึงข้อมูลผู้ใช้จากตาราง users
  db.query('SELECT * FROM users WHERE UserID = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user data:', err);
      res.status(500).json({ error: 'Failed to fetch user data' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = results[0];

    // ดึงข้อมูลที่อยู่จากตาราง address โดยใช้ UserID จากข้อมูลผู้ใช้
    db.query('SELECT * FROM address WHERE UserID = ?', [userData.UserID], (err, results) => {
      if (err) {
        console.error('Error fetching address data:', err);
        res.status(500).json({ error: 'Failed to fetch address data' });
        return;
      }

      if (results.length > 0) {
        // รวมข้อมูลที่อยู่เข้ากับข้อมูลผู้ใช้
        userData.address = results[0];
      }

      // ส่งข้อมูลผู้ใช้พร้อมข้อมูลที่อยู่กลับไปยังผู้เรียก
      res.json(userData);
    });
  });
});

app.post('/slip', upload.single('image'), (req, res) => {
  const { ref, amount, userId } = req.body;
  const imagePath = req.file ? req.file.filename : null;



  if (!ref || !amount || !userId || !imagePath) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  // ตรวจสอบว่า ref มีอยู่แล้วหรือไม่
  db.query('SELECT * FROM topup WHERE ref = ?', [ref], (err, results) => {
      if (err) {
          console.error('เกิดข้อผิดพลาดในการเช็ค ref:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
      }
      if (results.length > 0) {
          return res.status(400).json({ error: 'รายการนี้มีอยู่ในระบบแล้ว' });
      }

      // บันทึกข้อมูลลงฐานข้อมูล
      db.query(
          'INSERT INTO topup (UserID, imgslip, ref, amount) VALUES (?, ?, ?, ?)',
          [userId, imagePath, ref, amount],
          (err, result) => {
              if (err) {
                  console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', err);
                  return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
              }
              db.query(
                'UPDATE users SET coins = coins + ? WHERE UserID = ?',
                [amount, userId],
                (err, result) => {
                  if (err) {
                    console.error('เกิดข้อผิดพลาดในการอัปเดตเหรียญ:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตเหรียญ' });
                  }
        
                  // Send the response only after both queries are successful
                  res.json({
                    message: 'บันทึกข้อมูลสำเร็จ',
                    ref,
                    amount,
                    imgslip: imagePath
                  });
                }
              );  
          }
      
      );
      
  });
});
app.post('/slippropay', upload.single('image'), (req, res) => {
  const { ref, amount, userId, orderId } = req.body;
  const imagePath = req.file ? req.file.filename : null;

  if (!ref || !amount || !userId || !imagePath || !orderId) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  db.query('SELECT * FROM topup WHERE ref = ?', [ref], (err, results) => {
    if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    if (results.length > 0) return res.status(400).json({ error: 'รายการนี้มีอยู่ในระบบแล้ว' });

    db.query(
      'INSERT INTO topup (UserID, imgslip, ref, amount) VALUES (?, ?, ?, ?)',
      [userId, imagePath, ref, amount],
      (err) => {
        if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });

        // เติม coins
        db.query('UPDATE users SET coins = coins + ? WHERE UserID = ?', [amount, userId], (err) => {
          if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตเหรียญ' });

          // ดึงข้อมูล order
          db.query('SELECT totalAfterCoins, Product FROM orders WHERE OrderID = ?', [orderId], (err, orderResults) => {
            if (err || orderResults.length === 0) return res.status(500).json({ error: 'เกิดข้อผิดพลาดหรือไม่พบคำสั่งซื้อ' });

            const totalOrder = orderResults[0].totalAfterCoins;
            const productList = JSON.parse(orderResults[0].Product);

            // ตรวจสอบ coins ผู้ใช้
            db.query('SELECT coins FROM users WHERE UserID = ?', [userId], (err, userResults) => {
              if (err || userResults.length === 0) return res.status(500).json({ error: 'เกิดข้อผิดพลาดหรือไม่พบผู้ใช้' });

              const userCoins = userResults[0].coins;
              let newStatus = userCoins >= totalOrder ? 'รอพนักงานรับคำสั่งซื้อ' : 'รอการชำระเงิน';

              // อัปเดตสถานะคำสั่งซื้อ
              db.query('UPDATE orders SET Status = ? WHERE OrderID = ?', [newStatus, orderId], (err) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });

                // หัก coins ถ้าเพียงพอ
                if (userCoins >= totalOrder) {
                  db.query('UPDATE users SET coins = coins - ? WHERE UserID = ?', [totalOrder, userId], (err) => {
                    if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการหักเหรียญ' });

                    // ✅ หัก product_count ของสินค้าแต่ละชิ้น
                    const updateTasks = productList.map(product => {
                      return new Promise((resolve, reject) => {
                      db.query(
                        'UPDATE product SET Product_count = Product_count - ? WHERE Product_id = ? AND Product_status = ?',
                        [product.quantity, product.product_id, 'in-stock'],
                        (err) => {
                        if (err) reject(err);
                        else resolve();
                        }
                      );
                      });
                    });

                    Promise.all(updateTasks)
                      .then(() => {
                        res.json({
                          message: 'บันทึกข้อมูลและอัปเดตสถานะสำเร็จ',
                          ref,
                          amount,
                          imgslip: imagePath,
                          newStatus
                        });
                      })
                      .catch((err) => {
                        console.error('❌ SQL Error (อัปเดตสินค้า):', err);
                        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตจำนวนสินค้า' });
                      });
                  });
                } else {
                  res.json({
                    message: 'บันทึกข้อมูลเรียบร้อย รอการชำระเงิน',
                    ref,
                    amount,
                    imgslip: imagePath,
                    newStatus
                  });
                }
              });
            });
          });
        });
      }
    );
  });
});


app.post('/deleteProducts', (req, res) => {
  const { productIds } = req.body;
  if (!productIds || productIds.length === 0) {
    return res.status(400).json({ error: 'No products selected' });
  }

  const placeholders = productIds.map(() => '?').join(',');
  const sql = `DELETE FROM product WHERE Product_id IN (${placeholders})`;

  db.query(sql, productIds, (err, results) => {
    if (err) {
      console.error('Error deleting products:', err);
      return res.status(500).json({ error: 'Failed to delete products' });
    }
    res.json({ message: 'Products deleted successfully' });
  });
});

app.post('/api/topup', upload.single('slip', 'userId'), (req, res) => {
  const userId = req.body.userId; // รับ UserID จาก Frontend (ต้องส่งมาด้วย)
  const slipImage = req.file.path;

  // ตรวจสอบสลิป (ส่วนนี้ต้องใช้ OCR หรือ Library อื่นๆ)
  // ตัวอย่าง: ตรวจสอบจากชื่อไฟล์ (สมมติว่าชื่อไฟล์มีจำนวนเงิน)
  const slipData = {
      amount: parseInt(req.file.originalname.split('-')[0]),
  };

  // บันทึกข้อมูลการเติมเงินลงในฐานข้อมูล
  db.query('INSERT INTO topup (UserID, imgslip) VALUES (?, ?)', [userId, slipImage], (err, result) => {
      if (err) {
          console.error('Error:', err);
          res.json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
          return;
      }

      // อัพเดทจำนวนเงินในบัญชีผู้ใช้
      db.query('UPDATE users SET coins = coins + ? WHERE UserID = ?', [slipData.amount, userId], (err, result) => {
          if (err) {
              console.error('Error:', err);
              res.json({ message: 'เกิดข้อผิดพลาดในการอัพเดทจำนวนเงิน' });
              return;
          }

          res.json({ message: 'เติมเงินสำเร็จ' });
      });
  });
});

app.get('/products', (req, res) => {
  db.query('SELECT * FROM product ORDER BY Product_id DESC', (error, results) => {
      if (error) {
          console.error("Database Error:", error);
          return res.status(500).json({ error: 'Database query failed' });
      }
      res.json(results);
  });
});
app.get('/product-types', (req, res) => {
  db.query('SELECT DISTINCT product_type FROM product', (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results.map(row => row.product_type));
  });
});

// Update product
app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  if (!productId || isNaN(productId)) {
       return res.status(400).json({ error: 'Invalid Product ID' });
  }

  const sql = 'SELECT * FROM product WHERE Product_id = ?';
  db.query(sql, [productId], (error, results) => {
      if (error) {
          console.error("Database Error:", error);
          return res.status(500).json({ error: 'Database query failed' });
      }
      if (results.length === 0) {
          return res.status(404).json({ error: 'Product not found' });
      }
      res.json(results[0]); // ส่งข้อมูลสินค้าตัวแรกที่เจอ
  });
});

app.delete('/products/:id', (req, res) => {
  const productId = req.params.id;
  const sql = 'DELETE FROM product WHERE Product_id = ?';
  db.query(sql, [productId], (err, result) => {
      if (err) {
          console.error('Error deleting product:', err);
          res.status(500).json({ error: 'Failed to delete product' });
          return;
      }
      res.json({ message: 'Product deleted successfully' });
  });
});

app.get('/api/products', (req, res) => {
  const sql = `
      SELECT Product_type, Product_id, Product_name, Product_price, Product_img, Product_description, Product_count, Product_status
      FROM product
      ORDER BY Product_id DESC`;
  db.query(sql, (err, results) => {
      if (err) {
          console.error("Error fetching products:", err);
          res.status(500).json({ error: 'Failed to fetch products' });
          return;
      }

      const categories = {};
      results.forEach(row => {
          if (!categories[row.Product_type]) {
              categories[row.Product_type] = {
                  name: row.Product_type,
                  products: []
              };
          }
          categories[row.Product_type].products.push(row);
      });

      const formattedCategories = Object.values(categories).map(category => ({
          name: category.name,
          products: category.products.slice(0, 4) // Newest 3 products
      }));

      res.json(formattedCategories);
  });
});
app.post('/api/Favorite', (req, res) => {
  const { UserID, Product_id } = req.body;
  ////console.log('Received data:', req.body); // Log the received data
  if (!UserID || !Product_id) {
      return res.status(400).json({ error: 'Missing UserID or Product_id' });
  }

  const sql = `INSERT INTO favorites (UserID, Product_id) VALUES (?, ?)`;

  db.query(sql, [UserID, Product_id], (err, result) => {
      if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ error: 'Already favorited' });
          }
          return res.status(500).json({ error: err });
      }
      res.json({ message: 'Favorite added successfully' });
  });
});
app.delete('/api/Favorite', (req, res) => {
  const { UserID, Product_id } = req.body;

  if (!UserID || !Product_id) {
      return res.status(400).json({ error: 'Missing UserID or Product_id' });
  }

  const sql = `DELETE FROM favorites WHERE UserID = ? AND Product_id = ?`;

  db.query(sql, [UserID, Product_id], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Favorite removed successfully' });
  });
});

/*app.get('/api/dashboard-data', (req, res) => {
  const query = `
    SELECT 
      Status, 
      SUM(Total) AS totalRevenue, 
      COUNT(CASE WHEN Status != 'ยกเลิก' AND Status != 'รอการชำระเงิน' THEN 1 END) AS totalOrders,
      COUNT(CASE WHEN Status = 'ยกเลิก'  THEN 1 END) AS canceledOrders
    FROM orders
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching dashboard data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const revenueByRange = {
      '0-1000': 0,
      '1000-5000': 0,
      '5000-10000': 0,
      '10000-50000': 0,
      '50000+': 0,
    };

    db.query('SELECT Total FROM orders WHERE Status != "ยกเลิก" AND Status != "รอการชำระเงิน"', (err, totals) => {
      if (err) {
        console.error('Error fetching totals:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      totals.forEach(order => {
        const total = order.Total;
        if (total <= 1000) revenueByRange['0-1000']++;
        else if (total <= 5000) revenueByRange['1000-5000']++;
        else if (total <= 10000) revenueByRange['5000-10000']++;
        else if (total <= 50000) revenueByRange['10000-50000']++;
        else revenueByRange['50000+']++;
      });

      res.json({
        stats: results[0],
        revenueByRange,
      });
    });
  });
});*/
app.post('/api/reading-history', (req, res) => {
  const { userId, novelId, chapterNumber } = req.body;
  if (!userId || !novelId || !chapterNumber) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  const checkSql = `
    SELECT * FROM reading_history WHERE userId = ? AND novelId = ?
  `;
  db.query(checkSql, [userId, novelId], (err, result) => {
    if (err) {
      console.error("❌ Error checking history:", err);
      return res.status(500).json({ success: false });
    }

    if (result.length > 0) {
      // มีแล้ว -> อัปเดต chapterNumber และเวลา
      const updateSql = `
        UPDATE reading_history 
        SET chapterNumber = ?, readAt = CURRENT_TIMESTAMP 
        WHERE userId = ? AND novelId = ?
      `;
      db.query(updateSql, [chapterNumber, userId, novelId], (err) => {
        if (err) {
          console.error("❌ Error updating reading history:", err);
          return res.status(500).json({ success: false });
        }
        return res.json({ success: true, updated: true });
      });
    } else {
      // ยังไม่มี -> insert ใหม่
      const insertSql = `
        INSERT INTO reading_history (userId, novelId, chapterNumber) 
        VALUES (?, ?, ?)
      `;
      db.query(insertSql, [userId, novelId, chapterNumber], (err) => {
        if (err) {
          console.error("❌ Error inserting reading history:", err);
          return res.status(500).json({ success: false });
        }
        return res.json({ success: true, inserted: true });
      });
    }
  });
});


app.get('/api/Favorites', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const sql = `
      SELECT p.* FROM favorites f
      JOIN product p ON f.Product_id = p.Product_id
      WHERE f.UserID = ?
  `;
  db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
  });
});
app.get('/api/FavoritesNovel', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const sql = `
      SELECT n.* FROM favorites_novel f
      JOIN novels n ON f.novelId = n.id
      WHERE f.UserID = ?
  `;
  db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
  });
});
app.get('/api/category/:name', (req, res) => {
  const categoryName = decodeURIComponent(req.params.name);
  const sql = `
      SELECT *
      FROM product 
      WHERE Product_type = ?
      ORDER BY Product_id DESC`;

  db.query(sql, [categoryName], (err, results) => {
      if (err) {
          console.error('Error fetching category products:', err);
          res.status(500).json({ error: 'Database error' });
      } else {
          res.json(results);
      }
  });
});

app.post('/api/uploadproducts', upload.single('image'), (req, res) => {
  const { name, price, quantity, category, details, status } = req.body;
    const imageUrl = req.file ? `uploads/${req.file.filename}` : null;
    const sql = `
        INSERT INTO product (
            Product_name, 
            Product_price, 
            Product_count, 
            Product_type, 
            Product_img, 
            Product_description, 
            Product_status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name, price, quantity, category, imageUrl, details, status], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
        }
        res.json({ message: "เพิ่มสินค้าสำเร็จ!" });
    });
});


app.post('/api/cart', (req, res) => {
  const { UserID, cartItems } = req.body; // Expecting UserID and cart items

  if (!UserID || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: 'Invalid request body' });
  }

  // You would typically store cart items in a separate table
  // Example: cart table (UserID, Product_id, quantity)

  cartItems.forEach(item => {
      const { Product_id, quantity } = item;

      // Check if the product exists and has enough stock (important!)
      db.execute('SELECT Product_count FROM product WHERE Product_id = ?', [Product_id], (err, results) => {
          if (err) {
              console.error("Error checking product stock:", err);
              return res.status(500).json({ error: 'Database error' });
          }

          if (results.length === 0) {
              return res.status(404).json({ error: `Product ${Product_id} not found` });
          }

          const availableStock = results[0].Product_count;
          if (availableStock < quantity) {
              return res.status(400).json({ error: `Not enough stock for product ${Product_id}` });
          }

          // Insert or update the cart item
          db.execute('INSERT INTO carts (UserID, Product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?', [UserID, Product_id, quantity, quantity], (err, results) => {
              if (err) {
                  console.error("Error updating cart:", err);
                  return res.status(500).json({ error: 'Database error' });
              }
              // Optionally update product stock here if needed.
          });
      });
  });

 

  res.json({ message: 'Cart updated successfully' });
});
app.delete('/chapters/:id', (req, res) => {
  const chapterId = req.params.id;
  // 1. ดึง novel_id ก่อน
  db.query('SELECT novel_id FROM chapters WHERE id = ?', [chapterId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบตอนนี้' });
    }
    const novelId = results[0].novel_id;
    // 2. ลบ chapter
    db.query('DELETE FROM chapters WHERE id = ?', [chapterId], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'ลบไม่สำเร็จ' });
      // 3. อัปเดต Count -1 ใน novels
      db.query('UPDATE novels SET Count = Count - 1 WHERE id = ?', [novelId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'ลบตอนแล้วแต่ปรับ Count ไม่สำเร็จ' });
        res.json({ success: true, message: 'ลบตอนสำเร็จ' });
      });
    });
  });
});
app.delete('/api/cart/delete', (req, res) => {
  //console.log('Received request to delete from cart:', req.body); // Log the request body
  const { UserID, Product_id } = req.body; // Expecting UserID and Product_id
   const sql = `DELETE FROM carts WHERE UserID = ? AND Product_id = ?`;
  db.query(sql, [UserID, Product_id], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Product removed from cart successfully' });
  });

});
app.get("/api/cart/:userId", (req, res) => {
  
  const userId = req.params.userId;
  const sql = `
    SELECT c.*, p.Product_name, p.Product_price, p.Product_img, p.Product_description,p.Product_status, p.Product_count
FROM carts c
JOIN product p ON c.Product_id = p.Product_id
WHERE c.UserID = ?;
  `;
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});
app.post("/api/showorder", (req, res) => {
  const { userId, productIds } = req.body;
  ////console.log("📩 Received:", { userId, productIds });

  if (!userId || !productIds || productIds.length === 0) {
    return res.status(400).json({ error: "❌ UserID และ Product_id จำเป็นต้องมีค่า" });
  }

  // แปลง `productIds` เป็น Array เสมอ
  const productArray = Array.isArray(productIds) ? productIds : [productIds];

  // ปรับคำสั่ง SQL ให้รองรับ `IN (?)`
  const sql = `
    SELECT * FROM product
    WHERE Product_id IN (?);
  `;

  db.query(sql, [productArray], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
    ////console.log("📤 Sent:", result);
  });
});
app.post('/api/carts', (req, res) => {
  const { Product_id, UserID, quantity } = req.body;

  const sql = 'INSERT INTO carts (Product_id, UserID, quantity) VALUES (?, ?, ?)';
  db.query(sql, [Product_id, UserID, quantity], (err, results) => {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({ error: 'Insert failed' });
    }

    res.json({ message: 'เพิ่มสินค้าลงตะกร้าแล้ว' });
  });
});
// API: ดึงจำนวน cart + favorite
app.get('/api/user-badge-counts/:userId', (req, res) => {
  const userId = req.params.userId;

  // ดึงจำนวนสินค้าในตะกร้า
  const cartQuery = 'SELECT SUM(quantity) AS cartCount FROM carts WHERE UserID = ?';
  db.query(cartQuery, [userId], (err, cartResult) => {
    if (err) {
      console.error('❌ Error querying cart count:', err);
      return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลตะกร้าได้' });
    }

    const cartCount = cartResult[0].cartCount || 0;

    // ดึงจำนวน favorite
    const favQuery = 'SELECT COUNT(*) AS favCount FROM favorites WHERE UserID = ?';
    db.query(favQuery, [userId], (err2, favResult) => {
      if (err2) {
        console.error('❌ Error querying favorite count:', err2);
        return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Favorite ได้' });
      }

      const favCount = favResult[0].favCount || 0;

      // ส่งข้อมูลกลับไป frontend
      res.json({ cartCount, favCount });
    });
  });
});
app.get('/api/user-orders/:userId', (req, res) => {
  const userId = req.params.userId;

  const sql = 'SELECT * FROM orders WHERE UserID = ? ORDER BY order_date DESC';
  db.query(sql, [userId], (err, orders) => {
    if (err) return res.status(500).json({ error: err });

    const allProductIds = [];

    // รวม productId ทั้งหมดจากทุกคำสั่งซื้อ
    orders.forEach(order => {
      try {
        const products = JSON.parse(order.Product);
        order.Product = products; // เก็บไว้ใน object order
        products.forEach(p => allProductIds.push(p.product_id));
      } catch (e) {
        console.error('❌ JSON parse error:', e);
      }
    });

    // เอาเฉพาะ productId ที่ไม่ซ้ำ
    const uniqueIds = [...new Set(allProductIds)];

    if (uniqueIds.length === 0) return res.json({ orders, productDetails: [] });

    // สร้าง SQL สำหรับดึงข้อมูลสินค้า
    const productSql = 'SELECT * FROM product WHERE Product_id IN (?)';
    
    db.query(productSql, [uniqueIds], (err, productDetails) => {
      if (err) return res.status(500).json({ error: err });
      // 🔧 รวมข้อมูลสินค้ากลับเข้าแต่ละ order
      /*orders.forEach(order => {
        order.Product = order.Product.map(p => {
          const productInfo = productDetails.find(pd => pd.Product_id === p.product_id);
          return {
            ...p,
            ...(productInfo || {
              Product_name: "ไม่พบสินค้า",
              Product_img: "",
              Product_price: 0
            })
          };
        });
      });*/
      
      // ส่งข้อมูล orders และ productDetails กลับ
      res.json({ orders, productDetails });
    });
  });
});


app.put('/api/carts/update', (req, res) => {
  const { Product_id, UserID, quantity } = req.body;

  const sql = 'UPDATE carts SET quantity = ? WHERE Product_id = ? AND UserID = ?';
  db.query(sql, [quantity, Product_id, UserID], (err, results) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({ error: 'Update failed' });
    }

    res.json({ message: 'อัปเดตจำนวนสินค้าแล้ว' });
  });
});
// API อัปเดตจำนวนสินค้าในตะกร้า
app.post("/api/cart/update", (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (quantity <= 0) {
    db.query("DELETE FROM carts WHERE UserID = ? AND Product_id = ?", [userId, productId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Removed from cart" });
    });
  } else {
    db.query("UPDATE carts SET quantity = ? WHERE UserID = ? AND Product_id = ?", [quantity, userId, productId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Cart updated" });
    });
  }
});
app.post('/api/cancel-order', (req, res) => {
  const { orderId, userId } = req.body;
  if (!orderId || !userId) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  // 1. ดึง order เดิม
  db.query('SELECT Status, Total,totalAfterCoins, Product,payby FROM orders WHERE OrderID = ? AND UserID = ?', [orderId, userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อ' });
    }
    const order = results[0];
    const returnCoins = order.Total - order.totalAfterCoins;
    // 2. อัปเดตสถานะเป็น "ยกเลิกคำสั่งซื้อ"
    db.query('UPDATE orders SET Status = ? WHERE OrderID = ?', ['ยกเลิกคำสั่งซื้อ', orderId], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
      // 3. ถ้าเดิมเป็น "รอพนักงานรับคำสั่งซื้อ" ให้บวก coins คืน
      if (order.Status === 'รอพนักงานรับคำสั่งซื้อ' || (order.Status === 'รอการชำระเงิน' && (order.payby === 'coins' || order.payby === 'coins_and_promptpay'))) {
        db.query('UPDATE users SET coins = coins + ? WHERE UserID = ?', [returnCoins, userId], (err3) => {
          if (err3) return res.status(500).json({ success: false, message: 'คืน coins ไม่สำเร็จ' });

          // 4. คืน stock สินค้าแต่ละชิ้น
          let products = [];
          try {
            products = JSON.parse(order.Product);
          } catch (e) {
            return res.status(500).json({ success: false, message: 'ข้อมูลสินค้าไม่ถูกต้อง' });
          }

          // ใช้ Promise เพื่อรอคืน stock ทุกชิ้น
          const updateStockTasks = products.map(item => {
            return new Promise((resolve, reject) => {
              db.query(
                'UPDATE product SET Product_count = Product_count + ? WHERE Product_id = ?',
                [item.quantity, item.product_id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });

          Promise.all(updateStockTasks)
            .then(() => {
              return res.json({ success: true, message: 'ยกเลิกคำสั่งซื้อ คืน coins และ stock แล้ว' });
            })
            .catch(() => {
              return res.json({ success: true, message: 'ยกเลิกคำสั่งซื้อและคืน coins แล้ว (แต่คืน stock บางชิ้นไม่สำเร็จ)' });
            });
        });
      } else {
        return res.json({ success: true, message: 'ยกเลิกคำสั่งซื้อแล้ว' });
      }
    });
  });
});
// Endpoint to get user's coins
app.get('/api/users/coins/:userId', (req, res) => {
  const userId = req.params.userId;
  db.query("SELECT coins FROM users WHERE UserID = ?", [userId], (error, results) => {
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ coins: results[0].coins });
  });
});

// Endpoint to create an order
app.post('/api/order', (req, res) => {
  const { userId, products, address, total, totalAfterCoins, order_date, status,payby } = req.body;

  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();

  // STEP 1: นับจำนวน order ในวันนี้เพื่อสร้าง orderId
  db.query("SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(order_date) = CURDATE()", (err, results) => {
    if (err) {
      console.error("❌ Error generating order ID:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้าง Order ID" });
    }

    const orderCount = results[0].orderCount + 1;
    const orderId = `LSV-${day}${month}${year}-${orderCount}`;

    // STEP 2: ตรวจสอบว่าเหรียญพอไหม
    db.query("SELECT coins FROM users WHERE UserID = ?", [userId], (err, result) => {
      if (err) {
        console.error("❌ SQL Error (SELECT users):", err);
        return res.status(500).json({ error: err.message });
      }

      if (!result.length || result[0].coins < total) {
        return res.status(400).json({ message: "เหรียญไม่พอชำระเงิน" });
      }

      // STEP 3: สร้างคำสั่งซื้อ
      db.query(
        "INSERT INTO orders (OrderID, UserID, Product, Address, Total, totalAfterCoins, order_date, Status,payby) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?,?)",
        [orderId, userId, JSON.stringify(products), JSON.stringify(address), total, totalAfterCoins, status, payby],
        (error) => {
          if (error) {
            console.error("❌ SQL Error (INSERT orders):", error);
            return res.status(500).json({ message: error.message });
          }

          // STEP 4: หักเหรียญจากผู้ใช้
          db.query("UPDATE users SET coins = coins - ? WHERE UserID = ?", [total, userId], (err) => {
            if (err) {
              console.error("❌ SQL Error (UPDATE users):", err);
              return res.status(500).json({ error: err.message });
            }

            // STEP 5: ลบสินค้าในตะกร้า
            db.query("DELETE FROM carts WHERE UserID = ?", [userId], (err) => {
              if (err) {
                console.error("❌ SQL Error (DELETE carts):", err);
                return res.status(500).json({ error: err.message });
              }

              // STEP 6: อัปเดตจำนวนสินค้าในสต๊อก
              function updateStock(index) {
                if (index >= products.length) {
                  return res.json({ message: "ชำระเงินสำเร็จ!", orderId });
                }

                const product = products[index];
                const { product_id, quantity } = product;

                db.query(
                  'UPDATE product SET Product_count = Product_count - ? WHERE Product_id = ? AND Product_status = ?',
                  [product.quantity, product.product_id, 'in-stock'],
                  (err) => {
                    if (err) {
                      console.error("❌ SQL Error (UPDATE product count):", err);
                      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตสินค้า" });
                    }

                    updateStock(index + 1); // ถัดไป
                  }
                );
              }

              updateStock(0); // เริ่มต้น
            });
          });
        }
      );
    });
  });
});

app.get('/api/addresses/:userId', (req, res) => {
  const userId = req.params.userId;

  db.query(
    "SELECT * FROM address WHERE UserID = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("❌ SQL Error (address):", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
});
// Body: { Product_id, UserID }
app.post('/api/carts/check', (req, res) => {
  const { Product_id, UserID } = req.body;

  const sql = 'SELECT quantity FROM carts WHERE Product_id = ? AND UserID = ?';
  db.query(sql, [Product_id, UserID], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length > 0) {
      res.json({ exists: true, quantity: results[0].quantity });
    } else {
      res.json({ exists: false });
    }
  });
});

app.post('/api/addresses/:userId', (req, res) => {
  const userId = req.params.userId;
  const {
    firstName,
    lastName,
    email, // หากไม่ต้องใช้เก็บในตาราง ก็ไม่ต้องบันทึก
    phone,
    address,
    province,
    district,
    sub_district,
    postal
  } = req.body;
  ////console.log("Received data:", req.body); // Log the received data

  // ค่าที่อยู่เริ่มต้นหรือไม่


  const sql = `
    INSERT INTO address (
      UserID, firstName, lastName, telephone,
      address, province, district, sub_district,
      postal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId, firstName, lastName, phone,
    address, province, district, sub_district,
    postal
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Error inserting address:", err);
      return res.status(500).json({ error: "Insert failed" });
    }

    // สร้าง object สำหรับตอบกลับ
    const newAddress = {
      addressID: result.insertId,
      UserID: userId,
      firstName,
      lastName,
      telephone: phone,
      address,
      province,
      district,
      sub_district,
      postal
    };

    res.status(201).json(newAddress);
  });
});


app.post('/api/promptpay', (req, res) => {
  const { userId, products, address, total, totalAfterCoins, order_date, status, payby } = req.body;
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();
  
  db.query(
    "SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(order_date) = CURDATE()",
    (err, results) => {
      if (err) {
        console.error("Error generating order ID:", err);
        return res.status(500).json({ error: "Failed to generate order ID" });
      }
      
      const orderCount = results[0].orderCount + 1; // Increment to get the current order number
      const orderId = `LSV-${day}${month}${year}-${orderCount}`;

  
  db.query(
    "INSERT INTO orders (OrderID, UserID, Product, Address, Total, totalAfterCoins, order_date, Status, payby) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)",
    [orderId, userId, JSON.stringify(products), JSON.stringify(address), total, totalAfterCoins, status, payby],
  
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      
      db.query("DELETE FROM carts WHERE UserID = ?", [userId], (err) => {
        if (err) {
          console.error("❌ SQL Error (DELETE carts):", err);
          return res.status(500).json({ error: err.message });
        }

       
        res.json({ message: "ชำระเงินสำเร็จ!", orderId });
      }
    );}
  );
});

});
app.post('/api/coins_and_promptpay', (req, res) => {
  const { userId, products, address, total, coins, totalAfterCoins, order_date, status,payby } = req.body;

  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month starts from 0
  const year = date.getFullYear();

  // Step 1: สร้างเลข Order ID
  db.query("SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(order_date) = CURDATE()", (err, results) => {
    if (err) {
      console.error("❌ Error generating order ID:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้าง Order ID" });
    }

    const orderCount = results[0].orderCount + 1;
    const orderId = `LSV-${day}${month}${year}-${orderCount}`;

    // Step 2: สร้างคำสั่งซื้อ
    db.query(
      "INSERT INTO orders (OrderID, UserID, Product, Address, Total, totalAfterCoins, order_date, Status,payby) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?,?)",
      [orderId, userId, JSON.stringify(products), JSON.stringify(address), total, totalAfterCoins, status, payby],
      (error) => {
        if (error) {
          console.error("❌ SQL Error (INSERT orders):", error);
          return res.status(500).json({ message: error.message });
        }

        // Step 3: หัก coins
        db.query("UPDATE users SET coins = coins - ? WHERE UserID = ?", [coins, userId], (err) => {
          if (err) {
            console.error("❌ SQL Error (UPDATE coins):", err);
            return res.status(500).json({ error: err.message });
          }

          // Step 4: ลบตะกร้าสินค้า
          db.query("DELETE FROM carts WHERE UserID = ?", [userId], (err) => {
            if (err) {
              console.error("❌ SQL Error (DELETE carts):", err);
              return res.status(500).json({ error: err.message });
            }

            // Step 5: อัปเดตจำนวนสินค้าแต่ละตัว
            function updateProductCount(index) {
              if (index >= products.length) {
                // เสร็จเรียบร้อยทั้งหมด
                return res.json({ message: "ชำระเงินสำเร็จ!", orderId });
              }

              const product = products[index];
              const { product_id, quantity } = product;

              db.query(
                'UPDATE product SET Product_count = Product_count - ? WHERE Product_id = ? AND Product_status = ?',
                [product.quantity, product.product_id, 'in-stock'],
                (err) => {
                  if (err) {
                    console.error("❌ SQL Error (UPDATE product count):", err);
                    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตสินค้า" });
                  }

                  // ดำเนินการต่อกับสินค้าชิ้นถัดไป
                  updateProductCount(index + 1);
                }
              );
            }

            // เริ่มอัปเดตสินค้า
            updateProductCount(0);
          });
        });
      }
    );
  });
});




/*app.post("/api/order", (req, res) => {
  const { userId, products, address, total } = req.body;
  const orderId = uuidv4().split('-')[0];



  db.query("SELECT coins FROM users WHERE UserID = ?", [userId], (err, result) => {
    if (err) {
      console.error("❌ SQL Error (SELECT users):", err);
      return res.status(500).json({ error: err.message });
    }

    if (!result.length || result[0].coins < total) {
      return res.status(400).json({ message: "เหรียญไม่พอชำระเงิน" });
    }

    const formattedProducts = products.map(item => ({
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
    }));

    const insertQuery = "INSERT INTO orders (OrderID, UserID, Product, Address, Total) VALUES (?, ?, ?, ?, ?)";
   

    db.query(insertQuery, [orderId, userId, JSON.stringify(formattedProducts), JSON.stringify(address), total], (err) => {
      if (err) {
        console.error("❌ SQL Error (INSERT orders):", err);
        return res.status(500).json({ error: err.message });
      }

      db.query("UPDATE users SET coins = coins - ? WHERE UserID = ?", [total, userId], (err) => {
        if (err) {
          console.error("❌ SQL Error (UPDATE users):", err);
          return res.status(500).json({ error: err.message });
        }

        db.query("DELETE FROM carts WHERE UserID = ?", [userId], (err) => {
          if (err) {
            console.error("❌ SQL Error (DELETE carts):", err);
            return res.status(500).json({ error: err.message });
          }

         
          res.json({ message: "ชำระเงินสำเร็จ!", orderId });
        });
      });
    });
  });
});*/
app.post("/ordersDate", async (req, res) => {
  const { products, order_date } = req.body;

  if (!products || products.length === 0) {
      return res.status(400).json({ error: "No products in order" });
  }

  try {
      const orderQuery = "INSERT INTO orders (order_date) VALUES (?)";
      const [orderResult] = await db.execute(orderQuery, [order_date]);

      const orderId = orderResult.insertId;

      for (const product of products) {
          const itemQuery = `
              INSERT INTO order_items (order_id, product_id, quantity) 
              VALUES (?, ?, ?)
          `;
          await db.execute(itemQuery, [orderId, product.product_id, product.quantity]);
      }

      res.status(201).json({ message: "Order placed", order_id: orderId });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get('/orders', (req, res) => {
  const { userID } = req.query;
  let query = `
      SELECT OrderID, Product, order_date, Total,totalAfterCoins, Status, Post_Tracking
      FROM orders
  `;
  
  const params = [];
  
  // ถ้ามีการส่ง userID เข้ามา ให้เพิ่มเงื่อนไขใน Query
  if (userID) {
      query += ' WHERE UserID = ?';
      params.push(userID);
  }

  db.query(query, params, (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

      const formattedResults = results.map(order => ({
          OrderID: order.OrderID,
          Product: JSON.parse(order.Product).map(p => `${p.name} x ${p.quantity}`).join( '</br>'),
          Product_id: JSON.parse(order.Product).map(p => `${p.product_id}`),
          OrderDate: order.order_date,
          Price: order.Total,
          AfterCoins: order.totalAfterCoins,
          Status: order.Status,
          PostTracking: order.Post_Tracking || '-'
      }));
      
      res.json(formattedResults);
  });
});
// ค้นหาสินค้าโดยชื่อ
app.get('/api/search', (req, res) => {
  const search = req.query.q;

  if (!search) return res.status(400).json({ error: 'Missing search query' });

  const sql = `
    SELECT * FROM product 
    WHERE Product_name LIKE ? OR Product_description LIKE ?
  `;
  const keyword = `%${search}%`;

  db.query(sql, [keyword, keyword], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});
app.get('/api/order/:orderId', (req, res) => {
  const orderId = req.params.orderId;

  db.query("SELECT * FROM orders WHERE OrderID = ?", [orderId], (err, orderResults) => {
    if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดจากฐานข้อมูล', detail: err });
    if (orderResults.length === 0) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });

    const order = orderResults[0];
    let products = [];

    try {
      products = JSON.parse(order.Product);
    } catch (jsonErr) {
      return res.status(500).json({ error: 'Product JSON ไม่ถูกต้อง', detail: jsonErr });
    }

    const productIds = products.map(p => p.product_id);

    const sql = `SELECT * FROM product WHERE Product_id IN (${productIds.map(() => '?').join(',')})`;
    db.query(sql, productIds, (err2, productDetails) => {
      if (err2) return res.status(500).json({ error: 'เกิดข้อผิดพลาดตอนดึงสินค้า', detail: err2 });

      const fullProductData = products.map(p => {
        const info = productDetails.find(pd => pd.Product_id === p.product_id);
        return {
          ...info,
          quantity: p.quantity
        };
      });

      // ✅ แก้ address
      let addressData = {};
      try {
        addressData = JSON.parse(order.Address);
      } catch (jsonErr2) {
        return res.status(500).json({ error: 'Address JSON ไม่ถูกต้อง', detail: jsonErr2 });
      }

      let formattedAddress = {
        name: addressData.name || `${addressData.firstName || ''} ${addressData.lastName || ''}`.trim(),
        phone: addressData.phone || '',
        full_address: addressData.full_address || `${addressData.address || ''} ${addressData.sub_district || ''} ${addressData.district || ''} ${addressData.province || ''} ${addressData.postal || ''}`.trim(),
        full: addressData.full || `${addressData.address || ''} ${addressData.sub_district || ''} ${addressData.district || ''} ${addressData.province || ''} ${addressData.postal || ''}`.trim()
      };

      res.json({
        orderId: order.OrderID,
        status: order.Status,
        orderDate: order.order_date,
        total: order.Total,
        totalAfterCoins: order.totalAfterCoins,
        postTracking: order.Post_Tracking,
        address: formattedAddress,
        products: fullProductData
      });
    });
  });
});


app.post("/api/update-order-status", (req, res) => {
  const { orderId, tracking, status, userId } = req.body; // เพิ่ม userId จาก frontend

  if (!orderId || !status) {
    return res.json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
  }

  // ตรวจสอบหากสถานะเป็น "พนักงานจัดส่ง" ต้องกรอกเลขพัสดุ
  if (status === "พนักงานจัดส่ง" && (!tracking || tracking.trim() === "")) {
    return res.json({ success: false, message: "กรุณากรอกเลขพัสดุ" });
  }

  // 1. ดึงข้อมูลเดิมก่อนอัปเดต
  db.query('SELECT Status, Post_Tracking FROM orders WHERE OrderID = ?', [orderId], (err, oldResults) => {
    if (err || oldResults.length === 0) {
      return res.json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
    }
    const oldData = oldResults[0];

    // 2. อัปเดตข้อมูล
    const sql = `UPDATE orders SET Status = ?, Post_Tracking = ? WHERE OrderID = ?`;
    db.query(sql, [status, tracking || null, orderId], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.json({ success: false, message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" });
      }

      // 3. เก็บ log
      const logSql = `
        INSERT INTO order_edit_logs (order_id, user_id, action, old_data, new_data)
        VALUES (?, ?, ?, ?, ?)
      `;
      const logValues = [
        orderId,
        userId || 'unknown', // รับ userId จาก frontend หรือ session
        'update-status',
        JSON.stringify(oldData),
        JSON.stringify({ Status: status, Post_Tracking: tracking })
      ];
      db.query(logSql, logValues, (logErr) => {
        if (logErr) console.error('Error logging order edit:', logErr);
        res.json({ success: true });
      });
    });
  });
});
app.get('/api/order-edit-logs', (req, res) => {
  const { orderId } = req.query;
  let sql = `SELECT * FROM order_edit_logs`;
  const params = [];
  if (orderId) {
    sql += ` WHERE order_id = ?`;
    params.push(orderId);
  }
  sql += ` ORDER BY edited_at DESC`;
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch logs' });
    res.json(results);
  });
});
app.post("/api/add-favorite", (req, res) => {
  const { userId, novelId } = req.body;

  if (!userId || !novelId) {
    return res.json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
  }

  // ตรวจสอบว่ามีในรายการโปรดอยู่แล้วหรือยัง
  const checkSql = "SELECT * FROM favorites_novel WHERE UserId = ? AND novelId = ?";
  db.query(checkSql, [userId, novelId], (err, result) => {
    if (err) return res.json({ success: false, message: "เกิดข้อผิดพลาด" });

    if (result.length > 0) {
      return res.json({ success: false, message: "มีในรายการโปรดแล้ว" });
    }

    // เพิ่มลง favorites_novel
    const insertSql = "INSERT INTO favorites_novel (UserId, novelId) VALUES (?, ?)";
    db.query(insertSql, [userId, novelId], (err2) => {
      if (err2) return res.json({ success: false, message: "ไม่สามารถเพิ่มได้" });

      res.json({ success: true });
    });
  });
});

app.put('/products/:id', upload.single('productImage'), (req, res) => {
  const productId = req.params.id;
  const userId = req.body.userId || req.session.userId || 'unknown'; // ดึง userId จาก session หรือ body
  const {
    Product_name, Product_price, Product_count, Product_type, Product_status, Product_description,
  } = req.body;
  const newUploadedFile = req.file;

  // Function to delete a file
  const deleteFile = (filePath) => {
    if (filePath) {
      const fullPath = path.join(__dirname, '../Server/', filePath);
      fs.unlink(fullPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error(`Error deleting file ${fullPath}:`, err);
        }
      });
    }
  };

  // Validate productId
  if (!productId || isNaN(productId)) {
    if (newUploadedFile) deleteFile(path.join('uploads/products', newUploadedFile.filename));
    return res.status(400).json({ error: 'Invalid Product ID' });
  }

  // Query to get the current product image
  db.query('SELECT * FROM product WHERE Product_id = ?', [productId], (selectError, selectResults) => {
    if (selectError) {
      if (newUploadedFile) deleteFile(path.join('uploads/products', newUploadedFile.filename));
      return res.status(500).json({ error: 'Failed to retrieve current product data' });
    }

    if (selectResults.length === 0) {
      if (newUploadedFile) deleteFile(path.join('uploads/products', newUploadedFile.filename));
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldData = selectResults[0];
    const currentImagePath = oldData.Product_img || null;
    const newImagePath = newUploadedFile ? `uploads/products/${newUploadedFile.filename}` : currentImagePath;

    // Query to update the product
    const updateSql = `
      UPDATE product SET
        Product_name = ?, Product_price = ?, Product_count = ?,
        Product_type = ?, Product_img = ?, Product_description = ?, Product_status = ?
      WHERE Product_id = ?
    `;
    const updateValues = [
      Product_name, Product_price, Product_count, Product_type,
      newImagePath, Product_description, Product_status, productId,
    ];

    db.query(updateSql, updateValues, (updateError, updateResult) => {
      if (updateError) {
        if (newUploadedFile) deleteFile(path.join('uploads/products', newUploadedFile.filename));
        return res.status(500).json({ error: 'Failed to update product' });
      }

      // --- เพิ่มบันทึก log ---
      const logSql = `
        INSERT INTO product_edit_logs (product_id, user_id, action, old_data, new_data)
        VALUES (?, ?, ?, ?, ?)
      `;
      const logValues = [
        productId,
        userId,
        'update',
        JSON.stringify(oldData),
        JSON.stringify({
          Product_name, Product_price, Product_count, Product_type,
          Product_img: newImagePath, Product_description, Product_status
        })
      ];
      db.query(logSql, logValues, (logErr) => {
        if (logErr) console.error('Error logging product edit:', logErr);
        // ไม่ต้อง return error log ให้ user
        res.json({ message: 'Product updated successfully' });
      });
      // --- จบ log ---

      // Delete the old image if a new one was uploaded
      if (newUploadedFile && currentImagePath && currentImagePath !== newImagePath) {
        deleteFile(currentImagePath);
      }
    });
  });
});
app.get('/api/product-edit-logs', (req, res) => {
  const { productId } = req.query; // optional filter
  let sql = `SELECT * FROM product_edit_logs`;
  const params = [];
  if (productId) {
    sql += ` WHERE product_id = ?`;
    params.push(productId);
  }
  sql += ` ORDER BY edited_at DESC`;
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch logs' });
    res.json(results);
  });
});
app.post('/updateProductImage', upload.single('image'), (req, res) => {
  const { productId } = req.body;
  const newImage = req.file ? `uploads/${req.file.filename}` : null;
 ////console.log(productId);
  if (!productId || !newImage) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const query = `UPDATE product SET Product_img = ? WHERE Product_id = ?`;
  db.query(query, [newImage, productId], (err, result) => {
      if (err) {
          console.error('Error updating product image:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, message: 'Product image updated successfully', newImage });
  });
});

app.get('/adminorders', (req, res) => {
  const query = `
      SELECT *
      FROM orders
      ORDER BY order_date DESC
  `;

  db.query(query, (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
          return res.json({ message: "ไม่มีคำสั่งซื้อ" });
      }

      const formattedResults = results.map(order => {
          let addressObj;
          try {
              addressObj = JSON.parse(order.Address); // แปลง Address เป็น JSON object
              if (typeof addressObj !== "object") throw new Error("Not a JSON object");
          } catch (error) {
              addressObj = { firstName: "", lastName: "", address: "", sub_district: "", district: "", province: "", postal: "", phone: "" };
          }


          return {
              OrderID: order.OrderID,
              UserID: order.UserID,
              Product: JSON.parse(order.Product).map(p => `${p.name} x ${p.quantity}`).join('<br>'),
              Address: JSON.parse(order.Address),
              Product_id: JSON.parse(order.Product).map(p => `${p.product_id}`),
              OrderDate: order.order_date,
              Price: order.Total,
              AfterCoins: order.totalAfterCoins,
              Status: order.Status,
              is_read: order.is_read,
              PostTracking: order.Post_Tracking || '-'
          };
      });

      res.json(formattedResults);
  });
});

app.get('/adminorders/month/:month/year/:year', (req, res) => {
  const { month, year } = req.params;

  const query = `
      SELECT *
      FROM orders
      WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?
      ORDER BY order_date DESC
  `;

  db.query(query, [month, year], (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
          return res.json({ message: "ไม่มีคำสั่งซื้อในเดือนและปีที่เลือก" });
      }

      const formattedResults = results.map(order => {
          let addressObj;

          try {
              addressObj = JSON.parse(order.Address);
              if (typeof addressObj !== "object") throw new Error("Not a JSON object");
          } catch (error) {
              addressObj = { firstName: "", lastName: "", address: "", sub_district: "", district: "", province: "", postal: "", phone: "" };
          }

          return {
              OrderID: order.OrderID,
              UserID: order.UserID,
              Product: JSON.parse(order.Product).map(p => `${p.name} x ${p.quantity}`).join('<br>'),
              Address: JSON.parse(order.Address),
              OrderDate: order.order_date,
              Price: order.Total,
              AfterCoins: order.totalAfterCoins,
              Status: order.Status,
              is_read: order.is_read,
              PostTracking: order.Post_Tracking || '-'
          };
      });

      res.json(formattedResults);
  });
});
app.post('/updateProduct', (req, res) => {
  const { productId, columnName, newValue } = req.body;
  const allowedColumns = ['Product_name', 'Product_price', 'Product_count', 'Product_type', 'Product_description', 'Product_status'];
  
  if (!allowedColumns.includes(columnName)) {
      return res.status(400).json({ success: false, message: 'Invalid column name' });
  }
  
  const query = `UPDATE product SET ?? = ? WHERE Product_id = ?`;
  db.query(query, [columnName, newValue, productId], (err, result) => {
      if (err) {
          console.error('Error updating product:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, message: 'Product updated successfully' });
  });
});


// อัปเดต Post Tracking
app.put('/orders/:orderID/post-tracking', (req, res) => {
  const { orderID } = req.params;
  const { PostTracking } = req.body;

  const query = `UPDATE orders SET Post_Tracking = ? WHERE OrderID = ?`;
  db.query(query, [PostTracking, orderID], (err) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Post Tracking updated successfully' });
  });
});

// อัปเดต Status
app.put('/orders/:orderID/status', (req, res) => {
  const { orderID } = req.params;
  const { Status } = req.body;

  const query = `UPDATE orders SET Status = ? WHERE OrderID = ?`;
  db.query(query, [Status, orderID], (err) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Status updated successfully' });
  });
});

app.get('/accesscontrol', (req, res) => {
  const query = `
      SELECT *
      FROM users
  `;

  db.query(query, (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

      const formattedResults = results.map(order => {
        
        return {
            UserID: users.UserID,
            username: JSON.parse(order.Product).map(p => `${p.name} x ${p.quantity}`).join('<br>'),
            Address: addressObj,
            OrderDate: order.order_date,
            Price: order.Total,
            Status: order.Status,
            PostTracking: order.Post_Tracking || '-'
        };
    });

      res.json(formattedResults);
  });
});


app.post('/updatecart', (req, res) => {
  const { UserID, Product_id, quantity } = req.body;

  if (!UserID || !Product_id || quantity <= 0) {
      return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง" });
  }

  // ตรวจสอบว่ามีสินค้านี้ในตะกร้าอยู่แล้วหรือไม่
  db.query(
      "SELECT * FROM carts WHERE UserID = ? AND Product_id = ?",
      [UserID, Product_id],
      (err, results) => { // callback function
          if (err) {
              console.error(err);
              return res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
          }

          if (results.length > 0) {
              // ถ้ามีสินค้าแล้ว ให้เพิ่มจำนวนสินค้า
              db.query(
                  "UPDATE carts SET quantity = quantity + ? WHERE UserID = ? AND Product_id = ?",
                  [quantity, UserID, Product_id],
                  (err) => { // callback function
                      if (err) {
                          console.error(err);
                          return res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
                      }
                      return res.json({ message: "สินค้าเพิ่มลงในตะกร้าแล้ว!" });
                  }
              );
          } else {
              // ถ้ายังไม่มี ให้เพิ่มสินค้าใหม่ลงในตะกร้า
              db.query(
                  "INSERT INTO carts (UserID, Product_id, quantity) VALUES (?, ?, ?)",
                  [UserID, Product_id, quantity],
                  (err) => { // callback function
                      if (err) {
                          console.error(err);
                          return res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
                      }
                      return res.json({ message: "สินค้าเพิ่มลงในตะกร้าแล้ว!" });
                  }
              );
          }
      }
  );
});


app.get('/api/cartcount/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = "SELECT SUM(quantity) AS count FROM carts WHERE UserID = ?";
  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error("Error getting cart count:", err);
          res.status(500).json({ error: "Error getting cart count" });
      } else {
          const count = results[0]?.count || 0; // Handle null case
          res.json({ count });
      }
  });
});
// API endpoint to update cart item quantity
app.put('/api/cart/:productId', async (req, res) => {
  const productId = req.params.productId;
  const quantityChange = req.body.quantityChange;

  try {
      // 1. Get the current quantity from the database
      const [rows] = await db.execute('SELECT Item_quantity FROM carts WHERE Product_id = ?', [productId]);
      if (rows.length === 0) {
          return res.status(404).json({ error: 'Product not found in cart' });
      }
      const currentQuantity = rows[0].Item_quantity;

      // 2. Calculate the new quantity
      const newQuantity = currentQuantity + quantityChange;

      // 3. Update the database
      await db.execute('UPDATE carts SET Item_quantity = ? WHERE Product_id = ?', [newQuantity, productId]);

      res.json({ message: 'Quantity updated successfully' });
  } catch (error) {
      console.error("Error updating quantity in database:", error);
      res.status(500).json({ error: 'Failed to update quantity' });
  }
});

// API endpoint to remove item from cart
app.delete('/api/cart/:productId', async (req, res) => {
  const productId = req.params.productId;

  try {
      await db.execute('DELETE FROM carts WHERE Product_id = ?', [productId]);
      res.json({ message: 'Item removed from cart successfully' });
  } catch (error) {
      console.error("Error removing from cart in database:", error);
      res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

app.get('/users', (req, res) => {
  db.query(`
    SELECT * FROM users`, (err, results) => {
      if (err) {
          console.error('MySQL ERROR:', err);
          return res.status(500).json(err); // ส่ง object ที่ frontend เข้าใจได้
      }
      res.json(results);
  });
});

app.get('/api/dashboard-data', (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM orders) AS totalOrders,
      (SELECT IFNULL(SUM(total), 0) 
       FROM orders 
       WHERE status IN ('พนักงานรับคำสั่งซื้อ', 'รอพนักงานรับคำสั่งซื้อ','พนักงานจัดส่ง')) AS totalRevenue,
      (SELECT COUNT(*) FROM orders WHERE status = 'ยกเลิกคำสั่งซื้อ') AS canceledOrders
  `;
  db.query(sql, (err, result) => {
    if (err) return res.json({ error: err });
    res.json({ stats: result[0] });
  });
});
app.get('/api/monthly-data', (req, res) => {
  const { month, year } = req.query;
  
  // Validate input
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  // Create a connection to the database
  const connection = mysql.createConnection(dbConfig);

  // Query to get the total number of orders, total revenue, and canceled orders for a specific month/year
  connection.query(
    `SELECT COUNT(*) AS totalOrders, 
            SUM(totalPrice) AS totalRevenue,
            SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) AS canceledOrders
     FROM orders
     WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?`,
    [month, year],
    (error, orderData) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching order data' });
      }

      // Query to get novel data (novel information with the number of chapters)
      connection.query(
        `SELECT n.id, n.title, n.cover_image, n.status, COUNT(c.id) AS chapterCount
         FROM novels n
         LEFT JOIN chapters c ON c.novel_id = n.id
         GROUP BY n.id`,
        (error, novelData) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error fetching novel data' });
          }

          // Query to get product data
          connection.query(
            `SELECT id, Product_name, Product_price, Product_count, Product_img
             FROM product`,
            (error, productData) => {
              if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Error fetching product data' });
              }

              // Send the collected data as JSON
              res.json({
                orders: orderData[0], // Only take the first result (there's only one row)
                novels: novelData,
                products: productData
              });

              // Close the connection after all queries are done
              connection.end();
            }
          );
        }
      );
    }
  );
});

app.get('/api/monthly-revenue', (req, res) => {
  const query = `
    SELECT
        DATE_FORMAT(order_date, '%Y-%m') AS month,
        SUM(Total) AS total_revenue
    FROM orders
    WHERE Status IN ('รอพนักงานรับคำสั่งซื้อ', 'พนักงานรับคำสั่งซื้อ', 'พนักงานจัดส่ง')
    GROUP BY month
    ORDER BY month DESC;
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.json(results); // Send back the result as JSON
  });
});

// รายได้รวมต่อเดือนสำหรับ pie chart
/*app.get('/api/monthly-data', (req, res) => {
  const { month, year } = req.query;
  const sql = `
      SELECT
          (SELECT IFNULL(SUM(total), 0) FROM orders WHERE MONTH(date) = ? AND YEAR(date) = ?) AS totalRevenue
  `;
  db.query(sql, [month, year], (err, result) => {
      if (err) return res.json({ error: err });
      res.json({ orders: result[0], novels: [] }); // แทรกรายการ novels ด้วยถ้าต้องการ
  });
});
*/
// Update user
app.put('/users/:UserID', (req, res) => {
  const { UserID } = req.params;
  const { Roles, coins } = req.body;

  // ตรวจสอบค่า Roles และ coins ว่ามีค่าหรือไม่
  if (!UserID || !Roles || coins === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = 'UPDATE users SET Roles = ?, coins = ? WHERE UserID = ?'; // ✅ ลบ USING ออก
  db.query(sql, [Roles, coins, UserID], (err, result) => {
      if (err) {
          console.error("Database Error:", err);
          return res.status(500).json({ error: "Database error", details: err });
      }
      res.json({ message: "User updated successfully" });
  });
});
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
      // ใช้ con.promise() เพื่อทำงานกับ Promise และ async/await
      const [rows] = await db.promise().query('SELECT * FROM product WHERE Product_id = ?', [productId]);

      if (rows.length > 0) {
          res.json(rows[0]);
      } else {
          res.status(404).json({ message: 'Product not found' });
      }
  } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.post('/products', upload.single('productImage'), (req, res) => {
  const {
      Product_name, Product_price, Product_count, Product_type, Product_status, Product_description
  } = req.body;
  const newUploadedFile = req.file;

   const deleteFile = (filePath) => { /* ... (เหมือนด้านบน) ... */ }; // ควรแยกเป็น utility function

  let imagePathRelative = null;
  if (newUploadedFile) {
      imagePathRelative = path.join('uploads/products', newUploadedFile.filename).replace(/\\/g, "/");
      ////console.log("Image received for add:", imagePathRelative);
  } else {
      ////console.log("No image received for add.");
      // return res.status(400).json({ error: 'Product image is required' }); // ถ้าบังคับใส่รูป
  }

   if (!Product_name || !Product_price || !Product_count || !Product_type || !Product_status) {
      if (newUploadedFile) deleteFile(imagePathRelative);
      return res.status(400).json({ error: 'Missing required product fields' });
  }

  const sql = `INSERT INTO product (Product_name, Product_price, Product_count, Product_type, Product_img, Product_description, Product_status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const values = [Product_name, Product_price, Product_count, Product_type, imagePathRelative, Product_description, Product_status];

  db.query(sql, values, (error, result) => {
      if (error) {
          console.error("Database Insert Error:", error);
          if (newUploadedFile) deleteFile(imagePathRelative); // ลบไฟล์ถ้า Insert ไม่สำเร็จ
          return res.status(500).json({ error: 'Failed to add product', details: error.message });
      }
      res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
  });
});


app.put('/usersProfile/:UserID', (req, res) => {
  const { UserID } = req.params;
  const { username, name, email, address, telephone } = req.body;

  // ดึงข้อมูลเดิมจากฐานข้อมูล
  db.query('SELECT username, name, email, address, telephone FROM users JOIN address USING (UserID) WHERE UserID = ?', 
    [UserID], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });

      const currentData = results[0];

      // ใช้ค่าปัจจุบันหากไม่มีการส่งค่ามาใหม่
      const updatedUsername = username ?? currentData.username;
      const updatedName = name ?? currentData.name;
      const updatedEmail = email ?? currentData.email;
      const updatedAddress = address ?? currentData.address;
      const updatedTelephone = telephone ?? currentData.telephone;

      // อัปเดตข้อมูลเฉพาะฟิลด์ที่เปลี่ยนแปลง
      db.query('UPDATE users JOIN address USING (UserID) SET username=?, name=?, email=?, address=?, telephone=? WHERE UserID=?', 
        [updatedUsername, updatedName, updatedEmail, updatedAddress, updatedTelephone, UserID], 
        (err, result) => {
          if (err) return res.status(500).send(err);
          res.json({ message: 'User updated' });
        }
      );
  });
});

// Delete user
app.delete('/users/:UserID', (req, res) => {
  const { UserID } = req.params;

  const queries = [
      'DELETE FROM topup WHERE UserID = ?',
      'DELETE FROM carts WHERE UserID = ?',
      'DELETE FROM address WHERE UserID = ?',
      'DELETE FROM users WHERE UserID = ?'
  ];

  let completedQueries = 0;

  queries.forEach(query => {
    
      db.query(query, [UserID], (err, result) => {
          if (err) {
              console.error('Error deleting user:', err);
              return res.status(500).json({ error: err.message });
          }

          completedQueries++;

          // ถ้าทำครบทุกคำสั่งแล้ว ให้ส่ง response กลับ
          if (completedQueries === queries.length) {
              res.json({ message: 'User and related data deleted successfully' });
          }
      });
  });
});
// GET member by id
app.get('/api/members/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM member WHERE ID = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

// UPDATE member
app.put('/api/members/:id', upload.fields([
  { name: 'iconimg', maxCount: 1 },
  { name: 'img', maxCount: 1 }
]), (req, res) => {
  const id = req.params.id;
  const {
      name, description, x, tiktok, youtube, bgColor,
      'iconimg-old': iconimgOld,
      'img-old': imgOld
  } = req.body;

  let iconimg = iconimgOld || '';
  let img = imgOld || '';

  if (req.files['iconimg'] && req.files['iconimg'][0]) {
    iconimg = `/uploads/${req.files['iconimg'][0].filename}`;
  }
  if (req.files['img'] && req.files['img'][0]) {
    img = `/uploads/${req.files['img'][0].filename}`;
  }

  // ลบ ../Server ออกถ้ามี
  iconimg = iconimg ? iconimg.replace(/(\.\.\/Server)/g, '') : '';
  img = img ? img.replace(/(\.\.\/Server)/g, '') : '';

  const sql = `
      UPDATE member SET
          Name = ?, description = ?, X = ?, Tiktok = ?, Youtube = ?,
          iconimg = ?, img = ?, bgColor = ?
      WHERE ID = ?
  `;
  db.query(sql, [name, description, x, tiktok, youtube, iconimg, img, bgColor, id], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Update failed' });
      res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
  });
});
app.put('/api/orders/:orderId/read', (req, res) => {
    const orderId = req.params.orderId;
    //console.log('Marking order as read:', orderId);
    db.query(
        'UPDATE orders SET is_read = 1 WHERE OrderID = ?',
        [orderId],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err });
            res.json({ success: true });
        }
    );
});
app.get('/api/orders/unread-count', (req, res) => {
    // สมมติ status = 'new' หรือ 'unread' คือยังไม่ได้อ่าน
    db.query('SELECT COUNT(*) AS count FROM orders WHERE is_read = 0', (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, count: results[0].count });
    });
});
// DELETE member
app.delete('/api/members/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM member WHERE ID = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Delete failed' });
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    });
});

// CREATE member (ถ้ายังไม่มี)
app.post('/api/members', upload.fields([
    { name: 'iconimg', maxCount: 1 },
    { name: 'img', maxCount: 1 }
]), (req, res) => {
    const {
        name, description, x, tiktok, youtube, bgColor
    } = req.body;
    const iconimg = req.files['iconimg'] ? `/uploads/${req.files['iconimg'][0].filename}` : '';
    const img = req.files['img'] ? `/uploads/${req.files['img'][0].filename}` : '';
    const sql = `
        INSERT INTO member (Name, description, X, Tiktok, Youtube, iconimg, img, bgColor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, description, x, tiktok, youtube, iconimg, img, bgColor], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Insert failed' });
        res.json({ success: true, message: 'เพิ่มข้อมูลสำเร็จ' });
    });
});
/*app.get('/api/monthly-data', (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required.' });
  }

  const ordersQuery = `
    SELECT 
      SUM(Total) AS totalRevenue,
      COUNT(CASE WHEN Status NOT IN ('ยกเลิก', 'รอการชำระเงิน') THEN 1 END) AS totalOrders,
      COUNT(CASE WHEN Status = 'ยกเลิก' THEN 1 END) AS canceledOrders
    FROM orders
    WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?
  `;

  const novelsQuery = `
    SELECT id, title, Count, cover_image, created_at, status
    FROM novels
    WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
  `;

  const productsQuery = `
    SELECT Product_id, Product_name, Product_price, Product_count, Product_img, Product_status
    FROM product
    WHERE Product_status = 'active'
  `;

  db.query(ordersQuery, [month, year], (err, ordersResults) => {
    if (err) {
      console.error('Error fetching orders data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.query(novelsQuery, [month, year], (err, novelsResults) => {
      if (err) {
        console.error('Error fetching novels data:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.query(productsQuery, (err, productsResults) => {
        if (err) {
          console.error('Error fetching products data:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          orders: ordersResults[0],
          novels: novelsResults,
          products: productsResults,
        });
      });
    });
  });
});*/

// เริ่มต้นเซิร์ฟเวอร์
https.createServer(options, app).listen(3001, () => {
  //console.log('HTTPS Server running on port 3001');
});
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(80, () => {
  //console.log('Redirecting HTTP (80) -> HTTPS');
});