// backend/scripts/updateAwardsSettings.js
import mongoose from 'mongoose';
import AwardsSettings from '../models/AwardsSettings.mjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const cleanupOldFields = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindx-website');
    console.log('Connected to MongoDB');

    // Remove old fields that shouldn't exist according to new schema
    const result = await AwardsSettings.updateMany(
      {},
      {
        $unset: {
          titleColor: "",
          subtitleColor: "",
          overlayColor: "",
          overlayOpacity: ""
        }
      }
    );

    console.log('Cleanup result:', result);

    // Fetch updated document to verify
    const settings = await AwardsSettings.findOne();
    console.log('Updated settings:', JSON.stringify(settings, null, 2));

  } catch (error) {
    console.error('Error cleaning up fields:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

cleanupOldFields();
