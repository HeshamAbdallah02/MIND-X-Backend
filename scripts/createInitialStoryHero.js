//backend/scripts/createInitialStoryHero.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StoryHero from '../models/StoryHero.mjs';

dotenv.config();

const createInitialStoryHero = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if story hero already exists
    const existingStoryHero = await StoryHero.findOne();
    
    if (existingStoryHero) {
      console.log('Story hero already exists:', existingStoryHero.headline);
      return;
    }

    // Create initial story hero content
    const storyHero = new StoryHero({
      headline: 'Our Story',
      hookLine: 'From Day One to Today: Our Journey of Innovation and Growth',
      images: [
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
      ],
      autoScrollSpeed: 6000, // 6 seconds per image
      showIndicators: true,
      colors: {
        headlineColor: '#ffffff',
        headlineSize: 'text-5xl md:text-6xl',
        hookLineColor: '#f0f0f0',
        hookLineSize: 'text-lg md:text-xl',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        overlayOpacity: 0.5,
        arrowBackground: 'rgba(255, 255, 255, 0.2)',
        arrowColor: '#ffffff',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fallbackBackground: '#f5f5f5'
      },
      isActive: true
    });

    await storyHero.save();
    console.log('Initial story hero created successfully!');
    console.log('Headline:', storyHero.headline);
    console.log('Hook Line:', storyHero.hookLine);
    console.log('Images:', storyHero.images.length);

  } catch (error) {
    console.error('Error creating initial story hero:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
createInitialStoryHero();
