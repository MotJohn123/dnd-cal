import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
import Campaign from '@/models/Campaign';
import Availability from '@/models/Availability';
import User from '@/models/User';
import { sendSessionInvite } from '@/lib/email';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

// GET /api/sessions - Get sessions for campaigns the user is part of
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find campaigns where user is DM or player
    const campaigns = await Campaign.find({
      $or: [
        { dmId: session.user.id },
        { playerIds: session.user.id },
      ],
    });

    const campaignIds = campaigns.map((c) => c._id);

    const sessions = await Session.find({ campaignId: { $in: campaignIds } })
      .populate('campaignId', 'name dmId emoji')
      .populate('confirmedPlayerIds', 'username email')
      .sort({ date: 1 });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: any) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, name, date, time, location } = await req.json();

    if (!campaignId || !date || !time || !location) {
      return NextResponse.json(
        { error: 'Campaign ID, date, time, and location are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const campaign = await Campaign.findById(campaignId).populate('playerIds', 'username email');

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Type assertion for populated fields
    type PopulatedPlayer = { _id: any; username: string; email: string };
    const players = campaign.playerIds as unknown as PopulatedPlayer[];

    // Only DM can create sessions
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the DM can create sessions' },
        { status: 403 }
      );
    }

    // Create session
    // Note: date is stored as Date object, time as string (HH:MM)
    // All times are assumed to be in Europe/Prague timezone (CET/CEST)
    // Parse date as Prague local time (not UTC)
    let pragueDate: Date;
    
    if (typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length !== 3) {
        return NextResponse.json(
          { error: 'Date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      const [year, month, day] = parts.map(Number);
      
      // Create a date representing midnight in Prague timezone
      // We need to convert from Prague local time to UTC
      // Get a reference date in Prague to determine the UTC offset
      const pragueFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Prague',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      // Create UTC date at midnight
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      
      // Get what this UTC date looks like in Prague time
      const parts_array = pragueFormatter.formatToParts(utcDate);
      const pragueHour = parseInt(parts_array.find(p => p.type === 'hour')?.value || '0');
      const pragueDay = parseInt(parts_array.find(p => p.type === 'day')?.value || '1');
      
      // Calculate offset: if UTC midnight shows as some Prague time, we need to shift
      const offset = (pragueDay - day) * 24 + pragueHour;
      
      // Adjust UTC date by the offset to get Prague midnight
      pragueDate = new Date(utcDate.getTime() - offset * 60 * 60 * 1000);
      
      if (isNaN(pragueDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Date must be a string in YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    
    const newSession = await Session.create({
      campaignId,
      name,
      date: pragueDate,
      time,
      location,
      confirmedPlayerIds: players.map((p) => p._id),
    });

    // Update all players' AND DM's availability to "Not available" for this date
    const sessionDate = new Date(pragueDate);
    sessionDate.setHours(0, 0, 0, 0);

    // Mark all players as not available for ALL their campaigns on this date
    for (const player of players) {
      await Availability.findOneAndUpdate(
        { userId: player._id, date: sessionDate },
        { status: 'Not available' },
        { upsert: true }
      );
    }

    // Also mark DM as not available for all their campaigns on this date
    await Availability.findOneAndUpdate(
      { userId: campaign.dmId, date: sessionDate },
      { status: 'Not available' },
      { upsert: true }
    );

    // Create Google Calendar event (if configured)
    try {
      const dm = await User.findById(campaign.dmId);
      if (!dm) {
        throw new Error('DM not found');
      }

      // Include both DM and players in the calendar event
      const allAttendees = [
        dm.email, // DM gets calendar invite
        ...players.map((p) => p.email), // Players get calendar invites
      ];

      // Format event title: [Campaign Name]:[Session Name] or just [Campaign Name]
      const eventTitle = name ? `${campaign.name}: ${name}` : campaign.name;
      
      const eventId = await createGoogleCalendarEvent({
        summary: eventTitle,
        description: `Campaign: ${campaign.name}\nLocation: ${location}`,
        location,
        date: sessionDate,
        time,
        attendees: allAttendees,
      });

      if (eventId) {
        newSession.googleEventId = eventId;
        await newSession.save();
      }
    } catch (googleError) {
      console.error('Google Calendar error:', googleError);
      // Continue even if Google Calendar fails
    }

    // Send email invitations
    try {
      for (const player of players) {
        await sendSessionInvite({
          to: player.email,
          playerName: player.username,
          campaignName: campaign.name,
          date: sessionDate,
          time,
          location,
        });
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Continue even if email fails
    }

    await newSession.populate('campaignId', 'name dmId');
    await newSession.populate('confirmedPlayerIds', 'username email');

    return NextResponse.json(
      { message: 'Session created successfully', session: newSession },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}
