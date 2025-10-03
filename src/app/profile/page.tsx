"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  Security,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  provider: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    mobile: "",
  });
  const [changePassword, setChangePassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  });

  // Authentication check
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login?callbackUrl=/profile");
      return;
    }
    
    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.user);
        setEditData({
          name: data.user.name,
          email: data.user.email,
          mobile: data.user.mobile,
        });
      } else {
        setError(data.message || "Failed to fetch profile");
      }
    } catch (err) {
      setError("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Reset edit data if canceling
      setEditData({
        name: profile?.name || "",
        email: profile?.email || "",
        mobile: profile?.mobile || "",
      });
    }
    setEditMode(!editMode);
    setError(null);
    setSuccess(null);
  };

  const handleProfileUpdate = async () => {
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        setEditMode(false);
        setSuccess("Profile updated successfully");
        
        // Update session if name changed
        if (editData.name !== session?.user?.name) {
          await update({ name: editData.name });
        }
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    if (changePassword.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: changePassword.currentPassword,
          newPassword: changePassword.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password changed successfully");
        setChangePassword({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          showCurrent: false,
          showNew: false,
          showConfirm: false,
        });
      } else {
        setError(data.message || "Failed to change password");
      }
    } catch (err) {
      setError("Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        My Profile
      </Typography>

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

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2">
                Profile Information
              </Typography>
              <Button
                startIcon={editMode ? <Cancel /> : <Edit />}
                onClick={handleEditToggle}
                variant="outlined"
                disabled={updating}
              >
                {editMode ? "Cancel" : "Edit"}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={editMode ? editData.name : profile?.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editMode ? editData.email : profile?.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  value={editMode ? editData.mobile : profile?.mobile || ""}
                  onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Role"
                  value={profile?.role || ""}
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Security />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {editMode && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleProfileUpdate}
                      disabled={updating}
                    >
                      {updating ? "Saving..." : "Save Changes"}
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mx: 'auto', 
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '2rem'
                }}
              >
                {profile?.name?.charAt(0).toUpperCase()}
              </Avatar>
              
              <Typography variant="h6" gutterBottom>
                {profile?.name}
              </Typography>
              
              <Chip 
                label={profile?.role?.toUpperCase()} 
                color={profile?.role === 'admin' ? 'error' : 'primary'}
                size="small"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Account Details
                </Typography>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Login Provider:
                  </Typography>
                  <Typography variant="body2">
                    {profile?.provider === 'credentials' ? 'Mobile/Password' : profile?.provider?.toUpperCase()}
                  </Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Email Verified:
                  </Typography>
                  <Chip 
                    label={profile?.emailVerified ? "Yes" : "No"} 
                    color={profile?.emailVerified ? "success" : "warning"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Mobile Verified:
                  </Typography>
                  <Chip 
                    label={profile?.mobileVerified ? "Yes" : "No"} 
                    color={profile?.mobileVerified ? "success" : "warning"}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Member Since:
                  </Typography>
                  <Typography variant="body2">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password - Only for credentials provider */}
        {profile?.provider === 'credentials' && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Change Password
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={changePassword.showCurrent ? "text" : "password"}
                    value={changePassword.currentPassword}
                    onChange={(e) => setChangePassword({ 
                      ...changePassword, 
                      currentPassword: e.target.value 
                    })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setChangePassword({
                              ...changePassword,
                              showCurrent: !changePassword.showCurrent
                            })}
                            edge="end"
                          >
                            {changePassword.showCurrent ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={changePassword.showNew ? "text" : "password"}
                    value={changePassword.newPassword}
                    onChange={(e) => setChangePassword({ 
                      ...changePassword, 
                      newPassword: e.target.value 
                    })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setChangePassword({
                              ...changePassword,
                              showNew: !changePassword.showNew
                            })}
                            edge="end"
                          >
                            {changePassword.showNew ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={changePassword.showConfirm ? "text" : "password"}
                    value={changePassword.confirmPassword}
                    onChange={(e) => setChangePassword({ 
                      ...changePassword, 
                      confirmPassword: e.target.value 
                    })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setChangePassword({
                              ...changePassword,
                              showConfirm: !changePassword.showConfirm
                            })}
                            edge="end"
                          >
                            {changePassword.showConfirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handlePasswordChange}
                    disabled={
                      updating ||
                      !changePassword.currentPassword ||
                      !changePassword.newPassword ||
                      !changePassword.confirmPassword
                    }
                  >
                    {updating ? "Changing..." : "Change Password"}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
