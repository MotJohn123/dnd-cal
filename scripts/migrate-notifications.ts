// Migration script to add notification preferences to existing users
// Run this script with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-notifications.ts
// Or run the migration endpoint POST /api/admin/migrate-notifications when logged in

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  console.log('Looking for .env at:', envPath);
  if (fs.existsSync(envPath)) {
    console.log('.env file found');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const eqIndex = trimmedLine.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmedLine.substring(0, eqIndex).trim();
          const value = trimmedLine.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  } else {
    console.log('.env file not found');
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    // Get the users collection directly
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not available');
    }
    
    const usersCollection = db.collection('users');

    // Update all users who don't have notification preferences set
    const result = await usersCollection.updateMany(
      {
        $or: [
          { emailNotifications: { $exists: false } },
          { googleCalendarInvites: { $exists: false } },
        ],
      },
      {
        $set: {
          emailNotifications: true,
          googleCalendarInvites: true,
        },
      }
    );

    console.log('Migration completed successfully!');
    console.log(`Matched: ${result.matchedCount} users`);
    console.log(`Modified: ${result.modifiedCount} users`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
