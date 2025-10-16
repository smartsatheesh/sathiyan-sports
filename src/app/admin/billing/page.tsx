"use client";

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import BillingCycleAdmin from '../../components/BillingCycleAdmin';

const AdminBillingPage: React.FC = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      <BillingCycleAdmin />
    </Box>
  );
};

export default AdminBillingPage;