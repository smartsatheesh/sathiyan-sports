'use client';

import React from 'react';
import Link from 'next/link';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  ThemeProvider,
} from '@mui/material';
import theme from '../theme/theme'; // Adjust path if needed

const drawerWidth = 240;

const navItems = [
  { text: 'Home', path: '/' },
  { text: 'Register', path: '/register' },
  { text: 'Book Slot', path: '/book-slot' },
  { text: 'Contact', path: '/contact' },
  { text: 'About', path: '/about' },
  { text: 'Admin', path: '/admin' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {/* Top App Bar */}
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Sathiyan Sports
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Sidebar Navigation Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          <List>
            {navItems.map((item) => (
              <ListItem key={item.text} disablePadding>

                <Link href={item.path} passHref legacyBehavior>
                  <ListItemButton component="a">
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </Link>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Main Content Area */}
        <Box component="main" sx={{ flexGrow: 1, p: 3, marginLeft: drawerWidth }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
