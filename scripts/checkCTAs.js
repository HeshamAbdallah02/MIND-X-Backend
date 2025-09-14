// backend/scripts/checkCTAs.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CTA from '../models/CTA.mjs';

dotenv.config();

const checkCTAs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const ctas = await CTA.find();
    console.log('Current CTAs:', JSON.stringify(ctas, null, 2));

  } catch (error) {
    console.error('Error checking CTAs:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkCTAs();
