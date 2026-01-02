import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import { parseDateInPrague } from '@/lib/timezone';

// GET /api/campaigns/[id]/unique-dates - Get unique dates for a campaign
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

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ uniqueDates: campaign.uniqueDates || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Get unique dates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unique dates' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns/[id]/unique-dates - Add a unique date
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

    const { date } = await req.json();

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only DM can add unique dates
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the DM can add unique dates' },
        { status: 403 }
      );
    }

    // Parse the date and ensure it's at midnight in Prague timezone
    const pragueDate = parseDateInPrague(date);

    // Check if date already exists
    const dateExists = campaign.uniqueDates.some((d: Date) => {
      const existingDate = new Date(d);
      return existingDate.getUTCFullYear() === pragueDate.getUTCFullYear() &&
             existingDate.getUTCMonth() === pragueDate.getUTCMonth() &&
             existingDate.getUTCDate() === pragueDate.getUTCDate();
    });

    if (dateExists) {
      return NextResponse.json(
        { error: 'This date is already added' },
        { status: 400 }
      );
    }

    // Add the date
    campaign.uniqueDates.push(pragueDate);
    await campaign.save();

    return NextResponse.json(
      { message: 'Date added successfully', uniqueDates: campaign.uniqueDates },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Add unique date error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add unique date' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/unique-dates - Remove a unique date
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

    const { date } = await req.json();

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only DM can remove unique dates
    if (campaign.dmId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the DM can remove unique dates' },
        { status: 403 }
      );
    }

    // Parse the date to match
    const pragueDate = parseDateInPrague(date);

    // Remove the date
    campaign.uniqueDates = campaign.uniqueDates.filter((d: Date) => {
      const existingDate = new Date(d);
      return !(existingDate.getUTCFullYear() === pragueDate.getUTCFullYear() &&
               existingDate.getUTCMonth() === pragueDate.getUTCMonth() &&
               existingDate.getUTCDate() === pragueDate.getUTCDate());
    });

    await campaign.save();

    return NextResponse.json(
      { message: 'Date removed successfully', uniqueDates: campaign.uniqueDates },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Remove unique date error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove unique date' },
      { status: 500 }
    );
  }
}
