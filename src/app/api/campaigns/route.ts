import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

// GET /api/campaigns - Get all campaigns for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find campaigns where user is either DM or player
    const campaigns = await Campaign.find({
      $or: [
        { dmId: session.user.id },
        { playerIds: session.user.id },
      ],
    })
      .populate('dmId', 'username email')
      .populate('playerIds', 'username email')
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

// POST /api/campaigns - Create a new campaign
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, playerIds, availableDays, description } = await req.json();

    if (!name || !availableDays || availableDays.length === 0) {
      return NextResponse.json(
        { error: 'Campaign name and available days are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const campaign = await Campaign.create({
      name,
      dmId: session.user.id,
      playerIds: playerIds || [],
      availableDays,
      description,
    });

    await campaign.populate('dmId', 'username email');
    await campaign.populate('playerIds', 'username email');

    return NextResponse.json(
      { message: 'Campaign created successfully', campaign },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
