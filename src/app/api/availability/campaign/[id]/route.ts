import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/Availability';
import Campaign from '@/models/Campaign';

// GET /api/availability/campaign/[id] - Get availability for all players in a campaign
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const campaign = await Campaign.findById(params.id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user has access to this campaign
    const isParticipant =
      campaign.dmId.toString() === session.user.id ||
      campaign.playerIds.some((playerId: any) => playerId.toString() === session.user.id);

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all player IDs (including DM)
    const userIds = [campaign.dmId, ...campaign.playerIds];

    const query: any = { userId: { $in: userIds } };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const availability = await Availability.find(query)
      .populate('userId', 'username email')
      .sort({ date: 1 });

    return NextResponse.json({ availability }, { status: 200 });
  } catch (error: any) {
    console.error('Get campaign availability error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaign availability' },
      { status: 500 }
    );
  }
}
