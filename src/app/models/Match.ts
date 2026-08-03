import mongoose, { Document, Schema } from 'mongoose';

export interface IMatch extends Document {
  tournamentId: mongoose.Types.ObjectId;
  round: string; // 'Group Stage', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'
  matchNumber: number;
  player1Id: mongoose.Types.ObjectId;
  player2Id?: mongoose.Types.ObjectId; // For doubles, this would be the second pair
  player1Name: string;
  player2Name?: string;
  player1Partner?: string;
  player2Partner?: string;
  category?: string;
  courtNumber?: string;
  scheduledTime?: Date;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  score: {
    player1Sets: number;
    player2Sets: number;
    sets: Array<{
      set: number;
      player1Score: number;
      player2Score: number;
    }>;
  };
  winner?: mongoose.Types.ObjectId;
  winnerName?: string;
  duration?: number; // in minutes
  notes?: string;
  liveScore?: {
    currentSet: number;
    player1CurrentScore: number;
    player2CurrentScore: number;
    server: 'player1' | 'player2';
  };
  points?: {
    player1Points: number;
    player2Points: number;
  };
}

const MatchSchema = new Schema<IMatch>({
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required']
  },
  round: {
    type: String,
    required: [true, 'Round is required'],
    trim: true
  },
  matchNumber: {
    type: Number,
    required: [true, 'Match number is required'],
    min: 1
  },
  player1Id: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: false
  },
  player2Id: {
    type: Schema.Types.ObjectId,
    ref: 'Player'
  },
  player1Name: {
    type: String,
    required: [true, 'Player 1 name is required'],
    trim: true
  },
  player2Name: {
    type: String,
    trim: true
  },
  player1Partner: {
    type: String,
    trim: true
  },
  player2Partner: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  courtNumber: {
    type: String,
    trim: true
  },
  scheduledTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  score: {
    player1Sets: {
      type: Number,
      default: 0,
      min: 0
    },
    player2Sets: {
      type: Number,
      default: 0,
      min: 0
    },
    sets: [{
      set: {
        type: Number,
        required: true,
        min: 1
      },
      player1Score: {
        type: Number,
        required: true,
        min: 0
      },
      player2Score: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'Player'
  },
  winnerName: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  liveScore: {
    currentSet: {
      type: Number,
      min: 1,
      max: 5
    },
    player1CurrentScore: {
      type: Number,
      min: 0
    },
    player2CurrentScore: {
      type: Number,
      min: 0
    },
    server: {
      type: String,
      enum: ['player1', 'player2']
    }
  },
  points: {
    player1Points: {
      type: Number,
      default: 0,
      min: 0
    },
    player2Points: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
MatchSchema.index({ tournamentId: 1, round: 1 });
MatchSchema.index({ player1Id: 1 });
MatchSchema.index({ player2Id: 1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ scheduledTime: 1 });

if (mongoose.models.Match) {
  delete (mongoose.models as any).Match;
}
export default mongoose.model<IMatch>('Match', MatchSchema);