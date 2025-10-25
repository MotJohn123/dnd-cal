import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Session from '@/models/Session';
import Campaign from '@/models/Campaign';
import Availability from '@/models/Availability';
import { sendSessionUpdate, sendSessionCancellation } from '@/lib/email';
import { deleteGoogleCalendarEvent, updateGoogleCalendarEvent } from '@/lib/google-calendar';
import User from '@/models/User';

// GET /api/sessions/[id] - Get a specific session
export async function GET(
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

    const sessionDoc = await Session.findById(id)
      .populate('campaignId', 'name dmId playerIds')
      .populate('confirmedPlayerIds', 'username email');

    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: sessionDoc }, { status: 200 });
  } catch (error: any) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PUT /api/sessions/[id] - Update a session
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, date, time, location } = await req.json();

    await dbConnect();

    const sessionDoc = await Session.findById(id).populate('campaignId');

    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const campaign = await Campaign.findById(sessionDoc.campaignId).populate('playerIds', 'username email');

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only DM can update sessions
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the DM can update sessions' },
        { status: 403 }
      );
    }

    // Update session
    if (name !== undefined) sessionDoc.name = name;
    if (date) {
      // Parse date as Prague local time (not UTC)
      if (typeof date === 'string') {
        const parts = date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
          
          // Calculate the UTC datetime that represents this date at midnight in Prague timezone
          const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
          
          // Format it in Prague timezone to see what date/time it shows
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Prague',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          
          const pragueTimeStr = formatter.format(utcMidnight);
          const [datePart, timePart] = pragueTimeStr.split(', ');
          const [pragueMonth, pragueDay, pragueYear] = datePart.split('/').map(Number);
          const [pragueHour, pragueMin, pragueSec] = timePart.split(':').map(Number);
          
          const daysOff = day - pragueDay;
          const hoursOff = 0 - pragueHour;
          const minutesOff = 0 - pragueMin;
          
          const pragueDate = new Date(utcMidnight);
          pragueDate.setUTCDate(pragueDate.getUTCDate() + daysOff);
          pragueDate.setUTCHours(pragueDate.getUTCHours() + hoursOff);
          pragueDate.setUTCMinutes(pragueDate.getUTCMinutes() + minutesOff);
          
          if (!isNaN(pragueDate.getTime())) {
            sessionDoc.date = pragueDate;
          }
        }
      }
    }
    if (time) sessionDoc.time = time;
    if (location) sessionDoc.location = location;

    await sessionDoc.save();

    // Update Google Calendar event if it exists
    if (sessionDoc.googleEventId) {
      try {
        type PopulatedPlayer = { _id: any; username: string; email: string };
        const players = campaign.playerIds as unknown as PopulatedPlayer[];
        
        // Format event title: [Campaign Name]:[Session Name] or just [Campaign Name]
        const eventTitle = sessionDoc.name ? `${campaign.name}: ${sessionDoc.name}` : campaign.name;

        // Get DM email
        const dm = await User.findById(campaign.dmId);
        if (!dm) {
          throw new Error('DM not found');
        }

        // Include both DM and players in the calendar event
        const allAttendees = [
          dm.email, // DM gets calendar update
          ...players.map((p) => p.email), // Players get calendar updates
        ];

        await updateGoogleCalendarEvent(sessionDoc.googleEventId, {
          summary: eventTitle,
          description: `TTRPG Session for ${campaign.name}`,
          location: sessionDoc.location,
          date: sessionDoc.date,
          time: sessionDoc.time,
          attendees: allAttendees,
        });
      } catch (calendarError) {
        console.error('Failed to update Google Calendar event:', calendarError);
      }
    }

    // Send update emails to players
    type PopulatedPlayer = { _id: any; username: string; email: string };
    const players = campaign.playerIds as unknown as PopulatedPlayer[];

    try {
      for (const player of players) {
        await sendSessionUpdate({
          to: player.email,
          playerName: player.username,
          campaignName: campaign.name,
          sessionName: sessionDoc.name,
          date: sessionDoc.date,
          time: sessionDoc.time,
          location: sessionDoc.location,
        });
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    await sessionDoc.populate('campaignId', 'name dmId');
    await sessionDoc.populate('confirmedPlayerIds', 'username email');

    return NextResponse.json(
      { message: 'Session updated successfully', session: sessionDoc },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Cancel a session
export async function DELETE(
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

    const campaign = await Campaign.findById(sessionDoc.campaignId).populate('playerIds', 'username email');

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only DM can delete sessions
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the DM can cancel sessions' },
        { status: 403 }
      );
    }

    // Delete Google Calendar event if exists
    if (sessionDoc.googleEventId) {
      try {
        await deleteGoogleCalendarEvent(sessionDoc.googleEventId);
      } catch (googleError) {
        console.error('Google Calendar deletion error:', googleError);
      }
    }

    // Remove "Not available" availability for this date
    const sessionDate = new Date(sessionDoc.date);
    sessionDate.setHours(0, 0, 0, 0);

    await Availability.deleteMany({
      userId: { $in: [...campaign.playerIds.map((p: any) => p._id), campaign.dmId] },
      date: sessionDate,
      status: 'Not available',
    });

    // Send cancellation emails
    type PopulatedPlayer = { _id: any; username: string; email: string };
    const players = campaign.playerIds as unknown as PopulatedPlayer[];

    try {
      for (const player of players) {
        await sendSessionCancellation({
          to: player.email,
          playerName: player.username,
          campaignName: campaign.name,
          sessionName: sessionDoc.name,
          date: sessionDoc.date,
          time: sessionDoc.time,
        });
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    await Session.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'Session cancelled successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel session' },
      { status: 500 }
    );
  }
}
