"use client";

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Box,
  Button,
  useTheme,
  useMediaQuery,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard,
  BookOnline,
  Person,
  ExitToApp,
  Login,
  AppRegistration,
} from "@mui/icons-material";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const publicNavItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: session, status } = useSession();

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
    handleProfileMenuClose();
  };

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  // Profile menu items
  const profileMenuItems = [
    { label: "Profile", href: "/profile", icon: <Person /> },
    { label: "My Bookings", href: "/my-bookings", icon: <BookOnline /> },
  ];

  if (isAdmin) {
    profileMenuItems.unshift({
      label: "Admin Dashboard",
      href: "/admin",
      icon: <Dashboard />,
    });
  }

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo Section */}
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", marginRight: 16 }}>
              <img
                src="/logo2.jpeg"
                alt="Sathiyan Sports Logo"
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 8,
                  marginRight: 8
                }}
              />
              <Typography 
                variant="h6" 
                sx={{ 
                  cursor: "pointer",
                  fontWeight: 700,
                  '&:hover': { opacity: 0.8 }
                }}
              >
                SATHIYAN SPORTS
              </Typography>
            </div>
          </Link>

          <div className="navbar-desktop-menu" style={{ flexGrow: 1, marginLeft: 32 }}>
            {publicNavItems.map((item) => (
              <Link key={item.label} href={item.href} passHref>
                <Button sx={{ color: "#fff", ml: 2 }}>
                  {item.label}
                </Button>
              </Link>
            ))}
            
            {/* Book Slot - Protected */}
            <Link href="/bookslot" passHref>
              <Button sx={{ color: "#fff", ml: 2 }}>
                Book Slot
              </Button>
            </Link>
            
            {/* S3 Fitness Plans */}
            <Link href="/s3" passHref>
              <Button sx={{ color: "#fff", ml: 2 }}>
                💪 SQube Fitness Plans
              </Button>
            </Link>

            {/* Admin Dashboard - Admin only */}
            {isAdmin && (
              <Link href="/admin" passHref>
                <Button sx={{ color: "#fff", ml: 2 }}>
                  🛠️ Admin
                </Button>
              </Link>
            )}
          </div>

          {/* Authentication Section */}
          <div style={{ display: "flex", alignItems: "center", marginLeft: 16 }}>
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isAuthenticated ? (
              // Authenticated User Menu
              <>
                <Button
                  onClick={handleProfileMenuOpen}
                  sx={{
                    color: "#fff",
                    textTransform: "none",
                    borderRadius: "20px",
                    padding: "6px 16px",
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                  }}
                  startIcon={
                    user?.image ? (
                      <Avatar 
                        src={user.image} 
                        sx={{ width: 28, height: 28 }} 
                      />
                    ) : (
                      <AccountCircle />
                    )
                  }
                >
                  {user?.name?.split(' ')[0] || 'User'}
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleProfileMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                    }
                  }}
                >
                  <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Welcome, {user?.name}
                    </Typography>
                    {user?.role && (
                      <Typography variant="caption" color="primary.main">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Typography>
                    )}
                  </div>
                  <Divider />
                  
                  {profileMenuItems.map((item) => (
                    <Link key={item.label} href={item.href} passHref>
                      <MenuItem onClick={handleProfileMenuClose}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.icon}
                          {item.label}
                        </div>
                      </MenuItem>
                    </Link>
                  ))}
                  
                  <Divider />
                  <MenuItem onClick={handleSignOut}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ExitToApp />
                      Sign Out
                    </div>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              // Unauthenticated User Buttons
              <>
                <Link href="/auth/login" passHref>
                  <Button
                    variant="outlined"
                    startIcon={<Login />}
                    className="navbar-login-button"
                    sx={{
                      color: "white",
                      borderColor: "white",
                      border: "2px solid white",
                      mr: 1,
                      textTransform: "none",
                      fontWeight: 600,
                      minWidth: "100px",
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '&:hover': {
                        borderColor: "white",
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: "white"
                      },
                      // Ensure visibility
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/register" passHref>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AppRegistration />}
                    sx={{
                      fontWeight: 600,
                      borderRadius: "8px",
                      textTransform: "none",
                      minWidth: "120px",
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      '&:hover': {
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          {isMobile && (
            <>
              <IconButton
                color="inherit"
                edge="end"
                onClick={toggleDrawer}
                size="large"
                sx={{ ml: 1 }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
                <div style={{ width: 280, padding: 16 }}>
                  {/* Logo Section for Mobile */}
                  <div style={{ 
                    marginBottom: 24, 
                    padding: 16, 
                    textAlign: 'center', 
                    borderBottom: '1px solid #e0e0e0' 
                  }}>
                    <img
                      src="/logo2.jpeg"
                      alt="Sathiyan Sports Logo"
                      style={{
                        height: 50,
                        width: 50,
                        borderRadius: 8,
                        marginBottom: 8
                      }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      SATHIYAN SPORTS
                    </Typography>
                  </div>
                  
                  {/* User Info Section for Mobile */}
                  {isAuthenticated && (
                    <div style={{ 
                      marginBottom: 16, 
                      padding: 16, 
                      backgroundColor: '#00ACC1', 
                      borderRadius: 8 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {user?.image ? (
                          <Avatar src={user.image} />
                        ) : (
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <AccountCircle />
                          </Avatar>
                        )}
                        <div>
                          <Typography variant="subtitle1" sx={{ color: 'white' }}>
                            {user?.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                            {(user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "")}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  )}

                  <List>
                    {publicNavItems.map((item) => (
                      <Link key={item.label} href={item.href} passHref>
                        <ListItem button onClick={toggleDrawer}>
                          <ListItemText primary={item.label} />
                        </ListItem>
                      </Link>
                    ))}
                    
                    <Link href="/bookslot" passHref>
                      <ListItem button onClick={toggleDrawer}>
                        <ListItemText primary="Book Slot" />
                      </ListItem>
                    </Link>
                    
                    <Link href="/s3" passHref>
                      <ListItem button onClick={toggleDrawer}>
                        <ListItemText primary="💪 S3 Fitness Plans" />
                      </ListItem>
                    </Link>

                    {isAuthenticated && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        {profileMenuItems.map((item) => (
                          <Link key={item.label} href={item.href} passHref>
                            <ListItem button onClick={toggleDrawer}>
                              <ListItemText primary={item.label} />
                            </ListItem>
                          </Link>
                        ))}
                        <ListItem button onClick={handleSignOut}>
                          <ListItemText primary="Sign Out" />
                        </ListItem>
                      </>
                    )}
                  </List>

                  {/* Mobile Auth Buttons */}
                  {!isAuthenticated && (
                    <div style={{ 
                      marginTop: 16, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 8 
                    }}>
                      <Link href="/auth/login" passHref>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Login />}
                          onClick={toggleDrawer}
                          sx={{
                            fontWeight: 600,
                            borderWidth: 2,
                            '&:hover': {
                              borderWidth: 2,
                            }
                          }}
                        >
                          Login
                        </Button>
                      </Link>
                      <Link href="/register" passHref>
                        <Button
                          variant="contained"
                          color="secondary"
                          fullWidth
                          startIcon={<AppRegistration />}
                          onClick={toggleDrawer}
                        >
                          Register
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Drawer>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
