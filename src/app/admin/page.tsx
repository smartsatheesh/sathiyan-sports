'use client'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import Layout from '../components/Layout';

const dummyRegistrations = [
  { name: 'Arun', mobile: '9876543210', gender: 'Male', age: 22 },
  { name: 'Divya', mobile: '9876543211', gender: 'Female', age: 28 },
];

const dummyBookings = [
  { sport: 'Football', date: '2025-06-25', slot: '6-7AM', user: 'Arun' },
  { sport: 'Badminton', date: '2025-06-27', slot: '4-5PM', user: 'Divya' },
];

const AdminPage = () => (

    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>

      <Typography variant="h6" sx={{ mt: 4 }}>📋 Registrations</Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Age</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dummyRegistrations.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.mobile}</TableCell>
                <TableCell>{row.gender}</TableCell>
                <TableCell>{row.age}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" sx={{ mt: 4 }}>🏟️ Bookings</Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sport</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Slot</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dummyBookings.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.sport}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.slot}</TableCell>
                <TableCell>{row.user}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
    
);

export default AdminPage;
