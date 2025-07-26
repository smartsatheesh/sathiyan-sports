import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import Slider from "./Jsfileonslider"; // Your React slider here

const RegistrationForm = () => {
  const [gender, setGender] = useState("");
  const [interest, setInterest] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Form Submitted");
  };

  return (
    <div>
      {/* ✅ Use the new React Slider on landing page slider */}
      <Slider />
      {/* <---about page code---> */}

      <div>
        <div className="about-page">
          <div className="about-container">
            <h2 className="about-heading">🎯 Our Vision</h2>
            <p className="about-text">
              To inspire and empower people of all ages to lead active, healthy
              lives by offering top-quality sports facilities, inclusive
              programs, and strong community engagement.
            </p>

            <h2 className="about-heading">🎯 Our Mission</h2>
            <p className="about-text">
              To create safe, accessible, and professional multi-sport
              environments—including football turfs, cricket nets, indoor
              courts, and ball badminton arenas—where individuals can train,
              play, and grow together.
            </p>
          </div>
        </div>
      </div>
      {/* <---about page code---> */}
      {/* <---contact page code---> */}
      <div>
        <Box
          component="form"
          sx={{
            mt: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
          noValidate
          autoComplete="off"
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Contact Us
          </Typography>

          <TextField label="Name" variant="outlined" fullWidth required />
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            required
            type="email"
          />
          <TextField
            label="Message"
            variant="outlined"
            fullWidth
            required
            multiline
            rows={4}
          />

          <Button variant="contained" color="primary" size="large">
            Submit
          </Button>
        </Box>
      </div>

      {/* <---contact page code---> */}

      <div className="fullasecdisplay">
        <div className="whitespeconform">
          <Box
            className="fullregpage"
            component="form"
            onSubmit={handleSubmit}
            sx={{ maxWidth: 500 }}
          >
            <div className="headingdivv">
              <Typography className="nameofregg" variant="h6" gutterBottom>
                SATHIYAN MULTISPORTS CLUB
              </Typography>
            </div>

            <div className="inputnamefield">
              <TextField
                fullWidth
                label="Your GoodName"
                required
                margin="normal"
              />
            </div>

            <div className="inputnamefield">
              <TextField
                fullWidth
                label="Mobile Number"
                required
                margin="normal"
              />
            </div>

            <div className="inputnamefield">
              <TextField
                fullWidth
                type="number"
                label="Age"
                required
                margin="normal"
              />
            </div>

            <div className="inputnamefield">
              <Typography sx={{ mt: 2 }}>Gender</Typography>
            </div>

            <div className="togglbuttonforgender">
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={gender}
                onChange={(e, val) => setGender(val)}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="Female">FeMale</ToggleButton>
                <ToggleButton value="Male">Male</ToggleButton>
              </ToggleButtonGroup>
            </div>

            <div className="shedulefield">
              <TextField fullWidth label="Schedule" required margin="normal" />
            </div>

            <div className="supscriptioncontents">
              <Typography sx={{ mt: 2 }}>
                If you are really interested then you can win our free
                subscription offer! T&C Applied
              </Typography>
            </div>

            <div className="togglebutonsubscription">
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={interest}
                onChange={(e, val) => setInterest(val)}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="No">Not Interested</ToggleButton>
                <ToggleButton value="Yes">Interested</ToggleButton>
              </ToggleButtonGroup>
            </div>

            <div className="addressfield">
              <TextField fullWidth label="Address" required margin="normal" />
            </div>

            <Box
              sx={{
                mt: 2,
                display: "flex",
                paddingBottom: "20px",
                justifyContent: "space-evenly",
              }}
            >
              <Button type="reset" variant="outlined">
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </Box>
          </Box>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
