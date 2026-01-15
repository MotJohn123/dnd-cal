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
import { parseDateInPrague } from '@/lib/timezone';

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
    
    // Track if date changed to re-check availability
    let dateChanged = false;
    let newPragueDate: Date | null = null;
    
    if (date) {
      // Parse date as Prague local time (not UTC)
      if (typeof date === 'string') {
        try {
          const pragueDate = parseDateInPrague(date);
          if (!isNaN(pragueDate.getTime())) {
            // Check if date actually changed
            if (sessionDoc.date.getTime() !== pragueDate.getTime()) {
              dateChanged = true;
              newPragueDate = pragueDate;
            }
            sessionDoc.date = pragueDate;
          }
        } catch (error) {
          // Invalid date format, skip update
        }
      }
    }
    if (time) sessionDoc.time = time;
    if (location) sessionDoc.location = location;

    // If date changed, re-check availability and update confirmed players
    type PopulatedPlayerForAvailability = { _id: any; username: string; email: string };
    const playersForAvailability = campaign.playerIds as unknown as PopulatedPlayerForAvailability[];
    
    if (dateChanged && newPragueDate) {
      const confirmedPlayerIds: any[] = [];
      
      for (const player of playersForAvailability) {
        const playerAvailability = await Availability.findOne({
          userId: player._id,
          date: newPragueDate,
        });
        
        // If player has "Sure" or "Maybe" availability, auto-confirm them
        if (playerAvailability && (playerAvailability.status === 'Sure' || playerAvailability.status === 'Maybe')) {
          confirmedPlayerIds.push(player._id);
        }
      }
      
      sessionDoc.confirmedPlayerIds = confirmedPlayerIds;
    }

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

        // Include only users who have Google Calendar invites enabled
        const allAttendees: string[] = [];
        
        // Add DM if they have calendar invites enabled
        if (dm.googleCalendarInvites !== false) {
          allAttendees.push(dm.email);
        }
        
        // Add players who have calendar invites enabled
        for (const player of players) {
          const playerUser = await User.findById(player._id);
          if (playerUser && playerUser.googleCalendarInvites !== false) {
            allAttendees.push(player.email);
          }
        }

        if (allAttendees.length > 0) {
          await updateGoogleCalendarEvent(sessionDoc.googleEventId, {
            summary: eventTitle,
            description: `TTRPG Session for ${campaign.name}`,
            location: sessionDoc.location,
            date: sessionDoc.date,
            time: sessionDoc.time,
            attendees: allAttendees,
          });
        }
      } catch (calendarError) {
        console.error('Failed to update Google Calendar event:', calendarError);
      }
    }

    // Send update emails to players who have email notifications enabled
    type PopulatedPlayer = { _id: any; username: string; email: string };
    const players = campaign.playerIds as unknown as PopulatedPlayer[];

    try {
      for (const player of players) {
        const playerUser = await User.findById(player._id);
        if (playerUser && playerUser.emailNotifications !== false) {
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
    const availabilityDate = new Date(sessionDoc.date);
    availabilityDate.setUTCHours(0, 0, 0, 0);

    await Availability.deleteMany({
      userId: { $in: [...campaign.playerIds.map((p: any) => p._id), campaign.dmId] },
      date: availabilityDate,
      status: 'Not available',
    });

    // Send cancellation emails to users who have email notifications enabled
    type PopulatedPlayer = { _id: any; username: string; email: string };
    const players = campaign.playerIds as unknown as PopulatedPlayer[];

    try {
      for (const player of players) {
        const playerUser = await User.findById(player._id);
        if (playerUser && playerUser.emailNotifications !== false) {
          await sendSessionCancellation({
            to: player.email,
            playerName: player.username,
            campaignName: campaign.name,
            sessionName: sessionDoc.name,
            date: sessionDoc.date,
            time: sessionDoc.time,
          });
        }
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
