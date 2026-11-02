"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Rating,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowForward,
  Celebration,
  EmojiEvents,
  Groups,
  LocationOn,
  Phone,
  SportsCricket,
  SportsSoccer,
  SportsTennis,
  Star,
  WhatsApp,
  EventAvailable,
} from "@mui/icons-material";
import Footer from "./components/Footer";
import FeaturesSection from "./components/FeaturesSection";
import { HERO_SCENES } from "./components/landing/HeroScene";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { courtPriceLabel, getCourt, waNumber } from "./lib/pricing";

// three.js only loads in the browser, after the page text is on screen
const HeroScene = dynamic(() => import("./components/landing/HeroScene"), { ssr: false });

const NAVY = "#071a2e";
const GOLD = "#ffc400";
const ORANGE = "#ff6d00";
const TEAL = "#20b2aa";

const SPORTS = [
  { name: "Football", court: "Football", icon: <SportsSoccer />, color: "#2196f3", blurb: "FIFA-standard turf with floodlights. Ball on hire." },
  { name: "Cricket", court: "Cricket", icon: <SportsCricket />, color: "#43a047", blurb: "Full-size pitch with changing rooms. Ball on hire." },
  { name: "Badminton", court: "Shuttle Badminton", icon: <SportsTennis />, color: "#ff9800", blurb: "Three indoor wooden-floor courts, pro nets, rackets available." },
  { name: "Cricket Nets", court: "Cricket Nets", icon: <SportsCricket />, color: "#00897b", blurb: "Batting and bowling practice in the nets — come with a friend." },
  { name: "Events", court: "Functions and Events", icon: <Celebration />, color: "#ab47bc", blurb: "Hall for 500+ guests with A/V, catering and parking." },
];

interface Tournament {
  _id: string;
  name: string;
  sport?: string;
  status?: string;
  startDate?: string;
  venue?: string;
}

// Facility highlights shown until enough real reviews are approved (no names or ratings —
// these are the academy's own words, not testimonials).
const HIGHLIGHTS = [
  { title: "Cricket", icon: <SportsCricket />, color: "#43a047", text: "A well-maintained cricket pitch and top-notch equipment for serious players." },
  { title: "Football", icon: <SportsSoccer />, color: "#2196f3", text: "FIFA-standard turf with excellent lighting for evening games, and easy online booking." },
  { title: "Badminton", icon: <SportsTennis />, color: "#ff9800", text: "Professional courts with proper wooden flooring — perfect for training sessions and tournaments." },
  { title: "Events", icon: <Celebration />, color: "#ab47bc", text: "A spacious venue for company events and celebrations, with catering facilities and staff support." },
];
const MIN_REVIEWS_TO_REPLACE_HIGHLIGHTS = 3;

interface Review {
  _id: string;
  displayName: string;
  label?: string;
  rating: number;
  text: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function SectionTitle({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: { xs: 3, md: 4 } }}>
      <Typography sx={{ color: ORANGE, fontWeight: 800, letterSpacing: 2, fontSize: 13, textTransform: "uppercase" }}>{kicker}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: "1.8rem", md: "2.4rem" } }}>{title}</Typography>
      {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>{subtitle}</Typography>}
    </Box>
  );
}

