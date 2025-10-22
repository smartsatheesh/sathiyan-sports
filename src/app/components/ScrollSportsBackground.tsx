"use client";

import React, { useEffect, useState } from 'react';
import { Box, keyframes } from '@mui/material';

// Keyframes for scroll-triggered animations
const floatUpAnimation = keyframes`
  0% { 
    transform: translateY(100vh) rotate(0deg) scale(0.5); 
    opacity: 0; 
  }
  10% { 
    opacity: 0.7; 
  }
  90% { 
    opacity: 0.7; 
  }
  100% { 
    transform: translateY(-100px) rotate(360deg) scale(1); 
    opacity: 0; 
  }
`;

const floatUpLeft = keyframes`
  0% { 
    transform: translateY(100vh) translateX(-50px) rotate(0deg) scale(0.5); 
    opacity: 0; 
  }
  10% { 
    opacity: 0.6; 
  }
  90% { 
    opacity: 0.6; 
  }
  100% { 
    transform: translateY(-100px) translateX(50px) rotate(-180deg) scale(1.2); 
    opacity: 0; 
  }
`;

const floatUpRight = keyframes`
  0% { 
    transform: translateY(100vh) translateX(50px) rotate(0deg) scale(0.5); 
    opacity: 0; 
  }
  10% { 
    opacity: 0.6; 
  }
  90% { 
    opacity: 0.6; 
  }
  100% { 
    transform: translateY(-100px) translateX(-50px) rotate(180deg) scale(1.2); 
    opacity: 0; 
  }
`;

const spinFloat = keyframes`
  0% { 
    transform: translateY(100vh) rotate(0deg) scale(0.3); 
    opacity: 0; 
  }
  15% { 
    opacity: 0.8; 
  }
  85% { 
    opacity: 0.8; 
  }
  100% { 
    transform: translateY(-100px) rotate(720deg) scale(1.5); 
    opacity: 0; 
  }
`;

interface ScrollSportsElement {
  id: number;
  emoji: string;
  x: number;
  size: number;
  animationType: 'floatUp' | 'floatUpLeft' | 'floatUpRight' | 'spinFloat';
  duration: number;
  delay: number;
}

const ScrollSportsBackground: React.FC = () => {
  const [scrollElements, setScrollElements] = useState<ScrollSportsElement[]>([]);
  const [scrollY, setScrollY] = useState(0);

  // Ball and bat focused sports emojis - filtered to remove unparseable characters
  const ballBatEmojis = [
    '⚽', '🏀', '🎾', '🏸', '🏏', '🏓', '⚾', 
    '🏑', '🥎', '🏸', '🏏', '🥍', '🏓', '⚽'
  ].filter(emoji => emoji && emoji !== '�' && emoji !== '?' && emoji.length > 0);

  const animationTypes: Array<'floatUp' | 'floatUpLeft' | 'floatUpRight' | 'spinFloat'> = 
    ['floatUp', 'floatUpLeft', 'floatUpRight', 'spinFloat'];

  const getAnimation = (type: string) => {
    switch (type) {
      case 'floatUp': return floatUpAnimation;
      case 'floatUpLeft': return floatUpLeft;
      case 'floatUpRight': return floatUpRight;
      case 'spinFloat': return spinFloat;
      default: return floatUpAnimation;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const generateScrollElements = () => {
      const newElements: ScrollSportsElement[] = [];
      
      // Generate 25-30 elements for scroll effect
      for (let i = 0; i < 28; i++) {
        newElements.push({
          id: i,
          emoji: ballBatEmojis[Math.floor(Math.random() * ballBatEmojis.length)],
          x: Math.random() * 100, // Percentage
          size: Math.random() * 35 + 25, // 25-60px
          animationType: animationTypes[Math.floor(Math.random() * animationTypes.length)],
          duration: Math.random() * 8 + 6, // 6-14 seconds
          delay: Math.random() * 5, // 0-5 seconds delay
        });
      }
      
      setScrollElements(newElements);
    };

    generateScrollElements();

    // Regenerate elements when scrolling for dynamic effect
    const interval = setInterval(() => {
      if (scrollY > 50) { // Only generate when user has scrolled
        generateScrollElements();
      }
    }, 12000);
    
    return () => clearInterval(interval);
  }, [scrollY]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {scrollElements.map((element) => (
        <Box
          key={element.id}
          sx={{
            position: 'absolute',
            left: `${element.x}%`,
            bottom: 0,
            fontSize: `${element.size}px`,
            animation: `${getAnimation(element.animationType)} ${element.duration}s linear infinite`,
            animationDelay: `${element.delay}s`,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
            opacity: Math.min(scrollY / 200, 0.7), // Fade in based on scroll
            // Add battle green glow to match theme
            textShadow: `
              0 0 10px rgba(34, 139, 34, 0.4),
              0 0 20px rgba(0, 100, 0, 0.3),
              0 0 30px rgba(85, 107, 47, 0.2)
            `,
            zIndex: 1,
          }}
        >
          {element.emoji}
        </Box>
      ))}
      
      {/* Additional scroll-triggered gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 30% 70%, rgba(34, 139, 34, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 70% 30%, rgba(0, 100, 0, 0.06) 0%, transparent 60%),
            radial-gradient(circle at 50% 90%, rgba(85, 107, 47, 0.04) 0%, transparent 50%)
          `,
          opacity: Math.min(scrollY / 300, 0.6),
          animation: `${floatUpAnimation} 20s ease-in-out infinite`,
        }}
      />
    </Box>
  );
};

export default ScrollSportsBackground;