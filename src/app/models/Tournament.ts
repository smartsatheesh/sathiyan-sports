import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  sport: 'badminton' | 'football';
  type: 'singles' | 'doubles' | 'team';
  status: 'upcoming' | 'ongoing' | 'completed';
  description?: string;
  startDate: Date;
  endDate?: Date;
  maxParticipants: number;
  registrationDeadline: Date;
  venue: string;
  registrationFee?: number;
  prizePool?: number;
  rules?: string;
  categories?: string[];
  category?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new Schema<ITournament>({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: [100, 'Tournament name cannot exceed 100 characters']
  },
  sport: {
    type: String,
    required: [true, 'Sport type is required'],
    enum: {
      values: ['badminton', 'football'],
      message: 'Sport must be either badminton or football'
    }
  },
  type: {
    type: String,
    required: [true, 'Tournament type is required'],
    enum: {
      values: ['singles', 'doubles', 'team'],
      message: 'Type must be singles, doubles, or team'
    }
  },
  status: {
    type: String,
    required: [true, 'Tournament status is required'],
    enum: {
      values: ['upcoming', 'ongoing', 'completed'],
      message: 'Status must be upcoming, ongoing, or completed'
    },
    default: 'upcoming'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(this: ITournament, value: Date) {
        return !value || value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Maximum players is required'],
    min: [2, 'Minimum 2 players required'],
    max: [500, 'Maximum 500 players allowed']
  },
  registrationDeadline: {
    type: Date,
    required: [true, 'Registration deadline is required']
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true
  },
  registrationFee: {
    type: Number,
    min: [0, 'Registration fee cannot be negative'],
    default: 0
  },
  prizePool: {
    type: Number,
    min: [0, 'Prize pool cannot be negative']
  },
  rules: {
    type: String,
    maxlength: [2000, 'Rules cannot exceed 2000 characters']
  },
  categories: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true,
    default: 'Open'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
TournamentSchema.index({ sport: 1, status: 1 });
TournamentSchema.index({ startDate: 1 });
TournamentSchema.index({ createdBy: 1 });

// Virtual for tournament duration
TournamentSchema.virtual('duration').get(function() {
  if (this.endDate) {
    return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Delete cached model in development to pick up schema changes on hot reload
if (mongoose.models.Tournament) {
  delete (mongoose.models as any).Tournament;
}
export default mongoose.model<ITournament>('Tournament', TournamentSchema);