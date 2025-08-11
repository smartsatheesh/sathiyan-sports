"use client";

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function SportsSceneLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(156, 39, 176, 0.05))',
        borderRadius: 2,
      }}
    >
      <CircularProgress 
        size={60} 
        sx={{ 
          color: 'primary.main',
          mb: 2,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          }
        }} 
      />
      <Typography 
        variant="h6" 
        color="primary" 
        fontWeight="bold"
        sx={{ mb: 1 }}
      >
        Loading 3D Sports Experience...
      </Typography>
      <Typography 
        variant="caption" 
        color="text.secondary"
        textAlign="center"
      >
        Preparing interactive sports models
      </Typography>
    </Box>
  );
}
