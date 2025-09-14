// backend/scripts/createSampleCTA.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CTA from '../models/CTA.mjs';

dotenv.config();

const createSampleCTA = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if any CTA already exists
    const existingCTA = await CTA.findOne();
    if (existingCTA) {
      console.log('CTA already exists. No sample CTA created.');
      return;
    }

    // Create sample CTA
    const sampleCTA = new CTA({
      title: 'Join MIND-X Today',
      description: 'Embark on an incredible journey of innovation, collaboration, and growth. Be part of a community that shapes the future through technology and creativity.',
      buttonText: 'Start Your Journey',
      buttonUrl: 'https://example.com/join',
      backgroundColor: '#3B82F6',
      isActive: true
    });

    await sampleCTA.save();
    console.log('Sample CTA created successfully!');
    console.log('CTA details:', {
      title: sampleCTA.title,
      description: sampleCTA.description,
      buttonText: sampleCTA.buttonText,
      backgroundColor: sampleCTA.backgroundColor,
      isActive: sampleCTA.isActive
    });

  } catch (error) {
    console.error('Error creating sample CTA:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createSampleCTA();
