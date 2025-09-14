// backend/scripts/cleanupScript.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CTA from '../models/CTA.mjs';

dotenv.config();

const cleanupCTAs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Count total CTAs
    const totalCTAs = await CTA.countDocuments();
    console.log(`Total CTAs in database: ${totalCTAs}`);

    // If there are multiple CTAs, keep only the most recent one
    if (totalCTAs > 1) {
      const latestCTA = await CTA.findOne().sort({ createdAt: -1 });
      console.log('Latest CTA:', {
        id: latestCTA._id,
        title: latestCTA.title,
        isActive: latestCTA.isActive
      });

      // Delete all other CTAs
      const deleteResult = await CTA.deleteMany({ _id: { $ne: latestCTA._id } });
      console.log(`Deleted ${deleteResult.deletedCount} old CTAs`);
      console.log('✅ Cleanup completed - Now you have a single CTA system');
    } else {
      console.log('✅ Already clean - Only one CTA exists');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

cleanupCTAs();
