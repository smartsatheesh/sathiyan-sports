"use client";

import React, { useState } from 'react';
import { Fab, Tooltip, Box } from '@mui/material';
import { ThreeDRotation, PauseCircle, PlayCircle } from '@mui/icons-material';

interface ThreeDControlsProps {
  onToggle3D?: (enabled: boolean) => void;
}

export default function ThreeDControls({ onToggle3D }: ThreeDControlsProps) {
  const [is3DEnabled, setIs3DEnabled] = useState(true);

  const handleToggle = () => {
    const newState = !is3DEnabled;
    setIs3DEnabled(newState);
    if (onToggle3D) {
      onToggle3D(newState);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: { xs: 'none', md: 'block' } // Hide on mobile
      }}
    >
      <Tooltip 
        title={is3DEnabled ? "Pause 3D Animations" : "Resume 3D Animations"} 
        placement="left"
      >
        <Fab
          color={is3DEnabled ? "primary" : "secondary"}
          onClick={handleToggle}
          sx={{
            background: is3DEnabled 
              ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
              : 'linear-gradient(45deg, #FF6B6B 30%, #FFE66D 90%)',
            '&:hover': {
              transform: 'scale(1.1) rotate(10deg)',
              transition: 'all 0.3s ease'
            },
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: is3DEnabled ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 0 rgba(33, 150, 243, 0.7)'
              },
              '70%': {
                boxShadow: '0 0 0 10px rgba(33, 150, 243, 0)'
              },
              '100%': {
                boxShadow: '0 0 0 0 rgba(33, 150, 243, 0)'
              }
            }
          }}
        >
          {is3DEnabled ? (
            <ThreeDRotation sx={{ fontSize: 30 }} />
          ) : (
            <PlayCircle sx={{ fontSize: 30 }} />
          )}
        </Fab>
      </Tooltip>
    </Box>
  );
}
