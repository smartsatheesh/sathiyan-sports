"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import { ArrowForward, Login, LocationOn, Settings, WhatsApp } from "@mui/icons-material";
import MembershipFeeCard from "../../components/MembershipFeeCard";
import { PublicClub } from "../../lib/clubs";
import { waNumber } from "../../lib/pricing";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function ClubHome({ club }: { club: PublicClub }) {
  const { data: session } = useSession();
  const user = session?.user;
  const isMember = user?.club === club.slug;
  const isClubAdmin = isMember && user?.role === "club_admin";
  const whatsapp = club.whatsappNumber
    ? `https://wa.me/${waNumber(club.whatsappNumber)}?text=${encodeURIComponent(`Hi ${club.name}! I'd like to know more about joining.`)}`
    : null;

  return (
    <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100vh" }}>
      <Box sx={{ background: `linear-gradient(135deg, ${club.color} 0%, #071a2e 100%)`, color: "#fff", py: { xs: 5, md: 8 } }}>
        <Container maxWidth="md">
          {club.city && (
            <Chip icon={<LocationOn sx={{ color: "#fff !important" }} />} label={club.city} sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff", mb: 2, fontWeight: 600 }} />
          )}
          <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: "2.2rem", md: "3.4rem" }, lineHeight: 1.05 }}>
            {club.name}
          </Typography>
          {club.tagline && <Typography sx={{ mt: 1.5, fontSize: { xs: "1.05rem", md: "1.2rem" }, opacity: 0.92, maxWidth: 620 }}>{club.tagline}</Typography>}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
            {isClubAdmin ? (
              <Button component={Link} href="/admin" size="large" variant="contained" startIcon={<Settings />} sx={{ bgcolor: "#ffc400", color: "#111", fontWeight: 900, "&:hover": { bgcolor: "#ffd740" } }}>
                Manage the club
              </Button>
            ) : !isMember ? (
              <>
                <Button component={Link} href={`/register?club=${club.slug}`} size="large" variant="contained" endIcon={<ArrowForward />} sx={{ bgcolor: "#ffc400", color: "#111", fontWeight: 900, "&:hover": { bgcolor: "#ffd740" } }}>
                  Join the club
                </Button>
                <Button component={Link} href={`/auth/login?club=${club.slug}`} size="large" variant="outlined" startIcon={<Login />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
                  Member login
                </Button>
              </>
            ) : null}
            {whatsapp && (
              <Button href={whatsapp} target="_blank" rel="noopener noreferrer" size="large" startIcon={<WhatsApp />} sx={{ color: "#fff", fontWeight: 700 }}>
                WhatsApp us
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {isMember && !isClubAdmin && (
          <>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
            </Typography>
            <MembershipFeeCard />
          </>
        )}

        <Typography sx={{ color: club.color, fontWeight: 800, letterSpacing: 2, fontSize: 13, textTransform: "uppercase" }}>Coaching</Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: "1.7rem", md: "2.2rem" }, mb: 2.5 }}>Programmes & monthly fees</Typography>
        {club.programs.length === 0 ? (
          <Typography color="text.secondary">Fees will be listed here soon — message the club on WhatsApp meanwhile.</Typography>
        ) : (
          <Grid container spacing={2}>
            {club.programs.map((p) => {
              const adult = p.adultMonthly ?? p.monthly;
              return (
                <Grid item xs={12} sm={6} md={4} key={p.key}>
                  <Card sx={{ height: "100%", borderTop: `4px solid ${club.color}`, borderRadius: 3 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>{p.name}</Typography>
                      {adult === p.monthly ? (
                        <Typography sx={{ mt: 1 }}><b style={{ fontSize: "1.8rem" }}>{rupees(p.monthly)}</b> / month · all ages</Typography>
                      ) : (
                        <Stack sx={{ mt: 1 }}>
                          <Typography><b style={{ fontSize: "1.6rem" }}>{rupees(p.monthly)}</b> / month · kids</Typography>
                          <Typography><b style={{ fontSize: "1.2rem" }}>{rupees(adult)}</b> / month · adults</Typography>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Pay monthly, quarterly, half-yearly or yearly by UPI{club.upi.payeeName ? ` to ${club.upi.payeeName}` : ""} — you&apos;ll get a reminder on WhatsApp when it&apos;s due.
        </Typography>
      </Container>

      <Box sx={{ borderTop: 1, borderColor: "divider", py: 3, textAlign: "center", bgcolor: "#fff" }}>
        <Typography variant="body2" color="text.secondary">
          Memberships & fees powered by{" "}
          <Link href="/" style={{ fontWeight: 700, color: "inherit" }}>
            Sathiyan Sports
          </Link>{" "}
          · run your club here too
        </Typography>
      </Box>
    </Box>
  );
}
