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
  const isMobile = useMediaQuery(theme.breakpoints.down("lg")); // Changed from "md" to "lg" for better mobile detection
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
  const isCoach = user?.role === "coach";
  const hasCoachAccess = isAdmin || isCoach;

  // Profile menu items
  const profileMenuItems = [
    { label: "Profile", href: "/profile", icon: <Person /> },
    { label: "My Bookings", href: "/my-bookings", icon: <BookOnline /> },
    { label: "My Plan", href: "/my-plan", icon: <Dashboard /> },
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
      className="navbar-root"
    >
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters
          className="navbar-toolbar"
        >
          {/* Logo Section */}
          <Link href="/" className="navbar-logo-section">
            <div className="navbar-logo-section">
              <img
                src="/logo2.jpeg"
                alt="Sathiyan Sports Logo"
                className="navbar-logo-img"
              />
              <Typography
                className="navbar-logo-text"
                variant="h5"
                noWrap
                component="span"
              >
                SATHIYAN SPORTS
              </Typography>
            </div>
          </Link>

          <div className="navbar-desktop-menu">
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
            
            {/* The Coach - AI Powered - Admin/Coach only */}
            {hasCoachAccess && (
              <Link href="/coach" passHref>
                <Button 
                  sx={{ 
                    color: "#fff", 
                    ml: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1
                  }}
                  startIcon={
                    <img 
                      src="/sir-alex-anime.png" 
                      alt="Sir Alex" 
                      style={{ 
                        width: "20px", 
                        height: "20px", 
                        borderRadius: "4px" 
                      }} 
                    />
                  }
                >
                  The Coach
                </Button>
              </Link>
            )}
            
            {/* S3 Fitness Plans */}
            <Link href="/s3" passHref>
                <Button sx={{ color: "#fff", ml: 2 }} startIcon={<i className="fa-solid fa-cube"></i>}>
                💪 S³ Fitness Plans
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
          <div className="navbar-auth-section">
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isAuthenticated ? (
              // Authenticated User Menu
              <>
                <Button
                  onClick={handleProfileMenuOpen}
                  className="navbar-profile-button"
                  startIcon={
                    user?.image ? (
                      <Avatar 
                        src={user.image} 
                        className="navbar-profile-avatar"
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
                  className="navbar-profile-menu"
                >
                  <div className="navbar-profile-menu-header">
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
                        <div className="navbar-menu-item-content">
                          {item.icon}
                          {item.label}
                        </div>
                      </MenuItem>
                    </Link>
                  ))}
                  
                  <Divider />
                  <MenuItem onClick={handleSignOut}>
                    <div className="navbar-menu-item-content">
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
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/register" passHref>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AppRegistration />}
                    className="navbar-register-button"
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          {isMobile && (
            <IconButton
              color="inherit"
              edge="end"
              onClick={toggleDrawer}
              size="large"
              className="navbar-mobile-button"
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer 
              anchor="right" 
              open={drawerOpen} 
              onClose={toggleDrawer}
              classes={{
                paper: 'navbar-drawer-paper'
              }}
            >
                <div className="navbar-drawer-content">
                  {/* Logo Section for Mobile */}
                  <div className="navbar-drawer-logo">
                    <img
                      src="/logo2.jpeg"
                      alt="Sathiyan Sports Logo"
                      className="navbar-drawer-logo-img"
                    />
                    <Typography variant="h6" className="navbar-drawer-logo-text">
                      SATHIYAN SPORTS
                    </Typography>
                  </div>
                  
                  {/* User Info Section for Mobile */}
                  {isAuthenticated && (
                    <div className="navbar-drawer-user-info">
                      <div className="navbar-drawer-user-content">
                        {user?.image ? (
                          <Avatar src={user.image} />
                        ) : (
                          <Avatar className="navbar-drawer-user-avatar">
                            <AccountCircle />
                          </Avatar>
                        )}
                        <div>
                          <Typography variant="subtitle1" className="navbar-drawer-user-name">
                            {user?.name}
                          </Typography>
                          <Typography variant="caption" className="navbar-drawer-user-role">
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
                    
                    {/* The Coach - Admin/Coach only */}
                    {hasCoachAccess && (
                      <Link href="/coach" passHref>
                        <ListItem button onClick={toggleDrawer}>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <img 
                                  src="/sir-alex-anime.png" 
                                  alt="Sir Alex" 
                                  style={{ 
                                    width: "16px", 
                                    height: "16px", 
                                    borderRadius: "3px" 
                                  }} 
                                />
                                The Coach
                              </Box>
                            } 
                          />
                        </ListItem>
                      </Link>
                    )}
                    
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
                    <div className="navbar-drawer-auth-buttons">
                      <Link href="/auth/login" passHref>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Login />}
                          onClick={toggleDrawer}
                          className="navbar-drawer-login-button"
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
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
