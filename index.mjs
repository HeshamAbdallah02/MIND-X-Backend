//backend/index.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './config/cloudinary.mjs';
import authRoutes from './routes/auth.mjs';
import heroRoutes from './routes/hero.mjs';
import eventRoutes from './routes/events.mjs';
import uploadRoutes from './routes/upload.mjs';
import headerRoutes from './routes/header.mjs';
import blogRoutes from './routes/blog.mjs';
import cleanupTempUploads from './scripts/cleanupTempUploads.js';
import brandSettingsRoutes from './routes/brandSettings.mjs';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Add this line to parse JSON request bodies
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use((req, res, next) => {
  if (!process.env.CLOUDINARY_API_KEY) {
    console.error('Cloudinary configuration missing');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Image upload service not configured'
    });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/header', headerRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/settings', brandSettingsRoutes);

setInterval(cleanupTempUploads, 3600000); // 1 hour

app.get('/api/health', (_req, res) => {
  res.json({ message: 'Server is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});