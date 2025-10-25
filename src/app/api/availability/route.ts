import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Availability from '@/models/Availability';

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
    const availability = await Availability.findOneAndUpdate(
      { userId: session.user.id, date: new Date(date) },
      { status },
      { upsert: true, new: true }
    );

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
