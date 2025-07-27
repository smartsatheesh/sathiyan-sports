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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";

const navItems = ["Home", "About", "Contact"];

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <AppBar position="sticky">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🏆 Sathiyan Sports Club
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            {navItems.map((item) => (
              <Button key={item} sx={{ color: "#fff", ml: 2 }}>
                {item}
              </Button>
            ))}
            <Link href="/register" passHref>
              <Button
                variant="contained"
                color="secondary"
                sx={{
                  ml: 2,
                  fontWeight: 600,
                  borderRadius: "8px",
                  textTransform: "none",
                }}
              >
                Register Now
              </Button>
            </Link>
          </Box>

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
                  <Link href="/register" passHref>
                    <Button
                      variant="contained"
                      color="secondary"
                      fullWidth
                      sx={{
                        mt: 1,
                        fontWeight: 600,
                        borderRadius: "8px",
                        textTransform: "none",
                      }}
                    >
                      Register Now
                    </Button>
                  </Link>
                </Box>
              </Drawer>
            </>
          ) : null}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
