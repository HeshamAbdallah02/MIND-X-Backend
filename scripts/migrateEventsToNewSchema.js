// backend/scripts/migrateEventsToNewSchema.js
// Migration script to add eventDate field to existing events
// Run this once after deploying the new Event schema

import mongoose from 'mongoose';
import Event from '../models/Event.mjs';
import 'dotenv/config';

const migrateEvents = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindx';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get all events
    const events = await Event.find({});
    console.log(`📊 Found ${events.length} events to migrate`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const event of events) {
      // Skip if eventDate already exists
      if (event.eventDate) {
        console.log(`⏭️  Skipping: ${event.title?.text} (already has eventDate)`);
        skipped++;
        continue;
      }

      try {
        // Try to parse date from date.text field
        // Expected formats: "November 15-17, 2023" or "December 10, 2023"
        let eventDate = null;
        
        if (event.date?.text) {
          // Extract the first date from the text
          const dateText = event.date.text;
          
          // Try to extract date patterns
          const patterns = [
            // "November 15-17, 2023" -> "November 15, 2023"
            /([A-Za-z]+)\s+(\d{1,2})(?:-\d{1,2})?,?\s+(\d{4})/,
            // "15-17 Nov 2023" -> "15 Nov 2023"
            /(\d{1,2})(?:-\d{1,2})?\s+([A-Za-z]+)\s+(\d{4})/,
            // "2023-11-15"
            /(\d{4})-(\d{2})-(\d{2})/
          ];
          
          for (const pattern of patterns) {
            const match = dateText.match(pattern);
            if (match) {
              if (pattern.source.startsWith('(\\d{4})')) {
                // ISO format
                eventDate = new Date(dateText);
              } else {
                // Natural format - reconstruct
                const reconstructed = match[0].replace(/-\d{1,2}/, '');
                eventDate = new Date(reconstructed);
              }
              break;
            }
          }
        }

        // If parsing failed, use a default future date (1 year from now)
        if (!eventDate || isNaN(eventDate.getTime())) {
          console.log(`⚠️  Could not parse date for: ${event.title?.text}`);
          console.log(`   Date text was: "${event.date?.text}"`);
          console.log(`   Using default: 1 year from now`);
          eventDate = new Date();
          eventDate.setFullYear(eventDate.getFullYear() + 1);
        }

        // Update the event with eventDate
        event.eventDate = eventDate;
        
        // Set default values for other new fields if they don't exist
        if (!event.category) event.category = 'Conference';
        if (!event.tags) event.tags = [];
        if (!event.attendeeCount) event.attendeeCount = 0;
        if (!event.highlights) event.highlights = [];

        await event.save();
        console.log(`✅ Migrated: ${event.title?.text} -> ${eventDate.toISOString().split('T')[0]}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Failed to migrate: ${event.title?.text}`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${events.length}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Migration completed and connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
console.log('🚀 Starting event migration...\n');
migrateEvents();
