"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Button,
  Box,
  Container,
  Paper,
  Card,
  CardContent,
  Divider,
  TextField,
} from "@mui/material";
import Link from "next/link";
import dynamic from "next/dynamic";

const Carousel = dynamic(() => import("./components/Slider"), { ssr: false });

const sectionKeys = ["home", "about", "contact"];

export default function Home() {
  const [activeSection, setActiveSection] = useState("home");
  const [slideDirection, setSlideDirection] = useState("right");
  const prevSection = useRef("home");

  // Listen for hash changes and update section
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") || "home";
      if (sectionKeys.includes(hash)) {
        setSlideDirection(
          sectionKeys.indexOf(hash) > sectionKeys.indexOf(prevSection.current)
            ? "right"
            : "left"
        );
        setActiveSection(hash);
        prevSection.current = hash;
      }
    };

    handleHashChange(); // On mount, set section based on hash
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #fff 100%)",
        bgcolor: "background.default",
      }}
    >
      {/* Full-width, centered slider */}
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100vw",
          mx: "auto",
          pt: 2,
          pb: 4,
        }}
      >
        <Carousel />
      </Box>

      {/* Animated Section Content */}
      <Box
        className={`slider-section-wrapper ${slideDirection}`}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "60vh",
          px: { xs: 1, sm: 2 },
        }}
      >
        {activeSection === "home" && (
          <Container
            id="home"
            maxWidth="lg"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: { xs: "40vh", md: "60vh" },
              mt: { xs: 2, md: 4 },
              mb: 4,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: { xs: 3, md: 7 },
                textAlign: "center",
                borderRadius: 4,
                width: "100%",
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h2"
                color="primary"
                gutterBottom
                sx={{
                  fontWeight: 900,
                  letterSpacing: 2,
                  fontSize: { xs: "2rem", md: "3rem" },
                }}
              >
                WELCOME TO SATHIYAN SPORTS
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  mb: 4,
                  fontWeight: 500,
                  fontSize: { xs: "1.1rem", md: "1.5rem" },
                }}
              >
                Experience our dynamic multisport environment <br /> Now in
                <b> Madurai Perungudi!</b>
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                component={Link}
                href="/register"
                sx={{
                  mt: 2,
                  fontWeight: 700,
                  px: 6,
                  py: 1.5,
                  borderRadius: 3,
                  fontSize: { xs: "1rem", md: "1.2rem" },
                  boxShadow: "0 2px 8px rgba(156,39,176,0.18)",
                }}
              >
                REGISTER NOW
              </Button>
            </Paper>
          </Container>
        )}

        {activeSection === "about" && (
          <Container
            id="about"
            maxWidth="md"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Card
              elevation={6}
              sx={{
                borderRadius: 4,
                bgcolor: "background.paper",
                width: "100%",
                maxWidth: 700,
                p: { xs: 2, md: 4 },
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.13)",
              }}
            >
              <CardContent>
                <Typography
                  variant="h4"
                  color="primary"
                  gutterBottom
                  sx={{ fontWeight: 700 }}
                >
                  🎯 Our Vision
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  To inspire and empower people of all ages to lead active,
                  healthy lives by offering top-quality sports facilities,
                  inclusive programs, and strong community engagement.
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant="h4"
                  color="primary"
                  gutterBottom
                  sx={{ fontWeight: 700 }}
                >
                  🚀 Our Mission
                </Typography>
                <Typography variant="body1">
                  To create safe, accessible, and professional multi-sport
                  environments—including football turfs, cricket nets, indoor
                  courts, and ball badminton arenas—where individuals can train,
                  play, and grow together.
                </Typography>
              </CardContent>
            </Card>
          </Container>
        )}

        {activeSection === "contact" && (
          <Container
            id="contact"
            maxWidth="md"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: { xs: "50vh", md: "60vh" },
              mt: { xs: 2, md: 4 },
              mb: 4,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: { xs: 3, md: 5 },
                textAlign: "center",
                borderRadius: 4,
                width: "100%",
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)",
              }}
            >
              <Typography
                variant="h3"
                color="primary"
                gutterBottom
                sx={{
                  fontWeight: 800,
                  letterSpacing: 1,
                  fontSize: { xs: "2rem", md: "2.5rem" },
                }}
              >
                Contact Us
              </Typography>
              <Box
                component="form"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  mt: 4,
                  mx: "auto",
                  maxWidth: "500px",
                }}
                noValidate
                autoComplete="off"
              >
                <TextField
                  label="Name"
                  variant="outlined"
                  fullWidth
                  required
                  sx={{ bgcolor: "background.paper" }}
                />
                <TextField
                  label="Email"
                  variant="outlined"
                  fullWidth
                  required
                  type="email"
                  sx={{ bgcolor: "background.paper" }}
                />
                <TextField
                  label="Message"
                  variant="outlined"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  sx={{ bgcolor: "background.paper" }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 4,
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    fontWeight: 700,
                    borderRadius: 2,
                  }}
                >
                  Send Message
                </Button>
              </Box>
            </Paper>
          </Container>
        )}
      </Box>
    </Box>
  );
}
