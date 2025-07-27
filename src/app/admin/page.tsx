"use client";
import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
} from "@mui/material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const bookings = [
    {
      id: 1,
      user: "John Doe",
      sport: "Cricket",
      date: "2025-07-28",
      time: "06:00 PM",
      status: "Confirmed",
    },
    // Add more bookings as needed
  ];

  const stats = [
    { title: "Total Bookings", value: "156", color: "#2196f3" },
    { title: "Today's Bookings", value: "12", color: "#4caf50" },
    { title: "Revenue", value: "₹45,600", color: "#f44336" },
    { title: "Active Users", value: "89", color: "#ff9800" },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        align="center"
        gutterBottom
        sx={{
          fontWeight: 800,
          color: "primary.main",
          mb: 4,
        }}
      >
        Admin Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "white",
              }}
            >
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ color: stat.color, fontWeight: "bold" }}
                >
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Paper elevation={3} sx={{ borderRadius: 2, bgcolor: "white" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Recent Bookings" />
          <Tab label="Users" />
          <Tab label="Settings" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Sport</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>{booking.user}</TableCell>
                    <TableCell>{booking.sport}</TableCell>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.time}</TableCell>
                    <TableCell>
                      <Chip
                        label={booking.status}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" color="primary">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography>Users management content goes here</Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography>Settings content goes here</Typography>
        </TabPanel>
      </Paper>
    </Container>
  );
}
