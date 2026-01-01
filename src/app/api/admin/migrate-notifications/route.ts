import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// POST /api/admin/migrate-notifications - Update all existing users with notification preferences
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Update all users who don't have notification preferences set
    const result = await User.updateMany(
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

    return NextResponse.json(
      {
        message: 'Migration completed successfully',
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate users' },
      { status: 500 }
    );
  }
}
