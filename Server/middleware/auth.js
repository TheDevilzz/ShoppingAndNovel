// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'abcd1234'; // เปลี่ยนเป็น secret key ของคุณ

const authMiddleware = (req, res, next) => {
    //console.log("Authorization header:", req.headers.authorization); // Check the header
  
    const token = req.header('Authorization')?.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
  
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        //console.log("Decoded:", decoded); // ตรวจสอบ decoded payload

        // *** ตรวจสอบว่า decoded.user มี UserID หรือไม่ ***
        if (!decoded.user || !decoded.user.UserID) {
            console.error("decoded.user หรือ decoded.user.UserID หายไป:", decoded.user);
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        req.user = decoded.user; // กำหนด req.user จาก decoded.user
        //console.log("req.user in middleware:", req.user);
        next();
    } catch (err) {
      console.error("JWT verification error:", err); // Log the error
      res.status(401).json({ message: 'Token is not valid' });
    }
  };

module.exports = authMiddleware;