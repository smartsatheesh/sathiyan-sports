import React, { useState, useEffect } from 'react';
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
  onPaymentComplete: (transactionId: string, paymentMethod: string, paidAmount?: number) => void;
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

  // Reset dialog state when it opens/closes
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setPaymentMethod(null);
      setTransactionId('');
      setIsSubmitting(false);
      setStep(0);
    }
  }, [open]);

  // Also reset when dialog closes
  const handleClose = () => {
    setPaymentMethod(null);
    setTransactionId('');
    setIsSubmitting(false);
    setStep(0);
    onClose();
  };

  // WhatsApp payment details
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_PAYMENT_NUMBER || '9787020525';
  
  // Clean and format WhatsApp number properly
  const formatWhatsAppNumber = (number: string) => {
    // Remove any non-numeric characters
    const cleaned = number.replace(/\D/g, '');
    
    // Handle different number formats
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned; // Already has country code
    } else if (cleaned.length === 10) {
      return `91${cleaned}`; // Add country code to 10-digit number
    } else if (cleaned.startsWith('919') && cleaned.length === 13) {
      return cleaned.substring(1); // Remove extra 9 if it's 919...
    }
    return cleaned;
  };
  
  const formattedWhatsappNumber = formatWhatsAppNumber(whatsappNumber);
  
  // Create a simple, clean message
  const paymentMessage = `Payment request: ₹${amount} for booking ${bookingReference}`;
  const whatsappUrl = `https://wa.me/${formattedWhatsappNumber}?text=${encodeURIComponent(paymentMessage)}`;

  // Debug logging
  console.log('WhatsApp URL Debug:', {
    originalNumber: whatsappNumber,
    formattedNumber: formattedWhatsappNumber,
    message: paymentMessage,
    encodedMessage: encodeURIComponent(paymentMessage),
    fullUrl: whatsappUrl,
    urlLength: whatsappUrl.length
  });

  // GPay UPI details
  const upiId = process.env.NEXT_PUBLIC_GPAY_UPI_ID || 'Vyapar.175693786746@hdfcbank';
  const merchantName = process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Sathiyan Multi Sport Club';
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
          const verifiedPaidAmount = Number(result.paidAmount ?? amount);
          onPaymentComplete(transactionId, paymentMethod!, Number.isFinite(verifiedPaidAmount) ? verifiedPaidAmount : amount);
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
                  onClick={() => {
                    console.log('WhatsApp Button Debug:', {
                      originalNumber: whatsappNumber,
                      formattedNumber: formattedWhatsappNumber,
                      message: paymentMessage,
                      fullUrl: whatsappUrl
                    });
                    
                    // Check if the URL is valid
                    if (formattedWhatsappNumber && formattedWhatsappNumber.length >= 12) {
                      // Try opening WhatsApp URL
                      try {
                        const link = document.createElement('a');
                        link.href = whatsappUrl;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (error) {
                        console.error('Failed to open WhatsApp:', error);
                        // Fallback: copy number and show message
                        copyToClipboard(`+${formattedWhatsappNumber}`);
                        alert(`WhatsApp link failed. Number copied: +${formattedWhatsappNumber}. Please open WhatsApp manually.`);
                      }
                    } else {
                      // Invalid number format
                      console.error('Invalid WhatsApp number format:', formattedWhatsappNumber);
                      alert('Invalid WhatsApp number configuration. Please contact support.');
                    }
                  }}
                  sx={{ 
                    mb: 2,
                    backgroundColor: '#25D366',
                    '&:hover': { backgroundColor: '#20c55a' }
                  }}
                >
                  Open WhatsApp Chat
                </Button>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Or manually send a message to: <strong>+91 {whatsappNumber}</strong>
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => copyToClipboard(`+91${whatsappNumber}`)}
                    sx={{ mr: 1 }}
                  >
                    Copy Number
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      // Try opening WhatsApp with just the number (no message)
                      window.open(`https://wa.me/${formattedWhatsappNumber}`, '_blank');
                    }}
                  >
                    Open WhatsApp Only
                  </Button>
                </Box>
                
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
          <Button onClick={handleClose}>Cancel</Button>
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
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
