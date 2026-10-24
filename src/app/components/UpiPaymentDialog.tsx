"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CheckCircle, ContentCopy, Close, WhatsApp, PhoneIphone } from "@mui/icons-material";
import QRCode from "react-qr-code";
import { useSiteSettings } from "@/app/hooks/useSiteSettings";
import { buildUpiUrl, isValidUtr, normalizeUtr } from "@/app/lib/upi";
import { waNumber } from "@/app/lib/pricing";

export type UpiPaymentKind = "booking" | "subscription" | "tournament";

interface UpiPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Amount to collect — display only; the server uses the stored record's amount. */
  amount: number;
  /** Which record the proof is for; required unless submitUtr is given. */
  kind?: UpiPaymentKind;
  refId?: string;
  /** Custom submission (e.g. member fee pay page); defaults to POST /api/payments. */
  submitUtr?: (utr: string) => Promise<{ success: boolean; error?: string }>;
  title?: string;
  /** Shown in the UPI app's note so you can match the credit. */
  note: string;
  /** Offer "Pay at venue / later" instead of forcing payment now. */
  allowPayLater?: boolean;
  onSubmitted?: () => void;
  onPayLater?: () => void;
}

export default function UpiPaymentDialog({
  open,
  onClose,
  amount,
  kind,
  refId,
  submitUtr,
  title = "Pay with UPI",
  note,
  allowPayLater = false,
  onSubmitted,
  onPayLater,
}: UpiPaymentDialogProps) {
  const { settings } = useSiteSettings();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [utr, setUtr] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setUtr("");
      setTouched(false);
      setError("");
      setDone(false);
    }
  }, [open]);

  const upiUrl = useMemo(
    () => buildUpiUrl({ vpa: settings.upi.vpa, payeeName: settings.upi.payeeName, amount, note }),
    [settings.upi, amount, note]
  );

  const utrValid = isValidUtr(utr);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(settings.upi.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the ID is visible to copy manually */
    }
  };

  const submit = async () => {
    setTouched(true);
    if (!utrValid) return;
    setSubmitting(true);
    setError("");
    try {
      const data = submitUtr
        ? await submitUtr(normalizeUtr(utr))
        : await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, refId, utr: normalizeUtr(utr) }),
          }).then((r) => r.json());
      if (!data.success) {
        setError(data.error || "Could not submit payment. Please try again.");
        return;
      }
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const helpUrl = `https://wa.me/${waNumber(settings.whatsappNumber)}?text=${encodeURIComponent(
    `Hi, I need help paying ₹${amount} for ${note}`
  )}`;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {done ? "Payment submitted" : title}
        <IconButton aria-label="Close" onClick={onClose} disabled={submitting} sx={{ position: "absolute", right: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {done ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 3, textAlign: "center" }}>
            <CheckCircle color="success" sx={{ fontSize: 72 }} />
            <Typography variant="h6">Thank you!</Typography>
            <Typography color="text.secondary">
              We have received your UPI reference <b>{normalizeUtr(utr)}</b>. You will get a confirmation once we
              verify the payment — usually within a few hours.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">Amount to pay</Typography>
              <Typography variant="h3" fontWeight={800} color="primary.main">₹{amount.toLocaleString("en-IN")}</Typography>
              <Typography variant="caption" color="text.secondary">{note}</Typography>
            </Box>

            {/* Step 1: pay */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>1. Pay using any UPI app</Typography>
              {/* QR works with every UPI app; app links to personal UPI IDs are often blocked */}
              <Box sx={{ display: "flex", justifyContent: "center", p: 2, bgcolor: "#fff", borderRadius: 2, border: 1, borderColor: "divider" }}>
                <QRCode value={upiUrl} size={fullScreen ? 200 : 180} />
              </Box>
              {fullScreen && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1 }}>
                    On this phone? Take a screenshot, open your UPI app → Scan QR → choose from gallery.
                  </Typography>
                  <Button fullWidth variant="outlined" startIcon={<PhoneIphone />} href={upiUrl} sx={{ mt: 1.5, py: 1.2 }}>
                    Or open UPI app directly
                  </Button>
                </>
              )}
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 1.5 }}>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  UPI ID: <b>{settings.upi.vpa}</b>
                </Typography>
                <IconButton size="small" onClick={copyUpiId} aria-label="Copy UPI ID">
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Stack>
              {copied && <Typography variant="caption" color="success.main" display="block" textAlign="center">Copied</Typography>}
            </Box>

            {/* Step 2: proof */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>2. Enter the UPI reference number</Typography>
              <TextField
                fullWidth
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/[^\d\s]/g, ""))}
                onBlur={() => setTouched(true)}
                placeholder="12-digit UTR, e.g. 412345678901"
                inputProps={{ inputMode: "numeric", maxLength: 16, "aria-label": "UPI reference number" }}
                error={touched && utr.length > 0 && !utrValid}
                helperText={
                  touched && utr.length > 0 && !utrValid
                    ? "UTR must be exactly 12 digits"
                    : "Find it in your UPI app → payment details → UPI Ref No. / UTR"
                }
              />
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<WhatsApp />}
              size="small"
              sx={{ alignSelf: "center", color: "#128C7E" }}
            >
              Need help? Chat on WhatsApp
            </Button>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: "wrap" }}>
        {done ? (
          <Button fullWidth variant="contained" onClick={onClose}>Done</Button>
        ) : (
          <>
            {allowPayLater && (
              <Button onClick={() => (onPayLater ? onPayLater() : onClose())} disabled={submitting}>
                Pay at venue
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              size="large"
              onClick={submit}
              disabled={submitting || !utrValid}
              sx={{ minWidth: 160 }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : "I have paid"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
