import mongoose, { Schema, Document, Model } from 'mongoose';

export type AvailabilityStatus = 'Don\'t know' | 'Sure' | 'Maybe' | 'Not available';

export interface IAvailability extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  status: AvailabilityStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Don\'t know', 'Sure', 'Maybe', 'Not available'],
      default: 'Don\'t know',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one availability per user per date
AvailabilitySchema.index({ userId: 1, date: 1 }, { unique: true });

const Availability: Model<IAvailability> = 
  mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema);

export default Availability;
