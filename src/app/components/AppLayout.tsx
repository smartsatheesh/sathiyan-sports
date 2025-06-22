// src/app/components/AppLayout.tsx
'use client';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../theme/theme';
import Layout from './Layout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>{children}</Layout>
    </ThemeProvider>
  );
}
