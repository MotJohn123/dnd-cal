import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
import Campaign from '@/models/Campaign';
import mongoose from 'mongoose';

// POST /api/sessions/[id]/confirm - Confirm attendance
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const sessionDoc = await Session.findById(id);

    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const campaign = await Campaign.findById(sessionDoc.campaignId);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user is a player in this campaign
    const isPlayer = campaign.playerIds.some(
      (playerId: any) => playerId.toString() === session.user.id
    );

    if (!isPlayer) {
      return NextResponse.json(
        { error: 'You are not a player in this campaign' },
        { status: 403 }
      );
    }

    // Add player to confirmed list if not already confirmed
    const playerObjectId = new mongoose.Types.ObjectId(session.user.id);
    if (!sessionDoc.confirmedPlayerIds.some((id: any) => id.toString() === session.user.id)) {
      sessionDoc.confirmedPlayerIds.push(playerObjectId as any);
      await sessionDoc.save();
    }

    await sessionDoc.populate('confirmedPlayerIds', 'username email');

    return NextResponse.json(
      { message: 'Attendance confirmed', session: sessionDoc },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Confirm attendance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm attendance' },
      { status: 500 }
    );
  }
}
