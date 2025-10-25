"use client";

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  IconButton,
  Fade,
  Zoom,
  keyframes,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close,
  EmojiEvents,
  FitnessCenter,
  LocalHospital,
  Celebration
} from '@mui/icons-material';

// Burst animation keyframes
const burstAnimation = keyframes`
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.2) rotate(180deg);
    opacity: 0.8;
  }
  100% {
    transform: scale(2) rotate(360deg);
    opacity: 0;
  }
`;

const confettiAnimation = keyframes`
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
`;

const bounceIn = keyframes`
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 30px rgba(76, 175, 80, 0.4), 0 0 60px rgba(46, 125, 50, 0.3);
  }
  50% {
    box-shadow: 0 0 50px rgba(76, 175, 80, 0.7), 0 0 80px rgba(46, 125, 50, 0.5), 0 0 100px rgba(139, 195, 74, 0.3);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

interface RegistrationSuccessPopupProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
}

const RegistrationSuccessPopup: React.FC<RegistrationSuccessPopupProps> = ({
  open,
  onClose,
  userName = 'Champion'
}) => {
  const theme = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      setTimeout(() => setShowMessage(true), 500);
    } else {
      setShowConfetti(false);
      setShowMessage(false);
    }
  }, [open]);

  // Generate confetti elements
  const confettiElements = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDelay: Math.random() * 2,
    color: ['#FFD700', '#FF6B35', '#4CAF50', '#2196F3', '#8BC34A', '#FFC107', '#FF9800', '#00E676'][Math.floor(Math.random() * 8)]
  }));

  // Generate burst elements
  const burstElements = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    rotation: i * 45,
    delay: i * 0.1
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'visible',
          background: `linear-gradient(135deg, 
            ${alpha('#4CAF50', 0.95)}, 
            ${alpha('#8BC34A', 0.9)}, 
            ${alpha('#CDDC39', 0.85)}
          )`,
          backdropFilter: 'blur(20px)',
          border: `3px solid ${alpha('#4CAF50', 0.6)}`,
          position: 'relative',
          boxShadow: '0 20px 60px rgba(76, 175, 80, 0.3), 0 0 80px rgba(139, 195, 74, 0.2)',
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: alpha('#1B5E20', 0.4),
          backdropFilter: 'blur(8px)',
        }
      }}
    >
      <DialogContent sx={{ position: 'relative', overflow: 'visible', p: 4 }}>
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            backgroundColor: alpha('#fff', 0.9),
            color: '#2E7D32',
            border: `2px solid ${alpha('#4CAF50', 0.3)}`,
            '&:hover': {
              backgroundColor: '#fff',
              transform: 'scale(1.1)',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <Close />
        </IconButton>

        {/* Confetti Animation */}
        {showConfetti && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            {confettiElements.map((confetti) => (
              <Box
                key={confetti.id}
                sx={{
                  position: 'absolute',
                  left: `${confetti.left}%`,
                  top: '-10px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: confetti.color,
                  borderRadius: '50%',
                  animation: `${confettiAnimation} 3s linear infinite`,
                  animationDelay: `${confetti.animationDelay}s`,
                }}
              />
            ))}
          </Box>
        )}

        {/* Burst Elements */}
        {showConfetti && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {burstElements.map((burst) => (
              <Box
                key={burst.id}
                sx={{
                  position: 'absolute',
                  width: '60px',
                  height: '4px',
                  background: 'linear-gradient(90deg, #FFD700, transparent)',
                  transformOrigin: 'left center',
                  transform: `rotate(${burst.rotation}deg)`,
                  animation: `${burstAnimation} 1s ease-out`,
                  animationDelay: `${burst.delay}s`,
                }}
              />
            ))}
          </Box>
        )}

        {/* Main Content */}
        <Zoom in={open} timeout={800}>
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            {/* Trophy Icon */}
            <Box
              sx={{
                mb: 3,
                animation: showMessage ? `${bounceIn} 1s ease-out, ${glowPulse} 2s ease-in-out infinite` : 'none',
              }}
            >
              <EmojiEvents
                sx={{
                  fontSize: 80,
                  color: '#FFD700',
                  filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.3))',
                }}
              />
            </Box>

            {/* Success Message */}
            <Fade in={showMessage} timeout={1000}>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    color: '#fff',
                    textAlign: 'center',
                    mb: 2,
                    textShadow: `
                      0 0 10px rgba(255, 255, 255, 0.8),
                      0 0 20px rgba(76, 175, 80, 0.6),
                      0 0 30px rgba(76, 175, 80, 0.4)
                    `,
                    animation: 'glowPulse 2s ease-in-out infinite alternate',
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  }}
                >
                  🎉 Congratulations, {userName}! 🎉
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    color: '#fff',
                    fontWeight: 'bold',
                    mb: 2,
                    textAlign: 'center',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    animation: 'shimmer 3s ease-in-out infinite',
                  }}
                >
                  Registration Successful!
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: '#fff',
                    mb: 3,
                    lineHeight: 1.6,
                    textAlign: 'center',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
                  }}
                >
                  Welcome to Sathiyan Sports! You can now login with your mobile number and password.
                </Typography>

                {/* Motivational Section */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha('#4CAF50', 0.1)}, ${alpha('#2E7D32', 0.05)})`,
                    border: `1px solid ${alpha('#4CAF50', 0.2)}`,
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                    <FitnessCenter sx={{ color: '#fff', fontSize: 28, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }} />
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#fff',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      Your Healthy Journey Starts Now!
                    </Typography>
                    <LocalHospital sx={{ color: '#fff', fontSize: 28, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }} />
                  </Box>
                  
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#fff',
                      fontWeight: 'medium',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      opacity: 0.95,
                    }}
                  >
                    "You prefer to stay healthy... Meet us every day, never the doctor!"
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      mt: 1,
                      textAlign: 'center',
                    }}
                  >
                    Join our vibrant sports community and make fitness a lifestyle! 💪
                  </Typography>
                </Box>

                {/* Action Button */}
                <Button
                  variant="contained"
                  size="large"
                  onClick={onClose}
                  sx={{
                    background: 'linear-gradient(45deg, #fff, #f8f8f8)',
                    color: '#2E7D32',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: 3,
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 4px 15px rgba(255,255,255,0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #ffffff, #ffffff)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(255,255,255,0.4)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                  startIcon={<Celebration sx={{ color: '#4CAF50' }} />}
                >
                  Let's Get Started!
                </Button>
              </Box>
            </Fade>
          </Box>
        </Zoom>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationSuccessPopup;