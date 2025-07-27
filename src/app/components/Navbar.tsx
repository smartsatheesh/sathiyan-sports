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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const navItems = ["Home", "About", "Contact", "Register"];

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <>
      <AppBar position="static" sx={{ background: "#222" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🏆 Sathiyan Sports Club
          </Typography>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={toggleDrawer}
                size="large"
              >
                <MenuIcon />
              </IconButton>
              <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
                <Box sx={{ width: 250 }}>
                  <List>
                    {navItems.map((text, index) => (
                      <ListItem button key={index}>
                        <ListItemText primary={text} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Drawer>
            </>
          ) : (
            <Box>
              {navItems.map((item) => (
                <Button key={item} sx={{ color: "#fff", ml: 2 }}>
                  {item}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Navbar;
