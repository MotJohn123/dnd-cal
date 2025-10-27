import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICampaign extends Document {
  name: string;
  dmId: mongoose.Types.ObjectId;
  playerIds: mongoose.Types.ObjectId[];
  availableDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  uniqueDates: Date[];
  description?: string;
  emoji?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [100, 'Campaign name cannot exceed 100 characters'],
    },
    dmId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dungeon Master is required'],
    },
    playerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    availableDays: [
      {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
    ],
    uniqueDates: [
      {
        type: Date,
      },
    ],
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    emoji: {
      type: String,
      default: '🎲',
      maxlength: [2, 'Emoji must be a single character'],
    },
  },
  {
    timestamps: true,
  }
);

const Campaign: Model<ICampaign> = mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);

export default Campaign;
