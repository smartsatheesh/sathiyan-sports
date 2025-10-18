"use client";

import React, { useEffect, useState } from 'react';
import { Box, keyframes } from '@mui/material';

// Keyframes for different animations
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-20px) rotate(5deg); opacity: 1; }
`;

const slideInLeft = keyframes`
  0% { transform: translateX(-100px) rotate(-10deg); opacity: 0; }
  100% { transform: translateX(0) rotate(0deg); opacity: 0.8; }
`;

const slideInRight = keyframes`
  0% { transform: translateX(100px) rotate(10deg); opacity: 0; }
  100% { transform: translateX(0) rotate(0deg); opacity: 0.8; }
`;

const bounceIn = keyframes`
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 0.9; }
  100% { transform: scale(1) rotate(360deg); opacity: 0.7; }
`;

interface SportsElement {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  animationType: 'float' | 'slideLeft' | 'slideRight' | 'bounce';
  duration: number;
  delay: number;
}

const AnimatedSportsBackground: React.FC = () => {
  const [elements, setElements] = useState<SportsElement[]>([]);

  const sportsEmojis = [
    '⚽', '🏸', '🏏', '�', '🏀', '🎾', '�', '🏓',
    '🥅', '🏆', '🥇', '🎖️', '🏅', '⚡', '💪', '🔥'
  ];

  const animationTypes: Array<'float' | 'slideLeft' | 'slideRight' | 'bounce'> = 
    ['float', 'slideLeft', 'slideRight', 'bounce'];

  const getAnimation = (type: string) => {
    switch (type) {
      case 'float': return floatAnimation;
      case 'slideLeft': return slideInLeft;
      case 'slideRight': return slideInRight;
      case 'bounce': return bounceIn;
      default: return floatAnimation;
    }
  };

  useEffect(() => {
    const generateElements = () => {
      const newElements: SportsElement[] = [];
      
      // Generate 15-20 elements randomly positioned
      for (let i = 0; i < 18; i++) {
        newElements.push({
          id: i,
          emoji: sportsEmojis[Math.floor(Math.random() * sportsEmojis.length)],
          x: Math.random() * 100, // Percentage
          y: Math.random() * 100, // Percentage
          size: Math.random() * 40 + 20, // 20-60px
          animationType: animationTypes[Math.floor(Math.random() * animationTypes.length)],
          duration: Math.random() * 3 + 2, // 2-5 seconds
          delay: Math.random() * 2, // 0-2 seconds delay
        });
      }
      
      setElements(newElements);
    };

    generateElements();

    // Regenerate elements periodically for dynamic effect
    const interval = setInterval(generateElements, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {elements.map((element) => (
        <Box
          key={element.id}
          sx={{
            position: 'absolute',
            left: `${element.x}%`,
            top: `${element.y}%`,
            fontSize: `${element.size}px`,
            animation: `${getAnimation(element.animationType)} ${element.duration}s ease-in-out infinite`,
            animationDelay: `${element.delay}s`,
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            // Make elements semi-transparent
            opacity: 0.6,
            // Add subtle glow effect
            textShadow: '0 0 10px rgba(255,255,255,0.3)',
            // Ensure they don't interfere with text readability
            zIndex: 1,
          }}
        >
          {element.emoji}
        </Box>
      ))}
      
      {/* Additional floating particles */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(25, 118, 210, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(66, 165, 245, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 152, 0, 0.05) 0%, transparent 50%)
          `,
          animation: `${floatAnimation} 6s ease-in-out infinite`,
        }}
      />
    </Box>
  );
};

export default AnimatedSportsBackground;