// backend/scripts/seedSeasons.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Season from '../models/Season.mjs';

dotenv.config();

const seedSeasons = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing seasons data
    await Season.deleteMany({});
    console.log('Cleared existing seasons data');

    // Sample seasons data
    const sampleSeasons = [
      {
        academicYear: "2020/21",
        theme: "Resilience & Innovation",
        badgeColor: "#FBB859", // Golden
        isActive: true,
        order: 0,
        boardMembers: [
          {
            name: "Ahmed Hassan",
            position: "President",
            isLeader: true,
            order: 0
          },
          {
            name: "Fatima Al-Zahra",
            position: "Vice President",
            isLeader: false,
            order: 1
          },
          {
            name: "Omar Mansour",
            position: "Technical Lead",
            isLeader: false,
            order: 2
          },
          {
            name: "Sara Ibrahim",
            position: "Marketing Director",
            isLeader: false,
            order: 3
          },
          {
            name: "Mohamed Ali",
            position: "Events Coordinator",
            isLeader: false,
            order: 4
          },
          {
            name: "Nour El-Din",
            position: "Community Manager",
            isLeader: false,
            order: 5
          }
        ],
        highlights: [
          {
            text: "Successfully transitioned to virtual events during pandemic",
            order: 0
          },
          {
            text: "Launched the first MIND-X mobile application",
            order: 1
          },
          {
            text: "Organized 15+ online workshops and seminars",
            order: 2
          },
          {
            text: "Reached 500+ active community members",
            order: 3
          },
          {
            text: "Established partnerships with 8 tech companies",
            order: 4
          }
        ]
      },
      {
        academicYear: "2021/22",
        theme: "Digital Transformation",
        badgeColor: "#81C99C", // Mint Green
        isActive: true,
        order: 1,
        boardMembers: [
          {
            name: "Youssef Ahmed",
            position: "President",
            isLeader: true,
            order: 0
          },
          {
            name: "Lina Mahmoud",
            position: "Vice President",
            isLeader: false,
            order: 1
          },
          {
            name: "Kareem Osama",
            position: "CTO",
            isLeader: false,
            order: 2
          },
          {
            name: "Dina Salah",
            position: "Creative Director",
            isLeader: false,
            order: 3
          },
          {
            name: "Amr Khaled",
            position: "Operations Manager",
            isLeader: false,
            order: 4
          },
          {
            name: "Rana Mostafa",
            position: "PR Specialist",
            isLeader: false,
            order: 5
          }
        ],
        highlights: [
          {
            text: "Hosted the largest hybrid tech conference in Egypt",
            order: 0
          },
          {
            text: "Launched AI & Machine Learning bootcamp series",
            order: 1
          },
          {
            text: "Created the MIND-X startup incubator program",
            order: 2
          },
          {
            text: "Achieved 1000+ community members milestone",
            order: 3
          },
          {
            text: "Won 'Best Tech Community' award in MENA region",
            order: 4
          }
        ]
      },
      {
        academicYear: "2022/23",
        theme: "Innovation & Impact",
        badgeColor: "#606161", // Dark Gray
        isActive: true,
        order: 2,
        boardMembers: [
          {
            name: "Menna Tarek",
            position: "President",
            isLeader: true,
            order: 0
          },
          {
            name: "Hassan Omar",
            position: "Vice President",
            isLeader: false,
            order: 1
          },
          {
            name: "Yasmin Farid",
            position: "Head of Innovation",
            isLeader: false,
            order: 2
          },
          {
            name: "Mahmoud Reda",
            position: "Technical Director",
            isLeader: false,
            order: 3
          },
          {
            name: "Salma Hassan",
            position: "Partnerships Lead",
            isLeader: false,
            order: 4
          },
          {
            name: "Karim Nabil",
            position: "Strategy Advisor",
            isLeader: false,
            order: 5
          }
        ],
        highlights: [
          {
            text: "Established international chapters in 3 countries",
            order: 0
          },
          {
            text: "Launched MIND-X scholarship program for underrepresented groups",
            order: 1
          },
          {
            text: "Organized 25+ technical workshops and hackathons",
            order: 2
          },
          {
            text: "Reached 2000+ active members across all platforms",
            order: 3
          },
          {
            text: "Published research papers on emerging technologies",
            order: 4
          }
        ]
      },
      {
        academicYear: "2023/24",
        theme: "Global Expansion",
        badgeColor: "#FBB859", // Golden (cycling back)
        isActive: true,
        order: 3,
        boardMembers: [
          {
            name: "Layla Abdel Rahman",
            position: "President",
            isLeader: true,
            order: 0
          },
          {
            name: "Khaled Mostafa",
            position: "Vice President",
            isLeader: false,
            order: 1
          },
          {
            name: "Nadia Farouk",
            position: "International Relations",
            isLeader: false,
            order: 2
          },
          {
            name: "Tamer Saeed",
            position: "Technology Lead",
            isLeader: false,
            order: 3
          },
          {
            name: "Reem El-Sayed",
            position: "Content Creator",
            isLeader: false,
            order: 4
          },
          {
            name: "Adel Mansour",
            position: "Business Development",
            isLeader: false,
            order: 5
          },
          {
            name: "Mariam Youssef",
            position: "UI/UX Designer",
            isLeader: false,
            order: 6
          }
        ],
        highlights: [
          {
            text: "Opened new chapters in UAE, Saudi Arabia, and Jordan",
            order: 0
          },
          {
            text: "Hosted the first international MIND-X summit",
            order: 1
          },
          {
            text: "Developed multilingual platform supporting Arabic and English",
            order: 2
          },
          {
            text: "Achieved 5000+ members across all international chapters",
            order: 3
          },
          {
            text: "Secured major partnerships with regional tech giants",
            order: 4
          },
          {
            text: "Launched mentorship program connecting 500+ mentors and mentees",
            order: 5
          }
        ]
      }
    ];

    // Create seasons
    const createdSeasons = await Season.insertMany(sampleSeasons);
    console.log(`Created ${createdSeasons.length} seasons successfully`);

    // Display created seasons summary
    createdSeasons.forEach(season => {
      console.log(`- ${season.academicYear}: "${season.theme}" with ${season.boardMembers.length} members and ${season.highlights.length} highlights`);
    });

    console.log('Seasons seeding completed successfully!');
    
    // Validate the data
    const totalSeasons = await Season.countDocuments();
    console.log(`Total seasons in database: ${totalSeasons}`);
    
  } catch (error) {
    console.error('Error seeding seasons:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the seeding function
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSeasons();
}

export default seedSeasons;
