//backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.mjs';
import authMiddleware from '../middleware/auth.mjs';

const router = express.Router();


// Admin login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    const admin = await Admin.findOne({ email }).select('+passwordHash');
    if (!admin) {
      console.warn('No admin found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Found admin:', admin._id);
    
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      console.warn('Password mismatch for admin:', admin._id);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Successful login for:', admin._id);
    res.json({ token });

  } catch (error) {
    console.error('Login Error:', {
      error: error.message,
      stack: error.stack,
      input: req.body
    });
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    res.json(req.admin); // Already populated by middleware
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// In auth.mjs
router.get('/nucleus-status', authMiddleware, async (req, res) => {
  try {
    const admins = await Admin.find();
    console.log('Existing Admins:', admins);
    res.json({
      count: admins.length,
      admins: admins.map(a => ({ id: a._id, email: a.email }))
    });
  } catch (error) {
    console.error('Admin Check Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
