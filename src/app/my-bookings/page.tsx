"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  BookOnline,
  SportsTennis,
  AccessTime,
  CalendarToday,
  Payment,
  Cancel,
  Visibility,
  Receipt,
  ContactSupport,
} from "@mui/icons-material";
import { format, isAfter, isBefore, startOfDay } from "date-fns";

interface Booking {
  _id: string;
  sport: string;
  date: string;
  timeSlots: string[];
  totalAmount: number;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MyBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login?callbackUrl=/my-bookings");
      return;
    }
    
    fetchBookings();
  }, [session, status, router]);

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/user/bookings");
      const data = await response.json();
      
      if (response.ok) {
        setBookings(data.bookings || []);
      } else {
        setError(data.message || "Failed to fetch bookings");
      }
    } catch (err) {
      setError("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/bookings/${selectedBooking._id}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Booking cancelled successfully");
        fetchBookings(); // Refresh bookings
        setCancelDialogOpen(false);
        setSelectedBooking(null);
      } else {
        setError(data.message || "Failed to cancel booking");
      }
    } catch (err) {
      setError("Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const getBookingsByStatus = (status: string) => {
    return bookings.filter(booking => {
      if (status === 'upcoming') {
        return booking.bookingStatus === 'confirmed' && 
               isAfter(new Date(booking.date), startOfDay(new Date()));
      } else if (status === 'past') {
        return isBefore(new Date(booking.date), startOfDay(new Date()));
      } else if (status === 'cancelled') {
        return booking.bookingStatus === 'cancelled';
      }
      return booking.bookingStatus === status;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  };

  const canCancelBooking = (booking: Booking) => {
    // Can only cancel confirmed bookings that are at least 24 hours in the future
    if (booking.bookingStatus !== 'confirmed') return false;
    
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff >= 24;
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking._id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SportsTennis sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="div">
                {booking.sport}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarToday sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {format(new Date(booking.date), 'dd MMM yyyy')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTime sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {booking.timeSlots.join(', ')}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Typography variant="h6" color="primary">
              ₹{booking.totalAmount}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Box sx={{ mb: 1 }}>
              <Chip 
                label={booking.bookingStatus.toUpperCase()} 
                color={getStatusColor(booking.bookingStatus) as any}
                size="small"
              />
            </Box>
            <Chip 
              label={`Payment: ${booking.paymentStatus.toUpperCase()}`} 
              color={getPaymentStatusColor(booking.paymentStatus) as any}
              size="small"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="View Details">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setDetailsDialogOpen(true);
                  }}
                >
                  <Visibility />
                </IconButton>
              </Tooltip>

              {canCancelBooking(booking) && (
                <Tooltip title="Cancel Booking">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <Cancel />
                  </IconButton>
                </Tooltip>
              )}

              {booking.paymentStatus === 'paid' && (
                <Tooltip title="Download Receipt">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      // TODO: Implement receipt download
                      console.log('Download receipt for booking:', booking._id);
                    }}
                  >
                    <Receipt />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (status === "loading" || loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!session) {
    return null;
  }

  const upcomingBookings = getBookingsByStatus('upcoming');
  const pastBookings = getBookingsByStatus('past');
  const cancelledBookings = getBookingsByStatus('cancelled');

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <BookOnline sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          My Bookings
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={2}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={`Upcoming (${upcomingBookings.length})`}
            icon={<CalendarToday />}
          />
          <Tab 
            label={`Past (${pastBookings.length})`}
            icon={<AccessTime />}
          />
          <Tab 
            label={`Cancelled (${cancelledBookings.length})`}
            icon={<Cancel />}
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {upcomingBookings.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BookOnline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No upcoming bookings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ready to play? Book your next session now!
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => router.push('/bookslot')}
                startIcon={<BookOnline />}
              >
                Book Now
              </Button>
            </Box>
          ) : (
            upcomingBookings.map(renderBookingCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {pastBookings.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AccessTime sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No past bookings
              </Typography>
            </Box>
          ) : (
            pastBookings.map(renderBookingCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {cancelledBookings.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Cancel sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No cancelled bookings
              </Typography>
            </Box>
          ) : (
            cancelledBookings.map(renderBookingCard)
          )}
        </TabPanel>
      </Paper>

      {/* Cancel Booking Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to cancel this booking?
          </Typography>
          {selectedBooking && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2">Booking Details:</Typography>
              <Typography variant="body2">Sport: {selectedBooking.sport}</Typography>
              <Typography variant="body2">
                Date: {format(new Date(selectedBooking.date), 'dd MMM yyyy')}
              </Typography>
              <Typography variant="body2">
                Time: {selectedBooking.timeSlots.join(', ')}
              </Typography>
              <Typography variant="body2">Amount: ₹{selectedBooking.totalAmount}</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            Cancellation must be done at least 24 hours before the booking time. 
            Refund policy applies.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Keep Booking
          </Button>
          <Button
            onClick={handleCancelBooking}
            color="error"
            variant="contained"
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Cancel Booking"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Booking Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Booking ID:
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedBooking._id}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sport:
                  </Typography>
                  <Typography variant="body1">{selectedBooking.sport}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Date:
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedBooking.date), 'EEEE, dd MMMM yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Time Slots:
                  </Typography>
                  <Typography variant="body1">
                    {selectedBooking.timeSlots.join(', ')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Payment & Status
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ₹{selectedBooking.totalAmount}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Booking Status:
                  </Typography>
                  <Chip 
                    label={selectedBooking.bookingStatus.toUpperCase()} 
                    color={getStatusColor(selectedBooking.bookingStatus) as any}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Status:
                  </Typography>
                  <Chip 
                    label={selectedBooking.paymentStatus.toUpperCase()} 
                    color={getPaymentStatusColor(selectedBooking.paymentStatus) as any}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Booked On:
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedBooking.createdAt), 'dd MMM yyyy hh:mm a')}
                  </Typography>
                </Box>
              </Grid>

              {selectedBooking.cancellationReason && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Cancellation Reason
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedBooking.cancellationReason}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
          {selectedBooking?.paymentStatus === 'paid' && (
            <Button
              variant="contained"
              startIcon={<Receipt />}
              onClick={() => {
                // TODO: Implement receipt download
                console.log('Download receipt for booking:', selectedBooking._id);
              }}
            >
              Download Receipt
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
