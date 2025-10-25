import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

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

    const campaign = await Campaign.findById(params.id)
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

    await campaign.deleteOne();

    return NextResponse.json(
      { message: 'Campaign deleted successfully' },
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
