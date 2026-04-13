"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  FormControlLabel,
} from "@mui/material";
import {
  CheckCircle,
  ArrowBack,
  SaveOutlined,
  RefreshOutlined,
} from "@mui/icons-material";
import { format } from "date-fns";

interface Student {
  _id: string;
  champId: string;
  name: string;
  email: string;
  sport: string;
  timeSlot: string;
  isPresent: boolean;
  notes: string;
}

interface Filters {
  sports: string[];
  timeSlots: string[];
}

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<Filters>({ sports: [], timeSlots: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  // Redirect if not authenticated or not admin/coach
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?callbackUrl=/coach/attendance");
      return;
    }

    if (session.user?.role !== "admin" && session.user?.role !== "coach") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch students for selected date
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedSport && { sport: selectedSport }),
        ...(selectedTimeSlot && { timeSlot: selectedTimeSlot }),
      });

      const response = await fetch(`/api/attendance/record?${params}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students || []);
        setFilters(data.filters || { sports: [], timeSlots: [] });
        setSelectAll(false);
        updateSummary(data.students || []);
        setMessage(`Loaded ${data.students?.length || 0} students`);
        setMessageType("info");
      } else {
        setMessage(data.error || "Failed to load students");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage("Error loading students");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Update summary statistics
  const updateSummary = (studentList: Student[]) => {
    const total = studentList.length;
    const present = studentList.filter((s) => s.isPresent).length;
    const absent = total - present;
    setSummary({ total, present, absent });
  };

  // Toggle student attendance
  const toggleStudent = (index: number) => {
    const updated = [...students];
    updated[index].isPresent = !updated[index].isPresent;
    setStudents(updated);
    updateSummary(updated);
  };

  // Toggle select all
  const handleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    const updated = students.map((s) => ({
      ...s,
      isPresent: newState,
    }));
    setStudents(updated);
    updateSummary(updated);
  };

  // Update student notes
  const updateNotes = (index: number, notes: string) => {
    const updated = [...students];
    updated[index].notes = notes;
    setStudents(updated);
  };

  // Save attendance
  const saveAttendance = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/attendance/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          attendanceRecords: students.map((s) => ({
            champId: s.champId,
            studentName: s.name,
            studentEmail: s.email,
            sport: s.sport,
            timeSlot: s.timeSlot,
            isPresent: s.isPresent,
            notes: s.notes,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(
          `✅ Attendance saved for ${data.count} students on ${selectedDate}`
        );
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to save attendance");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      setMessage("Error saving attendance");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  // Load students when date or filters change
  useEffect(() => {
    if (selectedDate) {
      fetchStudents();
    }
  }, [selectedDate, selectedSport, selectedTimeSlot]);

  if (status === "loading" || !session) {
    return (
      <Container sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          variant="outlined"
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          📋 Mark Attendance
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {session.user?.name} ({session.user?.role})
        </Typography>
      </Box>

      {/* Message */}
      {message && (
        <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}

      {/* Filters Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📅 Select Date & Filters
          </Typography>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  max: format(new Date(), "yyyy-MM-dd"),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sport (Optional)</InputLabel>
                <Select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  label="Sport (Optional)"
                >
                  <MenuItem value="">All Sports</MenuItem>
                  {filters.sports.map((sport) => (
                    <MenuItem key={sport} value={sport}>
                      {sport}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Time Slot (Optional)</InputLabel>
                <Select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  label="Time Slot (Optional)"
                >
                  <MenuItem value="">All Slots</MenuItem>
                  {filters.timeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<RefreshOutlined />}
                onClick={fetchStudents}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Card */}
      {students.length > 0 && (
        <Card sx={{ mb: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          <CardContent sx={{ color: "white" }}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3} textAlign="center">
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Total
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {summary.total}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} textAlign="center">
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Present
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", color: "#4ade80" }}>
                  {summary.present}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} textAlign="center">
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Absent
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", color: "#f87171" }}>
                  {summary.absent}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3} textAlign="center">
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Attendance %
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {summary.total > 0
                    ? Math.round((summary.present / summary.total) * 100)
                    : 0}
                  %
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : students.length === 0 ? (
        <Alert severity="info">
          No students found for the selected date and filters.
        </Alert>
      ) : (
        <>
          {/* Select All Option */}
          <Paper sx={{ mb: 2, p: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  size="medium"
                />
              }
              label={
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {selectAll ? "Deselect All Students" : "Select All Students"}
                </Typography>
              }
            />
          </Paper>

          {/* Students List */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    ✓
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Champion ID</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Sport</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Time Slot</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow
                    key={student._id}
                    sx={{
                      backgroundColor: student.isPresent
                        ? "rgba(74, 222, 128, 0.1)"
                        : "rgba(248, 113, 113, 0.05)",
                      "&:hover": {
                        backgroundColor: student.isPresent
                          ? "rgba(74, 222, 128, 0.15)"
                          : "rgba(248, 113, 113, 0.1)",
                      },
                    }}
                  >
                    <TableCell align="center">
                      <Checkbox
                        checked={student.isPresent}
                        onChange={() => toggleStudent(index)}
                        size="medium"
                        sx={{
                          color: student.isPresent ? "#4ade80" : "default",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {student.champId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{student.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={student.sport} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{student.timeSlot}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        variant="outlined"
                        placeholder="Notes..."
                        value={student.notes}
                        onChange={(e) => updateNotes(index, e.target.value)}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Save Button */}
          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => fetchStudents()}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveOutlined />}
              onClick={saveAttendance}
            >
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </Box>
        </>
      )}

      {/* Instructions */}
      <Paper sx={{ mt: 4, p: 3, backgroundColor: "#f9fafb" }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          📖 How to Use:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Select Date:</strong> Choose the date for attendance
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Filter (Optional):</strong> Filter by Sport or Time Slot
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Mark Attendance:</strong> Click checkbox to mark student as present
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Select All:</strong> Use "Select All Students" to quickly mark everyone present
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Add Notes:</strong> Optional notes for each student
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Save:</strong> Click "Save Attendance" to submit all changes
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