export default function Home() {
  const { settings } = useSiteSettings();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [load3D, setLoad3D] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [freeze, setFreeze] = useState<number | undefined>(undefined);
  const [stats, setStats] = useState<{ totalUsers: number; totalBookings: number; totalEvents: number } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<{ list: Review[]; average: number | null; count: number }>({ list: [], average: null, count: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    // ?scene=1&t=1.5 freezes a frame (handy for previews and screenshots)
    const params = new URLSearchParams(window.location.search);
    const s = Number(params.get("scene"));
    if (params.has("scene") && s >= 0 && s < HERO_SCENES.length) setSceneIndex(s);
    if (params.has("t")) setFreeze(Number(params.get("t")));

    // Load the 3D stage once the browser is idle so text and buttons appear first
    const start = () => setLoad3D(true);
    const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: any) => number) | undefined;
    if (idle) idle(start, { timeout: 1500 });
    else setTimeout(start, 600);

    fetch("/api/public-stats").then((r) => r.json()).then((d) => d.stats && setStats(d.stats)).catch(() => {});
    fetch("/api/tournaments-native").then((r) => r.json()).then((d) => setTournaments((d.tournaments || d.data || []).slice(0, 3))).catch(() => {});
    fetch("/api/reviews").then((r) => r.json()).then((d) => d.success && setReviews({ list: d.reviews || [], average: d.average, count: d.count })).catch(() => {});
    fetch("/api/inventory").then((r) => r.json()).then((d) => setProducts((d.products || []).filter((p: Product) => p.price > 0).slice(0, 4))).catch(() => {});
  }, []);

  const nextScene = useCallback(() => setSceneIndex((i) => (i + 1) % HERO_SCENES.length), []);

  const whatsapp = `https://wa.me/${waNumber(settings.whatsappNumber)}?text=${encodeURIComponent("Hi Sathiyan Sports! I'd like to know more.")}`;
  const programs = settings.membership.programs;
  const ball = settings.extras.find((e) => e.key === "ball");

  return (
    <Box sx={{ bgcolor: "#f6f8fb", overflowX: "hidden" }}>
      {/* ================= HERO ================= */}
      <Box
        component="section"
        sx={{
          position: "relative",
          minHeight: { md: "calc(100vh - 64px)" },
          maxHeight: { md: 900 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "flex-end" },
          color: "#fff",
          background: `radial-gradient(ellipse at 70% 20%, #1e5f8a 0%, ${NAVY} 55%), ${NAVY}`,
          overflow: "hidden",
        }}
      >
        {/* 3D stage: its own block on phones, full-bleed behind the text on desktop */}
        <Box sx={{ position: { xs: "relative", md: "absolute" }, inset: { md: 0 }, height: { xs: "46svh", md: "auto" }, minHeight: { xs: 300 }, flexShrink: 0 }}>
          {load3D && (
            <HeroScene index={sceneIndex} onFinished={nextScene} still={reducedMotion} freezeAt={freeze} />
          )}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: {
                xs: `linear-gradient(180deg, rgba(7,26,46,0) 70%, ${NAVY} 100%)`,
                md: `linear-gradient(180deg, rgba(7,26,46,0) 35%, rgba(7,26,46,0.75) 75%, ${NAVY} 100%)`,
              },
            }}
          />
        </Box>

        {/* scene caption + picker */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "absolute", top: { xs: 14, md: 24 }, right: { xs: 14, md: 32 }, zIndex: 2 }}>
          <Chip
            label={HERO_SCENES[sceneIndex].caption}
            sx={{ bgcolor: "rgba(0,0,0,0.45)", color: "#fff", fontWeight: 800, backdropFilter: "blur(6px)", fontSize: { xs: 13, md: 15 } }}
          />
          {HERO_SCENES.map((s, i) => (
            <Box
              key={s.key}
              component="button"
              aria-label={`Show ${s.key} scene`}
              onClick={() => setSceneIndex(i)}
              sx={{ width: 10, height: 10, p: 0, borderRadius: "50%", border: "none", cursor: "pointer", bgcolor: i === sceneIndex ? GOLD : "rgba(255,255,255,0.45)" }}
            />
          ))}
        </Stack>

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2, pt: { xs: 1, md: 0 }, pb: { xs: 4, md: 8 } }}>
          <Chip
            icon={<LocationOn sx={{ color: `${GOLD} !important` }} />}
            label="Perungudi, Madurai"
            sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", mb: 2, fontWeight: 600 }}
          />
          <Typography
            component="h1"
            sx={{
              fontWeight: 900,
              lineHeight: 0.95,
              fontSize: { xs: "2.6rem", sm: "3.6rem", md: "5rem" },
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              textShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            Sathiyan
            <Box component="span" sx={{ display: "block", color: GOLD }}>Multisport Club</Box>
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 560, fontSize: { xs: "1.05rem", md: "1.25rem" }, opacity: 0.92 }}>
            Football, cricket and badminton under floodlights — coaching for kids and adults, courts by the half hour, and a venue for your big day.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3, maxWidth: { xs: "100%", sm: "none" } }}>
            <Button component={Link} href="/bookslot" size="large" variant="contained" endIcon={<ArrowForward />}
              sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#e65100" }, py: 1.5, px: 3.5, fontWeight: 800, fontSize: "1.05rem", borderRadius: 3 }}>
              Book a slot
            </Button>
            <Button component={Link} href="/register" size="large" variant="outlined"
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.7)", py: 1.5, px: 3.5, fontWeight: 800, borderRadius: 3, "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" } }}>
              Join the academy
            </Button>
            <Button href={whatsapp} target="_blank" rel="noopener noreferrer" size="large" startIcon={<WhatsApp />}
              sx={{ color: "#fff", py: 1.5, fontWeight: 700, borderRadius: 3 }}>
              WhatsApp us
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ================= STATS ================= */}
      <Box sx={{ bgcolor: NAVY, color: "#fff", py: { xs: 3, md: 4 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            {[
              { icon: <Groups />, value: stats ? `${stats.totalUsers}+` : "—", label: "Members" },
              { icon: <EventAvailable />, value: stats ? `${stats.totalBookings}+` : "—", label: "Bookings" },
              { icon: <EmojiEvents />, value: stats ? `${stats.totalEvents}+` : "—", label: "Events hosted" },
              { icon: <Star />, value: "3", label: "Sports, one venue" },
            ].map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: GOLD, display: "flex" }}>{s.icon}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.4rem", md: "1.8rem" }, lineHeight: 1.1 }}>{s.value}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>{s.label}</Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ================= PLAY ================= */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <SectionTitle kicker="Play" title="Book a court in a minute" subtitle="Pick a sport, choose your time, pay by UPI. Weekend prices apply Friday to Sunday and on holidays." />
        <Grid container spacing={2}>
          {SPORTS.map((s) => {
            const court = getCourt(settings, s.court);
            if (court && !court.active) return null;
            return (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={s.name}>
                <Card sx={{ height: "100%", borderRadius: 4, overflow: "hidden", boxShadow: "0 8px 30px rgba(7,26,46,0.08)" }}>
                  <CardActionArea component={Link} href="/bookslot" sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                    <Box sx={{ height: 6, bgcolor: s.color }} />
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${s.color}22`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
                        {s.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={800}>{s.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>{s.blurb}</Typography>
                      {court && (
                        <Box>
                          <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", lineHeight: 1.3 }}>
                            {courtPriceLabel(court, "weekday")}
                          </Typography>
                          {court.weekend !== court.weekday && (
                            <Typography variant="body2" color="text.secondary">
                              Fri–Sun & holidays: {courtPriceLabel(court, "weekend")}
                            </Typography>
                          )}
                          {["Cricket", "Football"].includes(s.court) && ball && (
                            <Typography variant="caption" color="text.secondary">Ball ₹{ball.price} extra</Typography>
                          )}
                        </Box>
                      )}
                      <Typography sx={{ mt: 1.5, color: s.color, fontWeight: 800, display: "flex", alignItems: "center", gap: 0.5 }}>
                        Book now <ArrowForward fontSize="small" />
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* ================= TRAIN ================= */}
      <Box sx={{ background: `linear-gradient(135deg, ${TEAL} 0%, #0d6e8a 100%)`, color: "#fff", py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Typography sx={{ color: GOLD, fontWeight: 800, letterSpacing: 2, fontSize: 13, textTransform: "uppercase" }}>Train</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: "1.8rem", md: "2.4rem" }, mb: 1 }}>Coaching for body and mind</Typography>
          <Typography sx={{ opacity: 0.9, mb: 4, maxWidth: 640 }}>
            Regular sessions with our coaches that build fitness, skills and confidence — with equal focus on physical and mental health for our kids.
          </Typography>
          <Grid container spacing={2}>
            {programs.map((p) => (
              <Grid item xs={12} sm={6} md={3} key={p.key}>
                <Box sx={{ bgcolor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 4, p: 3, height: "100%", backdropFilter: "blur(4px)" }}>
                  <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>{p.name}</Typography>
                  {(p.adultMonthly ?? p.monthly) === p.monthly ? (
                    <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ my: 1 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "2.2rem" }}>{rupees(p.monthly)}</Typography>
                      <Typography sx={{ opacity: 0.85 }}>/ month · all ages</Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={0.5} sx={{ my: 1 }}>
                      <Stack direction="row" alignItems="baseline" spacing={0.75}>
                        <Typography sx={{ fontWeight: 900, fontSize: "1.9rem" }}>{rupees(p.monthly)}</Typography>
                        <Typography sx={{ opacity: 0.85 }}>/ month · kids</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="baseline" spacing={0.75}>
                        <Typography sx={{ fontWeight: 900, fontSize: "1.4rem" }}>{rupees(p.adultMonthly ?? p.monthly)}</Typography>
                        <Typography sx={{ opacity: 0.85 }}>/ month · adults & veterans</Typography>
                      </Stack>
                    </Stack>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 2 }}>
            Coaching fees are per person and separate from court booking prices.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 4 }}>
            <Button component={Link} href="/register" size="large" variant="contained" sx={{ bgcolor: GOLD, color: NAVY, fontWeight: 900, py: 1.4, px: 4, borderRadius: 3, "&:hover": { bgcolor: "#ffd740" } }}>
              Join now
            </Button>
            <Button component={Link} href="/profile" size="large" sx={{ color: "#fff", fontWeight: 700 }}>
              Already a member? Pay fees →
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ================= COMPETE ================= */}
      {tournaments.length > 0 && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <SectionTitle kicker="Compete" title="Tournaments" subtitle="Brackets, live scores and results — all on your phone." />
          <Grid container spacing={2}>
            {tournaments.map((t) => (
              <Grid item xs={12} md={4} key={t._id}>
                <Card sx={{ borderRadius: 4, height: "100%", boxShadow: "0 8px 30px rgba(7,26,46,0.08)" }}>
                  <CardActionArea component={Link} href={`/tournaments/${t._id}`} sx={{ p: 2.5, height: "100%" }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      {t.status && <Chip size="small" label={t.status} color={t.status === "ongoing" ? "error" : t.status === "upcoming" ? "warning" : "default"} />}
                      {t.sport && <Chip size="small" variant="outlined" label={t.sport} />}
                    </Stack>
                    <Typography variant="h6" fontWeight={800}>{t.name}</Typography>
                    {t.startDate && (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(t.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </Typography>
                    )}
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Button component={Link} href="/tournaments" endIcon={<ArrowForward />} sx={{ mt: 2, fontWeight: 800 }}>All tournaments</Button>
        </Container>
      )}

      {/* ================= SHOP ================= */}
      {products.length > 0 && (
        <Box sx={{ bgcolor: "#fff", py: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <SectionTitle kicker="Gear" title="Shop at the academy" subtitle="Shuttles, balls and more — order on WhatsApp, pick up when you play." />
            <Grid container spacing={2}>
              {products.map((p) => (
                <Grid item xs={6} md={3} key={p._id}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
                    <CardActionArea component={Link} href="/shop">
                      {p.imageUrl ? (
                        <CardMedia component="img" image={p.imageUrl} alt={p.name} loading="lazy" sx={{ aspectRatio: "1", objectFit: "cover" }} />
                      ) : (
                        <Box sx={{ aspectRatio: "1", bgcolor: "action.hover" }} />
                      )}
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography fontWeight={700} noWrap>{p.name}</Typography>
                        <Typography fontWeight={900}>{rupees(p.price)}</Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Button component={Link} href="/shop" endIcon={<ArrowForward />} sx={{ mt: 2, fontWeight: 800 }}>Visit the shop</Button>
          </Container>
        </Box>
      )}

      {/* ================= REVIEWS (real, approved by the academy) ================= */}
      {reviews.list.length > 0 && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <SectionTitle
            kicker="Members say"
            title={reviews.average ? `Rated ${reviews.average} ★ by our members` : "What our members say"}
            subtitle={`${reviews.count} review${reviews.count === 1 ? "" : "s"} from people who train with us.`}
          />
          <Grid container spacing={2}>
            {reviews.list.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r._id}>
                <Card sx={{ borderRadius: 4, height: "100%", p: 2.5, boxShadow: "0 8px 30px rgba(7,26,46,0.08)", display: "flex", flexDirection: "column" }}>
                  <Rating value={r.rating} readOnly size="small" />
                  <Typography sx={{ mt: 1.5, flex: 1, fontSize: "1.02rem" }}>“{r.text}”</Typography>
                  <Typography fontWeight={800} sx={{ mt: 2 }}>{r.displayName}</Typography>
                  {r.label && <Typography variant="caption" color="text.secondary">{r.label}</Typography>}
                </Card>
              </Grid>
            ))}
          </Grid>
          <Button component={Link} href="/review" sx={{ mt: 2, fontWeight: 800 }}>Train with us? Write a review →</Button>
        </Container>
      )}

      {reviews.count < MIN_REVIEWS_TO_REPLACE_HIGHLIGHTS && (
        <Box sx={{ bgcolor: "#fff", py: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <SectionTitle kicker="Why players choose us" title="What you'll find at Sathiyan Sports" />
            <Grid container spacing={2}>
              {HIGHLIGHTS.map((h) => (
                <Grid item xs={12} sm={6} md={3} key={h.title}>
                  <Box sx={{ height: "100%", p: 2.5, borderRadius: 4, border: 1, borderColor: "divider", borderTop: `4px solid ${h.color}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: h.color, mb: 1 }}>
                      {h.icon}
                      <Typography fontWeight={800} color="text.primary">{h.title}</Typography>
                    </Stack>
                    <Typography color="text.secondary">{h.text}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      <FeaturesSection />

      {/* ================= VISIT ================= */}
      <Box sx={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #ff3d00 100%)`, color: "#fff", py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: "1.8rem", md: "2.4rem" } }}>Come play with us</Typography>
          <Typography sx={{ opacity: 0.92, mt: 1, mb: 3 }}>Perungudi, Madurai, Tamil Nadu</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button href={whatsapp} target="_blank" rel="noopener noreferrer" size="large" variant="contained" startIcon={<WhatsApp />}
              sx={{ bgcolor: "#fff", color: "#128C7E", fontWeight: 900, py: 1.4, px: 3, borderRadius: 3, "&:hover": { bgcolor: "#f1f8f4" } }}>
              Chat on WhatsApp
            </Button>
            <Button href={`tel:+${waNumber(settings.whatsappNumber)}`} size="large" variant="outlined" startIcon={<Phone />}
              sx={{ color: "#fff", borderColor: "#fff", fontWeight: 800, py: 1.4, px: 3, borderRadius: 3 }}>
              Call us
            </Button>
            <Button href="https://www.google.com/maps/search/?api=1&query=Sathiyan+Sports+Perungudi+Madurai" target="_blank" rel="noopener noreferrer"
              size="large" startIcon={<LocationOn />} sx={{ color: "#fff", fontWeight: 800, py: 1.4 }}>
              Directions
            </Button>
          </Stack>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
