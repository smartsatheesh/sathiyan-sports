"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Badge,
  Box,
  Card,
  CardActionArea,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  AccountBalanceWallet,
  BarChart,
  CalendarMonth,
  EmojiEvents,
  EventAvailable,
  FactCheck,
  Groups,
  Inventory2,
  LockReset,
  Payments,
  QrCode2,
  ReceiptLong,
  Settings,
  Storefront,
  Star,
} from "@mui/icons-material";

interface Overview {
  todaysBookings: number;
  pendingBookings: number;
  paymentsToVerify: number;
  resetRequests: number;
  pendingReviews: number;
  feesOverdue: { count: number; amount: number };
  feesDueThisWeek: number;
  month: { moneyIn: number; spent: number; net: number };
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Snapshot({ label, value, sub, href, tone }: { label: string; value: React.ReactNode; sub?: string; href: string; tone?: "error" | "warning" | "success" }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardActionArea component={Link} href={href} sx={{ p: { xs: 1.5, sm: 2 }, height: "100%", display: "block" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.4rem", sm: "1.8rem" }, lineHeight: 1.3, color: tone ? `${tone}.main` : "text.primary" }}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardActionArea>
    </Card>
  );
}

export default function AdminHome() {
  const { data: session } = useSession();
  const [o, setO] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => d.success && setO(d))
      .catch(() => {});
  }, []);

  const sections: { title: string; desc: string; href: string; icon: React.ReactNode; badge?: number }[] = [
    { title: "Bookings & members", desc: "All bookings, users, slot stats", href: "/admin/manage", icon: <Groups /> },
    { title: "Book a slot", desc: "Walk-in or phone booking", href: "/bookslot", icon: <EventAvailable /> },
    { title: "Membership fees", desc: "Who has paid, reminders", href: "/admin/fees", icon: <AccountBalanceWallet />, badge: o?.feesOverdue.count },
    { title: "Verify payments", desc: "Confirm UPI payments", href: "/admin/payments", icon: <Payments />, badge: o?.paymentsToVerify },
    { title: "Expenses", desc: "Add spends, monthly report", href: "/admin/expenses", icon: <ReceiptLong /> },
    { title: "Inventory", desc: "Products & stock", href: "/admin/inventory", icon: <Inventory2 /> },
    { title: "Tournaments", desc: "Events, fixtures, results", href: "/admin/tournaments", icon: <EmojiEvents /> },
    { title: "Attendance", desc: "Check-ins and reports", href: "/admin/attendance", icon: <FactCheck /> },
    { title: "AI coach plans", desc: "Members' plans & progress", href: "/coach/admin", icon: <BarChart /> },
    { title: "Check-in QR", desc: "Print the venue QR", href: "/admin/universal-qr", icon: <QrCode2 /> },
    { title: "Password resets", desc: "Send reset links", href: "/admin/password-resets", icon: <LockReset />, badge: o?.resetRequests },
    { title: "Reviews", desc: "Approve member reviews", href: "/admin/reviews", icon: <Star />, badge: o?.pendingReviews },
    { title: "Shop page", desc: "What customers see", href: "/shop", icon: <Storefront /> },
    { title: "Prices & settings", desc: "Fees, UPI, WhatsApp", href: "/admin/settings", icon: <Settings /> },
  ];

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={800}>
          Hello{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.75} color="text.secondary">
          <CalendarMonth fontSize="small" />
          <Typography variant="body2">{today}</Typography>
        </Stack>
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {!o ? (
          [0, 1, 2, 3].map((i) => (
            <Grid item xs={6} sm={3} key={i}><Skeleton variant="rounded" height={92} /></Grid>
          ))
        ) : (
          <>
            <Grid item xs={6} sm={3}>
              <Snapshot
                label="Bookings today"
                value={o.todaysBookings}
                sub={o.pendingBookings ? `${o.pendingBookings} awaiting payment` : undefined}
                href="/admin/manage"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Snapshot
                label="Payments to verify"
                value={o.paymentsToVerify}
                href="/admin/payments"
                tone={o.paymentsToVerify ? "warning" : undefined}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Snapshot
                label="Fees overdue"
                value={o.feesOverdue.count}
                sub={`${rupees(o.feesOverdue.amount)} · ${o.feesDueThisWeek} due this week`}
                href="/admin/fees"
                tone={o.feesOverdue.count ? "error" : undefined}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Snapshot
                label="This month"
                value={rupees(o.month.net)}
                sub={`in ${rupees(o.month.moneyIn)} · out ${rupees(o.month.spent)}`}
                href="/admin/expenses"
                tone={o.month.net >= 0 ? "success" : "error"}
              />
            </Grid>
          </>
        )}
      </Grid>

      <Grid container spacing={1.5}>
        {sections.map((s) => (
          <Grid item xs={6} sm={4} key={s.href}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea component={Link} href={s.href} sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start" }}>
                <Badge badgeContent={s.badge || 0} color="error" max={99}>
                  <Paper elevation={0} sx={{ p: 1, bgcolor: "primary.main", color: "#fff", borderRadius: 2, display: "flex" }}>
                    {s.icon}
                  </Paper>
                </Badge>
                <Typography fontWeight={700} sx={{ mt: 1.25, lineHeight: 1.25 }}>{s.title}</Typography>
                <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
