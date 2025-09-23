// theme/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00ACC1',
    },
    secondary: {
      main: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Arial',
      'Helvetica',
      'sans-serif',
    ].join(','),
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200, // Mobile menu will trigger at screens smaller than this
      xl: 1536,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px',
          '@media (max-width: 1199px)': {
            minHeight: '64px',
          },
          '@media (max-width: 479px)': {
            minHeight: '56px',
          }
        }
      }
    }
  }
});

export default theme;
