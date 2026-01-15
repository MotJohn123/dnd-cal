import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Types } from 'mongoose';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/Availability';
import Campaign from '@/models/Campaign';
import Session from '@/models/Session';
import { parseDateInPrague } from '@/lib/timezone';

// GET /api/availability - Get availability for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await dbConnect();

    const query: any = { userId: session.user.id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const availability = await Availability.find(query).sort({ date: 1 });

    return NextResponse.json({ availability }, { status: 200 });
  } catch (error: any) {
    console.error('Get availability error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

// POST /api/availability - Set availability for a date
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, status } = await req.json();

    if (!date || !status) {
      return NextResponse.json(
        { error: 'Date and status are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Update or create availability
    // Parse date consistently using Prague timezone to match session dates
    let availabilityDate: Date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      availabilityDate = parseDateInPrague(date);
    } else {
      availabilityDate = new Date(date);
    }
    
    const availability = await Availability.findOneAndUpdate(
      { userId: session.user.id, date: availabilityDate },
      { status },
      { upsert: true, new: true }
    );

    // Auto-confirm/unconfirm player from sessions on this date
    // Find all campaigns where this user is a player
    const userCampaigns = await Campaign.find({
      playerIds: session.user.id,
    });

    const campaignIds = userCampaigns.map((c) => c._id);

    // Find all sessions on this date for these campaigns
    const sessionsOnDate = await Session.find({
      campaignId: { $in: campaignIds },
      date: availabilityDate,
    });

    // Update confirmation status based on availability
    for (const sessionDoc of sessionsOnDate) {
      const isCurrentlyConfirmed = sessionDoc.confirmedPlayerIds.some(
        (id: any) => id.toString() === session.user.id
      );

      if (status === 'Sure' || status === 'Maybe') {
        // Auto-confirm player if not already confirmed
        if (!isCurrentlyConfirmed) {
          sessionDoc.confirmedPlayerIds.push(new Types.ObjectId(session.user.id));
          await sessionDoc.save();
        }
      } else {
        // Remove player from confirmed list if they're no longer available
        if (isCurrentlyConfirmed) {
          sessionDoc.confirmedPlayerIds = sessionDoc.confirmedPlayerIds.filter(
            (id: any) => id.toString() !== session.user.id
          );
          await sessionDoc.save();
        }
      }
    }

    return NextResponse.json(
      { message: 'Availability updated successfully', availability },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Set availability error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update availability' },
      { status: 500 }
    );
  }
}
