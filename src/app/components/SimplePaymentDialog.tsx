import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  WhatsApp,
  QrCode,
  ContentCopy,
  CheckCircle,
  Payment,
} from '@mui/icons-material';
import QRCode from "react-qr-code";

interface SimplePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  customerInfo: any;
  bookingReference: string;
  onPaymentComplete: (transactionId: string, paymentMethod: string) => void;
}

export default function SimplePaymentDialog({
  open,
  onClose,
  amount,
  customerInfo,
  bookingReference,
  onPaymentComplete
}: SimplePaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'whatsapp' | 'gpay' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0); // 0: Select method, 1: Payment, 2: Verify

  // WhatsApp payment details
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER || '9787020525';
  const paymentMessage = `Hi! I want to make a payment of ₹${amount} for booking ${bookingReference}. Customer: ${customerInfo.name}, Phone: ${customerInfo.phone}.`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(paymentMessage)}`;

  // GPay UPI details
  const upiId = process.env.NEXT_PUBLIC_GPAY_UPI_ID || 'smartsatheesh7-1@okhdfcbank';
  const merchantName = process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Sathiyan Sports';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${bookingReference}`)}`;

  const handleMethodSelect = (method: 'whatsapp' | 'gpay') => {
    setPaymentMethod(method);
    setStep(1);
  };

  const handlePaymentComplete = async () => {
    if (!transactionId.trim()) {
      alert('Please enter the transaction ID');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Submit transaction for verification
      const response = await fetch('/api/payment/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transactionId.trim(),
          paymentMethod,
          amount,
          customerInfo,
          bookingReference,
          paymentReference: `${paymentMethod?.toUpperCase()}_${Date.now()}`
        })
      });

      const result = await response.json();

      if (result.success) {
        setStep(2);
        // Call the parent callback to proceed with booking
        setTimeout(() => {
          onPaymentComplete(transactionId, paymentMethod!);
        }, 2000);
      } else {
        alert('Failed to submit transaction: ' + result.message);
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      alert('Failed to submit payment verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          Payment - ₹{amount}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Booking Reference: {bookingReference}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Select Method</StepLabel>
          </Step>
          <Step>
            <StepLabel>Make Payment</StepLabel>
          </Step>
          <Step>
            <StepLabel>Confirmation</StepLabel>
          </Step>
        </Stepper>

        {step === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  cursor: 'pointer', 
                  '&:hover': { boxShadow: 4 } 
                }}
                onClick={() => handleMethodSelect('whatsapp')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <WhatsApp sx={{ fontSize: 48, color: '#25D366', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    WhatsApp Payment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contact our team directly for payment assistance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  cursor: 'pointer', 
                  '&:hover': { boxShadow: 4 } 
                }}
                onClick={() => handleMethodSelect('gpay')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Payment sx={{ fontSize: 48, color: '#4285f4', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    UPI Payment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pay using GPay, PhonePe, Paytm, or any UPI app
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {step === 1 && paymentMethod === 'whatsapp' && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Follow these steps to complete your WhatsApp payment:
            </Alert>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Step 1: Contact Payment Team
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<WhatsApp />}
                  fullWidth
                  href={whatsappUrl}
                  target="_blank"
                  sx={{ 
                    mb: 2,
                    backgroundColor: '#25D366',
                    '&:hover': { backgroundColor: '#20c55a' }
                  }}
                >
                  Open WhatsApp Chat
                </Button>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Or manually send a message to: <strong>{whatsappNumber}</strong>
                </Typography>
                
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  value={paymentMessage}
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => copyToClipboard(paymentMessage)}>
                          <ContentCopy />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Step 2: Enter Transaction ID
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  After making the payment, enter the transaction ID provided by our team:
                </Typography>
                <TextField
                  fullWidth
                  label="Transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID from WhatsApp"
                  helperText="Get this from our payment team after completing payment"
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {step === 1 && paymentMethod === 'gpay' && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Scan the QR code or click the payment link to complete your UPI payment:
            </Alert>
            
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  UPI Payment Details
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <QRCode value={upiUrl} size={200} />
                </Box>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>UPI ID:</strong> {upiId}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Amount:</strong> ₹{amount}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Merchant:</strong> {merchantName}
                </Typography>
                
                <Button
                  variant="contained"
                  fullWidth
                  href={upiUrl}
                  sx={{ mb: 2 }}
                >
                  Pay with UPI App
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => copyToClipboard(upiId)}
                >
                  Copy UPI ID
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Enter Transaction ID
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  After completing the UPI payment, enter your transaction ID:
                </Typography>
                <TextField
                  fullWidth
                  label="UPI Transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter UPI transaction ID"
                  helperText="Find this in your UPI app's transaction history"
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Payment Submitted Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your payment has been submitted for verification. Your booking will be confirmed shortly.
            </Typography>
            <Alert severity="success">
              Transaction ID: {transactionId}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 0 && (
          <Button onClick={onClose}>Cancel</Button>
        )}
        {step === 1 && (
          <>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button
              onClick={handlePaymentComplete}
              variant="contained"
              disabled={!transactionId.trim() || isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={20} /> : 'Verify Payment'}
            </Button>
          </>
        )}
        {step === 2 && (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
