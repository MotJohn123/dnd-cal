import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

// GET /api/admin/campaigns - Get all campaigns (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const campaigns = await Campaign.find({})
      .populate('dmId', 'username')
      .populate('playerIds', 'username')
      .sort({ createdAt: -1 });

    return NextResponse.json({ campaigns }, { status: 200 });
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
