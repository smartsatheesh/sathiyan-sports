"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  CheckCircle,
  Error,
  Home,
  Receipt,
  HealthAndSafety,
} from "@mui/icons-material";

const SubscriptionPaymentSuccessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const transactionId = searchParams.get('txn');
  const subscriptionId = searchParams.get('sub');

  useEffect(() => {
    if (transactionId && subscriptionId) {
      verifyPayment();
    } else {
      setError('Invalid payment parameters');
      setLoading(false);
    }
  }, [transactionId, subscriptionId]);

  const verifyPayment = async () => {
    try {
      // Wait a moment for the callback to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch the subscription to check payment status
      const response = await fetch(`/api/subscription/${subscriptionId}`);
      const data = await response.json();
      
      if (response.ok && data.subscription) {
        setSubscription(data.subscription);
        if (data.subscription.paymentStatus === 'Paid') {
          setSuccess(true);
        } else {
          setError('Payment verification failed. Please contact support if amount was debited.');
        }
      } else {
        setError('Failed to verify payment status');
      }
    } catch (err) {
      setError('Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Verifying your payment...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Please wait while we confirm your subscription payment
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {success ? (
          <>
            <CheckCircle 
              sx={{ 
                fontSize: 80, 
                color: 'success.main', 
                mb: 2 
              }} 
            />
            <Typography variant="h4" gutterBottom color="success.main">
              Payment Successful!
            </Typography>
            <Typography variant="h6" gutterBottom>
              Your health subscription is now active
            </Typography>
            
            {subscription && (
              <Card sx={{ mt: 3, textAlign: 'left' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <HealthAndSafety color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Subscription Details
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">
                      Plan:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {subscription.subscriptionType}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">
                      Amount Paid:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(subscription.amount)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">
                      Duration:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {subscription.duration} month{subscription.duration > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">
                      Valid Until:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="textSecondary">
                      Transaction ID:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {subscription.transactionId}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="textSecondary">
                      Payment Method:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {subscription.paymentMethod}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
            
            <Alert severity="success" sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>What's next?</strong>
              </Typography>
              <Typography variant="body2">
                • You'll receive health tips and reminders via WhatsApp
              </Typography>
              <Typography variant="body2">
                • Your subscription benefits are now active
              </Typography>
              <Typography variant="body2">
                • We'll notify you before your next renewal date
              </Typography>
            </Alert>
          </>
        ) : (
          <>
            <Error 
              sx={{ 
                fontSize: 80, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            <Typography variant="h4" gutterBottom color="error.main">
              Payment Failed
            </Typography>
            <Typography variant="h6" gutterBottom>
              There was an issue with your payment
            </Typography>
            
            <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          </>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => router.push('/')}
          >
            Go Home
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            onClick={() => router.push('/subscription')}
          >
            View Subscriptions
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SubscriptionPaymentSuccessPage;