export interface OTPData {
  otp: string;
  mobile: string;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
}

// Global storage to persist across module reloads in development
declare global {
  var __OTP_STORE__: Map<string, OTPData> | undefined;
}

class OTPService {
  private otpStore: Map<string, OTPData>;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly OTP_LENGTH = 6;
  private readonly MAX_ATTEMPTS = 3;

  constructor() {
    // Use global storage to persist across Next.js dev recompilations
    if (!global.__OTP_STORE__) {
      console.log('🔧 Initializing new OTP store');
      global.__OTP_STORE__ = new Map<string, OTPData>();
    }
    this.otpStore = global.__OTP_STORE__;
    console.log(`💾 OTP Service initialized with ${this.otpStore.size} existing entries`);
  }

  generateOTP(): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }

  async storeOTP(mobile: string, otp: string): Promise<void> {
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
    
    const otpData: OTPData = {
      otp,
      mobile,
      expiresAt,
      attempts: 0,
      isUsed: false
    };

    this.otpStore.set(mobile, otpData);
    console.log(`📱 OTP stored for ${mobile}, expires at: ${expiresAt}`);

    // Auto-cleanup expired OTP after expiry time
    setTimeout(() => {
      this.cleanupOTP(mobile);
    }, this.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  async verifyOTP(mobile: string, otp: string): Promise<{
    isValid: boolean;
    message: string;
    attemptsLeft?: number;
  }> {
    console.log(`🔍 OTP verification attempt for mobile: ${mobile}, provided OTP: ${otp}`);
    console.log(`📊 Current OTP store has ${this.otpStore.size} entries`);
    
    const otpData = this.otpStore.get(mobile);

    if (!otpData) {
      console.log(`❌ No OTP found for mobile: ${mobile}`);
      console.log(`📋 Available mobiles in store: ${Array.from(this.otpStore.keys()).join(', ')}`);
      return {
        isValid: false,
        message: 'OTP not found. Please request a new OTP.'
      };
    }

    if (otpData.isUsed) {
      return {
        isValid: false,
        message: 'OTP has already been used. Please request a new OTP.'
      };
    }

    if (new Date() > otpData.expiresAt) {
      this.cleanupOTP(mobile);
      return {
        isValid: false,
        message: 'OTP has expired. Please request a new OTP.'
      };
    }

    otpData.attempts += 1;

    if (otpData.attempts > this.MAX_ATTEMPTS) {
      this.cleanupOTP(mobile);
      return {
        isValid: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.'
      };
    }

    if (otpData.otp !== otp) {
      const attemptsLeft = this.MAX_ATTEMPTS - otpData.attempts;
      return {
        isValid: false,
        message: `Invalid OTP. ${attemptsLeft} attempts remaining.`,
        attemptsLeft
      };
    }

    // Mark OTP as used
    otpData.isUsed = true;
    
    return {
      isValid: true,
      message: 'OTP verified successfully.'
    };
  }

  async hasValidOTP(mobile: string): Promise<boolean> {
    const otpData = this.otpStore.get(mobile);
    
    if (!otpData) return false;
    if (otpData.isUsed) return false;
    if (new Date() > otpData.expiresAt) {
      this.cleanupOTP(mobile);
      return false;
    }

    return true;
  }

  async getOTPStatus(mobile: string): Promise<{
    hasOTP: boolean;
    expiresAt?: Date;
    attemptsRemaining?: number;
  }> {
    const otpData = this.otpStore.get(mobile);
    
    if (!otpData || otpData.isUsed) {
      return { hasOTP: false };
    }

    if (new Date() > otpData.expiresAt) {
      this.cleanupOTP(mobile);
      return { hasOTP: false };
    }

    return {
      hasOTP: true,
      expiresAt: otpData.expiresAt,
      attemptsRemaining: this.MAX_ATTEMPTS - otpData.attempts
    };
  }

  private cleanupOTP(mobile: string): void {
    this.otpStore.delete(mobile);
    console.log(`🧹 Cleaned up OTP for ${mobile}`);
  }

  // Clean up all expired OTPs (run periodically)
  cleanupExpiredOTPs(): void {
    const now = new Date();
    const toDelete: string[] = [];

    this.otpStore.forEach((otpData, mobile) => {
      if (now > otpData.expiresAt || otpData.isUsed) {
        toDelete.push(mobile);
      }
    });

    toDelete.forEach(mobile => {
      this.otpStore.delete(mobile);
    });

    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} expired/used OTPs`);
    }
  }

  // Get stats for debugging
  getStats(): {
    totalOTPs: number;
    activeOTPs: number;
    expiredOTPs: number;
    usedOTPs: number;
  } {
    const now = new Date();
    let activeOTPs = 0;
    let expiredOTPs = 0;
    let usedOTPs = 0;

    this.otpStore.forEach((otpData) => {
      if (otpData.isUsed) {
        usedOTPs++;
      } else if (now > otpData.expiresAt) {
        expiredOTPs++;
      } else {
        activeOTPs++;
      }
    });

    return {
      totalOTPs: this.otpStore.size,
      activeOTPs,
      expiredOTPs,
      usedOTPs
    };
  }
}

// Create singleton instance
const otpService = new OTPService();

// Run cleanup every 15 minutes
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 15 * 60 * 1000);

export default otpService;
