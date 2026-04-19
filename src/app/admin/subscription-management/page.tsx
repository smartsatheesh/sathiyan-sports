"use client";

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Alert,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { format } from 'date-fns';
import { ArrowBack, CloudDownload, SwapHoriz } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface MigrationStats {
  totalUsers: number;
  subscribedUsersMarkedYes: number;
  activeSubscriptionRecords: number;
  usersNeedingMigration: number;
  dataIntegrity: boolean;
}

interface UserToMigrate {
  _id: string;
  champId: string;
  name: string;
  email: string;
}

export default function SubscriptionManagementPage() {
  const router = useRouter();
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [usersToMigrate, setUsersToMigrate] = useState<UserToMigrate[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/subscription-migration');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setUsersToMigrate(data.usersNeedingMigration || []);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load subscription stats' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    try {
      setMigrating(true);
      const response = await fetch('/api/admin/subscription-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate-all' })
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ 
          type: 'success', 
          message: `✅ ${data.migratedCount} users migrated successfully${data.failedCount > 0 ? ` (${data.failedCount} failed)` : ''}` 
        });
        setConfirmDialogOpen(false);
        
        // Refresh stats after migration
        setTimeout(() => fetchStats(), 500);
      } else {
        setAlert({ type: 'error', message: data.error || 'Migration failed' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to perform migration' });
      console.error(err);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading subscription data...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, mt: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => router.back()}
          variant="outlined"
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold', flex: 1 }}>
          Subscription Management & Migration
        </Typography>
      </Box>

      {/* Alerts */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {stats.totalUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: stats.dataIntegrity ? '#e8f5e9' : '#ffebee' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Marked as Subscribed (Yes)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: stats.dataIntegrity ? '#2e7d32' : '#c62828' }}>
                  {stats.subscribedUsersMarkedYes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Subscription Records
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {stats.activeSubscriptionRecords}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: stats.usersNeedingMigration > 0 ? '#fff3e0' : '#e8f5e9' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Needing Migration
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: stats.usersNeedingMigration > 0 ? '#ff6f00' : '#2e7d32' }}>
                  {stats.usersNeedingMigration}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Data Integrity Check */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🔍 Data Integrity Status
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {stats?.dataIntegrity ? (
                <Chip label="✅ All users with subscribed='yes' have subscription records" color="success" />
              ) : (
                <Chip 
                  label={`⚠️ ${stats?.usersNeedingMigration} users need subscription records created`} 
                  color="warning" 
                />
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Users Needing Migration */}
      {usersToMigrate.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Users Pending Migration ({usersToMigrate.length})
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Champion ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersToMigrate.slice(0, 10).map((user) => (
                  <TableRow key={user._id}>
                    <TableCell><Chip label={user.champId} size="small" variant="outlined" /></TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                  </TableRow>
                ))}
                {usersToMigrate.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        ... and {usersToMigrate.length - 10} more users
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {usersToMigrate.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<SwapHoriz />}
            onClick={() => setConfirmDialogOpen(true)}
            disabled={migrating}
          >
            {migrating ? 'Migrating...' : `Migrate ${usersToMigrate.length} Users`}
          </Button>
        )}

        <Button
          variant="outlined"
          startIcon={<CloudDownload />}
          onClick={() => window.open('/api/admin/subscriptions/export', '_blank')}
        >
          Export Subscriptions
        </Button>

        <Button
          variant="outlined"
          onClick={fetchStats}
          disabled={loading}
        >
          Refresh Status
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Migration</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            This will create subscription records for {usersToMigrate.length} users who are marked as subscribed but don't have subscription entries.
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
            This action cannot be undone. Proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleMigrate} 
            variant="contained" 
            color="primary"
            disabled={migrating}
          >
            {migrating ? 'Migrating...' : 'Confirm Migration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Box */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: '#e3f2fd' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
          ℹ️ How This Works
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Issue:</strong> Some users were marked as subscribed ('Yes') in the old system but don't have corresponding subscription records.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Solution:</strong> This tool migrates those users by creating proper subscription records with default settings:
        </Typography>
        <Typography variant="body2" component="div" sx={{ ml: 2 }}>
          • Uses their existing subscription type (defaults to monthly)
          • Calculates standard pricing based on user type
          • Sets up due dates based on subscription period
          • Marks as "active" status
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Result:</strong> All users with subscribed='yes' will have matching subscription records in the Subscriptions page.
        </Typography>
      </Paper>
    </Container>
  );
}