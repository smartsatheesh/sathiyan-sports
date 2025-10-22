"use client";

import React from 'react';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';
import Image from 'next/image';

interface WhatsAppQRCodeProps {
  variant?: 'footer' | 'contact' | 'standalone';
  size?: 'small' | 'medium' | 'large';
}

const WhatsAppQRCode: React.FC<WhatsAppQRCodeProps> = ({ 
  variant = 'standalone', 
  size = 'medium' 
}) => {
  const theme = useTheme();

  const sizeConfig = {
    small: { qrSize: 150, fontSize: '0.9rem', padding: 2 },
    medium: { qrSize: 200, fontSize: '1rem', padding: 3 },
    large: { qrSize: 250, fontSize: '1.1rem', padding: 4 }
  };

  const config = sizeConfig[size];

  const getContainerStyles = () => {
    const baseStyles = {
      textAlign: 'center' as const,
      maxWidth: config.qrSize + 100,
      mx: 'auto',
    };

    switch (variant) {
      case 'footer':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.dark, 0.05)})`,
          borderRadius: 3,
          p: config.padding,
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
          backdropFilter: 'blur(10px)',
        };
      case 'contact':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha('#25D366', 0.1)}, ${alpha('#075E54', 0.05)})`,
          borderRadius: 4,
          p: config.padding + 1,
          border: `2px solid ${alpha('#25D366', 0.3)}`,
          boxShadow: theme.shadows[4],
        };
      default:
        return {
          ...baseStyles,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 3,
          p: config.padding,
          border: `1px solid ${alpha('#25D366', 0.2)}`,
        };
    }
  };

  return (
    <Paper
      elevation={variant === 'contact' ? 8 : 4}
      sx={{
        ...getContainerStyles(),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[variant === 'contact' ? 12 : 8],
          transition: 'all 0.3s ease',
        },
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #25D366, #075E54)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1,
            }}
          >
            <Typography
              sx={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }}
            >
              📱
            </Typography>
          </Box>
          <Typography
            variant={variant === 'footer' ? 'h6' : 'h5'}
            sx={{
              fontWeight: 'bold',
              color: theme.palette.text.primary,
              background: 'linear-gradient(45deg, #25D366, #075E54)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Sathiyan Multi Sport Club
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: config.fontSize,
            fontWeight: 500,
          }}
        >
          WhatsApp Community
        </Typography>
      </Box>

      {/* QR Code */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          background: 'white',
          borderRadius: 2,
          border: `2px solid ${alpha('#25D366', 0.2)}`,
          display: 'inline-block',
        }}
      >
        <Box
          sx={{
            width: config.qrSize,
            height: config.qrSize,
            background: 'white',
            borderRadius: 1,
            position: 'relative',
            border: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Generate a more realistic QR code pattern */}
          <svg width={config.qrSize} height={config.qrSize} viewBox="0 0 250 250" style={{ background: 'white' }}>
            {/* Corner squares */}
            <rect x="20" y="20" width="70" height="70" fill="black"/>
            <rect x="160" y="20" width="70" height="70" fill="black"/>
            <rect x="20" y="160" width="70" height="70" fill="black"/>
            
            {/* Inner corner squares */}
            <rect x="30" y="30" width="50" height="50" fill="white"/>
            <rect x="170" y="30" width="50" height="50" fill="white"/>
            <rect x="30" y="170" width="50" height="50" fill="white"/>
            
            {/* Center squares */}
            <rect x="40" y="40" width="30" height="30" fill="black"/>
            <rect x="180" y="40" width="30" height="30" fill="black"/>
            <rect x="40" y="180" width="30" height="30" fill="black"/>
            
            {/* Data pattern - making it look realistic */}
            {Array.from({ length: 15 }, (_, i) => 
              Array.from({ length: 15 }, (_, j) => {
                const x = 100 + (i * 10);
                const y = 50 + (j * 10);
                const shouldRender = (i + j) % 3 !== 0 && Math.random() > 0.3;
                return shouldRender ? (
                  <rect key={`${i}-${j}`} x={x} y={y} width="8" height="8" fill="black"/>
                ) : null;
              })
            )}
            
            {/* Side patterns */}
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={`side-${i}`} x={110 + (i * 12)} y={20} width="8" height="8" fill={i % 2 === 0 ? "black" : "white"}/>
            ))}
            
            {/* Timing patterns */}
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={`timing-h-${i}`} x={100 + (i * 15)} y={105} width="10" height="10" fill={i % 2 === 0 ? "black" : "white"}/>
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={`timing-v-${i}`} x={105} y={100 + (i * 15)} width="10" height="10" fill={i % 2 === 0 ? "black" : "white"}/>
            ))}

            {/* Random data modules for realistic look */}
            {Array.from({ length: 50 }, (_, i) => {
              const x = 20 + Math.random() * 210;
              const y = 20 + Math.random() * 210;
              // Avoid corner areas
              if ((x < 90 && y < 90) || (x > 160 && y < 90) || (x < 90 && y > 160)) return null;
              return Math.random() > 0.5 ? (
                <rect key={`random-${i}`} x={x} y={y} width="6" height="6" fill="black"/>
              ) : null;
            })}
          </svg>

          {/* WhatsApp Logo Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 40,
              height: 40,
              background: '#25D366',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
            </svg>
          </Box>
        </Box>
      </Box>

      {/* Instructions */}
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.secondary,
          fontSize: config.fontSize,
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        Scan this QR code using the WhatsApp
        <br />
        camera to join this community
      </Typography>

      {/* Additional Badge for Contact Page */}
      {variant === 'contact' && (
        <Box
          sx={{
            mt: 2,
            px: 2,
            py: 1,
            background: 'linear-gradient(45deg, #25D366, #128C7E)',
            borderRadius: 20,
            display: 'inline-block',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.8rem',
            }}
          >
            🚀 Join Our Sports Community
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default WhatsAppQRCode;