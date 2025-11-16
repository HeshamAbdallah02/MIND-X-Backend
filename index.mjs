//backend/index.mjs
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './config/cloudinary.mjs';
import authRoutes from './routes/auth.mjs';
import heroRoutes from './routes/hero.mjs';
import storyHeroRoutes from './routes/storyHero.mjs';
import homeEventRoutes from './routes/homeEvents.mjs'; // Home page upcoming events
import pageEventRoutes from './routes/pageEvents.mjs'; // Events page
import uploadRoutes from './routes/upload.mjs';
import headerRoutes from './routes/header.mjs';
import blogRoutes from './routes/blogs.mjs';
import cleanupTempUploads from './scripts/cleanupTempUploads.js';
import brandSettingsRoutes from './routes/brandSettings.mjs';
import statRoutes from './routes/stats.mjs';
import testimonials from './routes/testimonials.mjs';
import sponsors from './routes/sponsors.mjs';
import awardsRoutes from './routes/awards.mjs';
import timelineRoutes from './routes/timeline.mjs';
import seasonsRoutes from './routes/seasons.mjs';
import ctaRoutes from './routes/cta.mjs';
import formRoutes from './routes/forms.mjs';
import trainingsRoutes from './routes/trainings.mjs';
import trainingHeroRoutes from './routes/trainingHero.mjs';
import trainingCTARoutes from './routes/trainingCTA.mjs';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Add this line to parse JSON request bodies
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

console.log("Server starting...");
console.log("Cloudinary Config:", {
  name: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "exists" : "missing",
  secret: process.env.CLOUDINARY_API_SECRET ? "exists" : "missing"
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
app.use('/api/story-hero', storyHeroRoutes);
app.use('/api/events', homeEventRoutes);        // Home page upcoming events
app.use('/api/page-events', pageEventRoutes);   // Events page featured & past events
app.use('/api/blogs', blogRoutes);
app.use('/api/settings', brandSettingsRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/testimonials', testimonials);
app.use('/api/sponsors', sponsors);
app.use('/api/awards', awardsRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/cta', ctaRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/training-hero', trainingHeroRoutes);
app.use('/api/training-cta', trainingCTARoutes);

setInterval(cleanupTempUploads, 3600000); // 1 hour

// Add this right before your health check route
app.get('/', (req, res) => {
  res.send('Welcome to Mind-X Backend!');
});

app.get('/api/health', (_req, res) => {
  res.json({ message: 'Server is running!' });
});

app.get('/db-check', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'Connected' });
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      connection: mongoose.connection.readyState
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});