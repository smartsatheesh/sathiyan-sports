import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  tournamentId: mongoose.Types.ObjectId;
  playerId?: mongoose.Types.ObjectId; // Reference to User if registered user
  name: string;
  partnerId?: mongoose.Types.ObjectId; // For doubles tournaments
  partnerName?: string;
  email?: string;
  mobile?: string;
  category?: string;
  jerseyNumber?: number;
  avatar?: string;
  teamName?: string; // For team tournaments
  isRegisteredUser: boolean;
  registrationDate: Date;
  paymentStatus: 'pending' | 'completed' | 'failed';
  championshipId?: string; // Link to existing user's championshipId
}

const PlayerSchema = new Schema<IPlayer>({
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required']
  },
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player'
  },
  partnerName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  jerseyNumber: {
    type: Number,
    min: 1,
    max: 999
  },
  avatar: {
    type: String,
    trim: true
  },
  teamName: {
    type: String,
    trim: true
  },
  isRegisteredUser: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  championshipId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
PlayerSchema.index({ tournamentId: 1 });
PlayerSchema.index({ playerId: 1 });
PlayerSchema.index({ partnerId: 1 });

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);