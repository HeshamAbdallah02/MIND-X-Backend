// backend/scripts/seedTimeline.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TimelineSection from '../models/TimelineSection.mjs';
import TimelinePhase from '../models/TimelinePhase.mjs';

dotenv.config();

const seedTimelineData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await TimelineSection.deleteMany({});
    await TimelinePhase.deleteMany({});
    console.log('Cleared existing timeline data');

    // Create main timeline section
    const mainSection = await TimelineSection.create({
      title: 'Our Journey',
      subtitle: 'Key milestones that shaped MIND-X',
      backgroundColor: '#f8fafc',
      lineColor: '#e2e8f0',
      nodeColor: '#FBB859',
      textColor: '#1e293b',
      isActive: true,
      order: 0
    });
    console.log('Created timeline section:', mainSection.title);

    // Create timeline phases
    const phases = [
      {
        year: '2018',
        headline: 'MIND-X is Born',
        description: 'Founded by a group of visionary students at the university, MIND-X began with a mission to bridge the gap between academic knowledge and practical skills.',
        imageUrl: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        imageAlt: 'MIND-X founding',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'left',
        isActive: true,
        order: 0,
        sectionId: mainSection._id,
        expandable: false
      },
      {
        year: '2019',
        headline: 'First Workshop Series',
        description: 'Launched our inaugural workshop series focusing on practical technology skills for students.',
        imageUrl: null,
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'right',
        isActive: true,
        order: 1,
        sectionId: mainSection._id,
        expandable: true
      },
      {
        year: '2020',
        headline: 'National Recognition',
        description: 'Received recognition from educational institutions across Egypt for our innovative approach.',
        imageUrl: null,
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'left',
        isActive: true,
        order: 2,
        sectionId: mainSection._id,
        expandable: true
      },
      {
        year: '2021',
        headline: 'Virtual Learning Hub',
        description: 'Adapted to the pandemic by creating a comprehensive virtual learning platform, reaching thousands of students remotely.',
        imageUrl: null,
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'right',
        isActive: true,
        order: 3,
        sectionId: mainSection._id,
        expandable: true
      },
      {
        year: '2022',
        headline: 'Partnership Expansion',
        description: 'Formed strategic partnerships with leading tech companies and educational institutions to enhance our programs.',
        imageUrl: null,
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'left',
        isActive: true,
        order: 4,
        sectionId: mainSection._id,
        expandable: true
      },
      {
        year: '2023',
        headline: 'Community Growth',
        description: 'Our community grew to over 5,000 active members, with successful alumni working in top tech companies.',
        imageUrl: null,
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'right',
        isActive: true,
        order: 5,
        sectionId: mainSection._id,
        expandable: true
      },
      {
        year: '2024',
        headline: 'Innovation & Excellence',
        description: 'Launched cutting-edge programs in AI, blockchain, and sustainable technology, positioning MIND-X at the forefront of tech education.',
        imageUrl: null,
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        accentColor: '#FBB859',
        position: 'left',
        isActive: true,
        order: 6,
        sectionId: mainSection._id,
        expandable: true
      }
    ];

    const createdPhases = await TimelinePhase.insertMany(phases);
    console.log(`Created ${createdPhases.length} timeline phases`);

    console.log('Timeline data seeded successfully!');
    
    // Display summary
    const sectionCount = await TimelineSection.countDocuments();
    const phaseCount = await TimelinePhase.countDocuments();
    console.log(`\nSummary:`);
    console.log(`- Timeline Sections: ${sectionCount}`);
    console.log(`- Timeline Phases: ${phaseCount}`);

  } catch (error) {
    console.error('Error seeding timeline data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
seedTimelineData();