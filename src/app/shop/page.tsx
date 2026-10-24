"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Inventory2, Remove, Search, ShoppingBag, WhatsApp } from "@mui/icons-material";
import { useSiteSettings } from "@/app/hooks/useSiteSettings";
import { waNumber } from "@/app/lib/pricing";

interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  unit: string;
  inStock?: boolean;
  stock?: number;
  imageUrl: string | null;
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const CART_KEY = "sathiyan-shop-cart";

export default function ShopPage() {
  const { settings } = useSiteSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((d) => setProducts((d.products || []).filter((p: Product) => p.price > 0)))
      .finally(() => setLoading(false));
    try {
      setCart(JSON.parse(localStorage.getItem(CART_KEY) || "{}"));
    } catch {
      /* storage unavailable — cart just won't persist */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const available = (p: Product) => p.inStock ?? (p.stock ?? 0) > 0;
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category))).sort()], [products]);
  const visible = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      (!query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const setQty = (id: string, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 99);
      return next;
    });

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p._id === id), qty }))
    .filter((l): l is { product: Product; qty: number } => Boolean(l.product));
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);

  const orderText =
    `Hi Sathiyan Sports, I'd like to order:\n\n` +
    lines.map((l) => `• ${l.product.name} × ${l.qty} = ${rupees(l.qty * l.product.price)}`).join("\n") +
    `\n\nTotal: ${rupees(total)}\n\nPlease confirm availability. Thank you!`;
  const orderUrl = `https://wa.me/${waNumber(settings.whatsappNumber)}?text=${encodeURIComponent(orderText)}`;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, pb: 14 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={900}>Shop</Typography>
        <Typography color="text.secondary">
          Shuttles, balls, rackets and more — pick up at the academy. Order on WhatsApp, pay by UPI or cash.
        </Typography>
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Search products"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 1.5, maxWidth: { sm: 400 } }}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: "auto", pb: 0.5 }}>
        {categories.map((c) => (
          <Chip key={c} label={c} color={category === c ? "primary" : "default"} variant={category === c ? "filled" : "outlined"} onClick={() => setCategory(c)} />
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : visible.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 8, color: "text.secondary" }}>
          <Inventory2 sx={{ fontSize: 48 }} />
          <Typography>No products to show yet.</Typography>
        </Stack>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {visible.map((p) => {
            const qty = cart[p._id] || 0;
            const inStock = available(p);
            return (
              <Grid item xs={6} sm={4} md={3} key={p._id}>
                <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", opacity: inStock ? 1 : 0.6 }}>
                  {p.imageUrl ? (
                    <CardMedia component="img" image={p.imageUrl} alt={p.name} loading="lazy" sx={{ aspectRatio: "1", objectFit: "cover" }} />
                  ) : (
                    <Box sx={{ aspectRatio: "1", bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Inventory2 sx={{ fontSize: 44, color: "text.disabled" }} />
                    </Box>
                  )}
                  <CardContent sx={{ p: 1.5, flex: 1, display: "flex", flexDirection: "column" }}>
                    <Typography fontWeight={700} sx={{ lineHeight: 1.25 }}>{p.name}</Typography>
                    {p.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                      </Typography>
                    )}
                    <Typography variant="h6" fontWeight={800} sx={{ mt: "auto", pt: 1 }}>{rupees(p.price)}</Typography>
                    {!inStock ? (
                      <Chip size="small" label="Out of stock" sx={{ mt: 1, alignSelf: "flex-start" }} />
                    ) : qty === 0 ? (
                      <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setQty(p._id, 1)} sx={{ mt: 1 }}>
                        Add
                      </Button>
                    ) : (
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, border: 1, borderColor: "primary.main", borderRadius: 1 }}>
                        <IconButton size="small" onClick={() => setQty(p._id, qty - 1)} aria-label={`Remove one ${p.name}`}><Remove /></IconButton>
                        <Typography fontWeight={700}>{qty}</Typography>
                        <IconButton size="small" onClick={() => setQty(p._id, qty + 1)} aria-label={`Add one ${p.name}`}><Add /></IconButton>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {itemCount > 0 && (
        <Paper
          elevation={8}
          sx={{ position: "fixed", left: 0, right: 0, bottom: 0, p: 1.5, pb: "calc(12px + env(safe-area-inset-bottom, 0px))", zIndex: 1100 }}
        >
          <Container maxWidth="sm">
            <Button fullWidth size="large" variant="contained" onClick={() => setCartOpen(true)} sx={{ py: 1.4, justifyContent: "space-between" }}>
              <Badge badgeContent={itemCount} color="secondary"><ShoppingBag /></Badge>
              <span>View order</span>
              <span>{rupees(total)}</span>
            </Button>
          </Container>
        </Paper>
      )}

      <Drawer anchor="bottom" open={cartOpen} onClose={() => setCartOpen(false)} PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "85vh" } }}>
        <Container maxWidth="sm" sx={{ py: 2.5, pb: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Your order</Typography>
          <Stack divider={<Divider />} spacing={1}>
            {lines.map(({ product, qty }) => (
              <Stack key={product._id} direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ flex: 1 }} noWrap>{product.name}</Typography>
                <IconButton size="small" onClick={() => setQty(product._id, qty - 1)} aria-label="Less"><Remove fontSize="small" /></IconButton>
                <Typography fontWeight={700}>{qty}</Typography>
                <IconButton size="small" onClick={() => setQty(product._id, qty + 1)} aria-label="More"><Add fontSize="small" /></IconButton>
                <Typography sx={{ width: 80, textAlign: "right" }} fontWeight={600}>{rupees(qty * product.price)}</Typography>
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, mb: 2 }}>
            <Typography fontWeight={800}>Total</Typography>
            <Typography fontWeight={800}>{rupees(total)}</Typography>
          </Stack>
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<WhatsApp />}
            href={orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ py: 1.4, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5b" } }}
          >
            Order on WhatsApp
          </Button>
          <Button fullWidth color="inherit" sx={{ mt: 1 }} onClick={() => setCart({})}>Clear</Button>
        </Container>
      </Drawer>
    </Container>
  );
}
