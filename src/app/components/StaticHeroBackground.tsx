import React from 'react';
import { Box, useTheme, alpha } from '@mui/material';

const StaticHeroBackground: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 30% 50%, ${alpha(theme.palette.primary.main, 0.3)} 0%, transparent 50%),
          radial-gradient(circle at 70% 20%, ${alpha(theme.palette.secondary.main, 0.2)} 0%, transparent 50%),
          linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.secondary.light, 0.05)})
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${theme.palette.primary.main.slice(1)}' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          opacity: 0.3,
        },
        zIndex: 0,
      }}
    />
  );
};

export default StaticHeroBackground;
