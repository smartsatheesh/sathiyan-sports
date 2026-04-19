'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const ITEM_TYPES = ['Ball', 'Bat', 'Cork', 'Body Zorb'];

interface InventoryItem {
  _id: string;
  itemName: string;
  itemType: string;
  currentQuantity: number;
  reorderLevel: number;
  unit: string;
  description?: string;
  lastRestocked?: string;
  lastCheckDate?: string;
  transactions?: Array<{
    date: string;
    type: string;
    quantity: number;
    reason: string;
    recordedBy: string;
  }>;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openTransaction, setOpenTransaction] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [createForm, setCreateForm] = useState({
    itemName: '',
    itemType: '',
    currentQuantity: '',
    reorderLevel: '',
    unit: 'pieces',
    description: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'inflow',
    quantity: '',
    reason: '',
    notes: '',
  });

  // Fetch inventory
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory);
      }
    } catch (err) {
      setError('Failed to fetch inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create new item
  const handleCreateItem = async () => {
    if (!createForm.itemName || !createForm.itemType || !createForm.currentQuantity) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...createForm,
          currentQuantity: parseInt(createForm.currentQuantity),
          reorderLevel: parseInt(createForm.reorderLevel) || 10,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Item created successfully');
        setOpenCreate(false);
        setCreateForm({
          itemName: '',
          itemType: '',
          currentQuantity: '',
          reorderLevel: '',
          unit: 'pieces',
          description: '',
        });
        fetchInventory();
      }
    } catch (err) {
      setError('Failed to create item');
      console.error(err);
    }
  };

  // Record transaction (inflow/outflow)
  const handleTransaction = async () => {
    if (!transactionForm.quantity || !transactionForm.reason) {
      setError('Please fill quantity and reason');
      return;
    }

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transaction',
          itemId: selectedItem?._id,
          ...transactionForm,
          quantity: parseInt(transactionForm.quantity),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`${transactionForm.type === 'inflow' ? 'Added' : 'Removed'} successfully`);
        setOpenTransaction(false);
        setTransactionForm({
          type: 'inflow',
          quantity: '',
          reason: '',
          notes: '',
        });
        fetchInventory();
      } else {
        setError(data.error || 'Transaction failed');
      }
    } catch (err) {
      setError('Failed to record transaction');
      console.error(err);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/inventory?itemId=${itemId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Item deleted successfully');
        fetchInventory();
      }
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const isLowStock = (item: InventoryItem) => item.currentQuantity <= item.reorderLevel;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: { xs: 2, md: 3 } }}>
      {/* Alerts */}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Inventory Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreate(true)}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          Add New Item
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">Total Items</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{inventory.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', background: '#fff3e0' }}>
            <Typography variant="body2" color="textSecondary">Low Stock</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
              {inventory.filter(isLowStock).length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">Total Items</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {inventory.reduce((sum, item) => sum + item.currentQuantity, 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">Item Types</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {new Set(inventory.map(i => i.itemType)).size}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* Inventory Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Item Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Reorder Level</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item._id} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{item.itemType}</TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 'bold' }}>
                    {item.currentQuantity} {item.unit}
                  </Typography>
                </TableCell>
                <TableCell align="right">{item.reorderLevel}</TableCell>
                <TableCell>
                  {isLowStock(item) ? (
                    <Chip label="Low Stock" color="warning" size="small" variant="outlined" />
                  ) : (
                    <Chip label="OK" color="success" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<AddCircleOutlineIcon />}
                      onClick={() => {
                        setSelectedItem(item);
                        setTransactionForm({ type: 'inflow', quantity: '', reason: '', notes: '' });
                        setOpenTransaction(true);
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<RemoveCircleOutlineIcon />}
                      onClick={() => {
                        setSelectedItem(item);
                        setTransactionForm({ type: 'outflow', quantity: '', reason: '', notes: '' });
                        setOpenTransaction(true);
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteItem(item._id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Item Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Inventory Item</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Item Name"
            value={createForm.itemName}
            onChange={(e) => setCreateForm({ ...createForm, itemName: e.target.value })}
            margin="normal"
            placeholder="e.g., Badminton Racket Set"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Item Type</InputLabel>
            <Select
              value={createForm.itemType}
              label="Item Type"
              onChange={(e) => setCreateForm({ ...createForm, itemType: e.target.value })}
            >
              {ITEM_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Current Quantity"
            value={createForm.currentQuantity}
            onChange={(e) => setCreateForm({ ...createForm, currentQuantity: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="Reorder Level"
            value={createForm.reorderLevel}
            onChange={(e) => setCreateForm({ ...createForm, reorderLevel: e.target.value })}
            margin="normal"
            helperText="Alert when quantity drops below this level"
          />
          <TextField
            fullWidth
            label="Unit"
            value={createForm.unit}
            onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
            margin="normal"
            placeholder="e.g., pieces, kg, liters"
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreateItem} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={openTransaction} onClose={() => setOpenTransaction(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {transactionForm.type === 'inflow' ? 'Add Stock' : 'Remove Stock'} - {selectedItem?.itemName}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            type="number"
            label="Quantity"
            value={transactionForm.quantity}
            onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })}
            margin="normal"
            inputProps={{ min: 1 }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Reason</InputLabel>
            <Select
              value={transactionForm.reason}
              label="Reason"
              onChange={(e) => setTransactionForm({ ...transactionForm, reason: e.target.value })}
            >
              <MenuItem value="Purchase">Purchase</MenuItem>
              <MenuItem value="Stock Adjustment">Stock Adjustment</MenuItem>
              <MenuItem value="Damage">Damage</MenuItem>
              <MenuItem value="Usage">Usage</MenuItem>
              <MenuItem value="Return">Return</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes (Optional)"
            value={transactionForm.notes}
            onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTransaction(false)}>Cancel</Button>
          <Button onClick={handleTransaction} variant="contained">Record</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
