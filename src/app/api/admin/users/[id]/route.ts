import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Campaign from '@/models/Campaign';
import Session from '@/models/Session';
import Availability from '@/models/Availability';

// PUT /api/admin/users/[id] - Update user (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, email } = await req.json();

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if username is taken by another user
    if (username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    // Check if email is taken by another user
    if (email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    user.username = username;
    user.email = email;
    await user.save();

    return NextResponse.json(
      {
        message: 'User updated successfully',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user and all related data (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user's campaigns (where they are DM)
    const userCampaigns = await Campaign.find({ dmId: params.id });
    const campaignIds = userCampaigns.map(c => c._id);
    
    // Delete sessions for those campaigns
    await Session.deleteMany({ campaignId: { $in: campaignIds } });
    
    // Delete the campaigns
    await Campaign.deleteMany({ dmId: params.id });

    // Remove user from campaigns where they are a player
    await Campaign.updateMany(
      { playerIds: params.id },
      { $pull: { playerIds: params.id } }
    );

    // Delete user's availability records
    await Availability.deleteMany({ userId: params.id });

    // Delete sessions where user is confirmed player
    await Session.updateMany(
      { confirmedPlayerIds: params.id },
      { $pull: { confirmedPlayerIds: params.id } }
    );

    // Finally, delete the user
    await User.findByIdAndDelete(params.id);

    return NextResponse.json(
      { message: 'User and all related data deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
