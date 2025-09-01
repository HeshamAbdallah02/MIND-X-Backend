// backend/scripts/seedAwards.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Award from '../models/Award.mjs';
import AwardsSettings from '../models/AwardsSettings.mjs';

dotenv.config();

const seedAwards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Award.deleteMany({});
    await AwardsSettings.deleteMany({});
    console.log('Cleared existing awards data');

    // Sample awards data
    const sampleAwards = [
      {
        title: "Best Innovation Award",
        description: "Recognized for groundbreaking technological solutions in education",
        year: 2024,
        iconType: "trophy",
        type: "gold",
        organization: "Tech Education Awards",
        state: "Winner",
        stateColor: "#10B981",
        isVisible: true,
        order: 0
      },
      {
        title: "Excellence in Teaching",
        description: "Outstanding contribution to modern programming education",
        year: 2024,
        iconType: "medal",
        type: "silver",
        organization: "Educational Excellence Committee",
        state: "2nd Place",
        stateColor: "#3B82F6",
        isVisible: true,
        order: 1
      },
      {
        title: "Digital Learning Pioneer",
        description: "Leading the transformation of traditional learning methods",
        year: 2023,
        iconType: "star",
        type: "special",
        organization: "Digital Education Foundation",
        state: "Achieved",
        stateColor: "#8B5CF6",
        isVisible: true,
        order: 2
      },
      {
        title: "Community Impact Award",
        description: "Making a significant difference in student communities",
        year: 2023,
        iconType: "heart",
        type: "achievement",
        organization: "Community Leaders Association",
        state: "Participated",
        stateColor: "#F59E0B",
        isVisible: true,
        order: 3
      },
      {
        title: "Technology Excellence",
        description: "Outstanding implementation of cutting-edge technology in education",
        year: 2022,
        iconType: "certificate",
        type: "bronze",
        organization: "Technology in Education Awards",
        state: "3rd Place",
        stateColor: "#EF4444",
        isVisible: true,
        order: 4
      },
      {
        title: "Startup of the Year",
        description: "Most promising educational technology startup",
        year: 2022,
        iconType: "crown",
        type: "gold",
        organization: "Startup Awards Vietnam",
        state: "Winner",
        stateColor: "#10B981",
        isVisible: true,
        order: 5
      }
    ];

    // Create awards
    const createdAwards = await Award.create(sampleAwards);
    console.log(`Created ${createdAwards.length} sample awards`);

    // Create default settings
    const defaultSettings = {
      title: "Our Awards & Recognition",
      subtitle: "Celebrating excellence in education and innovation",
      colors: {
        primary: "#3B82F6",
        secondary: "#1E40AF",
        accent: "#F59E0B",
        text: "#1F2937",
        background: "#F8FAFC"
      },
      backgroundImage: {
        url: "/images/awards-bg.jpg",
        opacity: 0.3,
        overlay: true
      }
    };

    const settings = await AwardsSettings.create(defaultSettings);
    console.log('Created default awards settings');

    console.log('Awards seeding completed successfully!');
    
    // Display created data
    console.log('\nCreated Awards:');
    createdAwards.forEach((award, index) => {
      console.log(`${index + 1}. ${award.title} (${award.year}) - ${award.type}`);
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding awards:', error);
    process.exit(1);
  }
};

// Run the seeder
seedAwards();
