import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/Availability';

/**
 * DELETE /api/availability/reset - Delete all availability records for the authenticated user
 * This allows starting fresh with clean data
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Delete all availability records for this user
    const result = await Availability.deleteMany({ userId: session.user.id });

    return NextResponse.json(
      {
        message: 'All availability records deleted',
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Reset availability error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset availability' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/availability/reset - Delete ALL availability records for ALL users (admin only)
 * WARNING: This is destructive and removes all availability data
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Delete ALL availability records
    const result = await Availability.deleteMany({});

    return NextResponse.json(
      {
        message: 'All availability records deleted for all users',
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Reset all availability error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset all availability' },
      { status: 500 }
    );
  }
}
