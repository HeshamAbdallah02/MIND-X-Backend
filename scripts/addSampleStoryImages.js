//backend/scripts/addSampleStoryImages.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StoryHero from '../models/StoryHero.mjs';

dotenv.config();

const addSampleImages = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the story hero
    const storyHero = await StoryHero.findOne({ isActive: true });
    
    if (!storyHero) {
      console.log('No active story hero found');
      return;
    }

    // Sample images to add
    const sampleImages = [
      {
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
        alt: 'Modern building architecture representing our foundation',
        order: 0
      },
      {
        url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
        alt: 'Team collaboration representing our growth',
        order: 1
      },
      {
        url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
        alt: 'Technology and innovation representing our future',
        order: 2
      }
    ];

    // Add images if they don't already exist
    if (storyHero.images.length === 0) {
      storyHero.images = sampleImages.map(img => ({
        _id: new mongoose.Types.ObjectId(),
        ...img
      }));
      
      await storyHero.save();
      console.log('Sample images added successfully!');
      console.log('Images count:', storyHero.images.length);
    } else {
      console.log('Images already exist:', storyHero.images.length);
    }

  } catch (error) {
    console.error('Error adding sample images:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
addSampleImages();
