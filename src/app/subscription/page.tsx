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
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Payment,
  PhoneAndroid,
  CheckCircle,
  HealthAndSafety,
  FitnessCenter,
  LocalHospital,
  Star,
  AccessTime,
  Chat,
} from "@mui/icons-material";

interface SubscriptionPlan {
  name: string;
  amount: number;
  duration: number;
  features: string[];
}

interface Subscription {
  _id: string;
  subscriptionType: string;
  amount: number;
  duration: number;
  startDate: string;
  endDate: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionId?: string;
  nextDueDate: string;
  autoRenewal: boolean;
  createdAt: string;
}

const SubscriptionPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [subscriptionPlans, setSubscriptionPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [userSubscriptions, setUserSubscriptions] = useState<Subscription[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<number>(1);
  const [autoRenewal, setAutoRenewal] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createdSubscription, setCreatedSubscription] = useState<Subscription | null>(null);

  // Payment step management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Select Plan', 'Payment Method', 'Complete Payment'];

  if (status === "loading") {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <HealthAndSafety color="primary" sx={{ mr: 2, fontSize: 40 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Pay for Your Health
          </Typography>
        </Box>
        
        <Typography variant="body1">
          Subscription page is loading... More features coming soon.
        </Typography>
      </Paper>
    </Container>
  );
};

export default SubscriptionPage;