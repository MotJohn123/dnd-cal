import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  campaignId: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  location: string;
  confirmedPlayerIds: mongoose.Types.ObjectId[];
  googleEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
    },
    time: {
      type: String,
      required: [true, 'Session time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'],
    },
    location: {
      type: String,
      required: [true, 'Session location is required'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    confirmedPlayerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    googleEventId: {
      type: String,
      // Store the Google Calendar event ID for future updates/deletions
    },
  },
  {
    timestamps: true,
  }
);

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
