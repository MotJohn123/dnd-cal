import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Session from '@/models/Session';
import User from '@/models/User';
import { deleteGoogleCalendarEvent } from '@/lib/google-calendar';
import { sendSessionCancellation } from '@/lib/email';

// GET /api/campaigns/[id] - Get a specific campaign
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

    const campaign = await Campaign.findById(id)
      .populate('dmId', 'username email')
      .populate('playerIds', 'username email');

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user has access to this campaign
    const isParticipant =
      campaign.dmId._id.toString() === session.user.id ||
      campaign.playerIds.some((player: any) => player._id.toString() === session.user.id);

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ campaign }, { status: 200 });
  } catch (error: any) {
    console.error('Get campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PATCH /api/campaigns/[id] - Update a campaign
export async function PATCH(
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

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only DM can update campaign
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can update this campaign' }, { status: 403 });
    }

    const updates = await req.json();
    
    // Update allowed fields
    if (updates.name) campaign.name = updates.name;
    if (updates.description !== undefined) campaign.description = updates.description;
    if (updates.playerIds) campaign.playerIds = updates.playerIds;
    if (updates.availableDays) campaign.availableDays = updates.availableDays;

    await campaign.save();
    await campaign.populate('dmId', 'username email');
    await campaign.populate('playerIds', 'username email');

    return NextResponse.json(
      { message: 'Campaign updated successfully', campaign },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
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

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only DM can delete campaign
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only the DM can delete this campaign' }, { status: 403 });
    }

    // Populate players so we can notify them
    await campaign.populate('playerIds', 'username email');

    // Find sessions belonging to this campaign
    const sessions = await Session.find({ campaignId: campaign._id });

    // For each session: delete Google event (if present) and notify players
    for (const sess of sessions) {
      try {
        if (sess.googleEventId) {
          await deleteGoogleCalendarEvent(sess.googleEventId);
        }
      } catch (err) {
        console.error('Error deleting google event for session', sess._id, err);
      }

      // Notify players about cancellation (best-effort)
      try {
        const players = campaign.playerIds as any[];
        for (const p of players) {
          // Skip if no email
          if (!p.email) continue;
          try {
            await sendSessionCancellation({
              to: p.email,
              playerName: p.username || 'Player',
              campaignName: campaign.name,
              sessionName: sess.name,
              date: sess.date,
              time: sess.time,
            });
          } catch (emailErr) {
            console.error('Failed to send cancellation email to', p.email, emailErr);
          }
        }
      } catch (err) {
        console.error('Error notifying players for session', sess._id, err);
      }
    }

    // Remove sessions
    await Session.deleteMany({ campaignId: campaign._id });

    // Finally remove campaign
    await campaign.deleteOne();

    return NextResponse.json(
      { message: 'Campaign and related sessions deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
