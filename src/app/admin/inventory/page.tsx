"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Add, AddPhotoAlternate, DeleteOutline, Inventory2, OpenInNew, Remove, Search } from "@mui/icons-material";
import Link from "next/link";
import { resizeImage } from "@/app/lib/resizeImage";

interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  unit: string;
  stock: number;
  lowStockAt: number;
  showInShop: boolean;
  imageUrl: string | null;
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function AdminInventoryPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category))).sort()], [products]);
  const lowCount = products.filter((p) => p.stock <= p.lowStockAt).length;
  const stockValue = products.reduce((s, p) => s + Math.max(p.stock, 0) * p.price, 0);

  const visible = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      (!lowOnly || p.stock <= p.lowStockAt) &&
      (!query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  // Optimistic +/- so counting stock on the floor is quick
  const adjust = async (p: Product, change: number) => {
    setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, stock: x.stock + change } : x)));
    const res = await fetch(`/api/inventory/${p._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "Could not update stock");
      load();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, pb: 12 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={800}>Inventory</Typography>
        <Button component={Link} href="/shop" target="_blank" size="small" endIcon={<OpenInNew />}>View shop</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {products.length} products · stock worth {rupees(stockValue)}
        {lowCount > 0 && <> · <b style={{ color: theme.palette.error.main }}>{lowCount} running low</b></>}
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <Chip
          label={`Low stock (${lowCount})`}
          color={lowOnly ? "error" : "default"}
          variant={lowOnly ? "filled" : "outlined"}
          onClick={() => setLowOnly((v) => !v)}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.5 }}>
        {categories.map((c) => (
          <Chip key={c} label={c} color={category === c ? "primary" : "default"} variant={category === c ? "filled" : "outlined"} onClick={() => setCategory(c)} />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : visible.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 6, color: "text.secondary" }}>
          <Inventory2 sx={{ fontSize: 48 }} />
          <Typography>{products.length === 0 ? "No products yet — add your first one." : "Nothing matches."}</Typography>
        </Stack>
      ) : (
        <Grid container spacing={1.5}>
          {visible.map((p) => {
            const low = p.stock <= p.lowStockAt;
            return (
              <Grid item xs={6} sm={4} md={3} key={p._id}>
                <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <CardActionArea onClick={() => setEditing(p)}>
                    {p.imageUrl ? (
                      <CardMedia component="img" image={p.imageUrl} alt={p.name} sx={{ aspectRatio: "1", objectFit: "cover" }} />
                    ) : (
                      <Box sx={{ aspectRatio: "1", bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Inventory2 sx={{ fontSize: 40, color: "text.disabled" }} />
                      </Box>
                    )}
                    <CardContent sx={{ p: 1.25, pb: "4px !important" }}>
                      <Typography fontWeight={700} noWrap>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {p.price > 0 ? rupees(p.price) : "Not for sale"} · {p.category}
                      </Typography>
                      {!p.showInShop && <Chip size="small" label="Hidden from shop" sx={{ mt: 0.5 }} />}
                    </CardContent>
                  </CardActionArea>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, pb: 0.5, mt: "auto" }}>
                    <IconButton size="small" onClick={() => adjust(p, -1)} disabled={p.stock <= 0} aria-label={`One less ${p.name}`}>
                      <Remove />
                    </IconButton>
                    <Typography fontWeight={800} color={low ? "error.main" : "text.primary"}>
                      {p.stock} <Typography component="span" variant="caption" color="text.secondary">{p.unit}</Typography>
                    </Typography>
                    <IconButton size="small" onClick={() => adjust(p, 1)} aria-label={`One more ${p.name}`}>
                      <Add />
                    </IconButton>
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Fab
        color="primary"
        variant="extended"
        onClick={() => setEditing({ showInShop: true, unit: "pcs", lowStockAt: 5, category: category === "All" ? "" : category })}
        sx={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Add sx={{ mr: 1 }} /> Add product
      </Fab>

      {editing && (
        <ProductDialog
          product={editing}
          categories={categories.filter((c) => c !== "All")}
          fullScreen={fullScreen}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </Container>
  );
}

function ProductDialog({
  product,
  categories,
  fullScreen,
  onClose,
  onSaved,
}: {
  product: Partial<Product>;
  categories: string[];
  fullScreen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !product._id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product.name || "");
  const [cat, setCat] = useState(product.category || "");
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price !== undefined ? String(product.price) : "");
  const [stock, setStock] = useState("0");
  const [lowStockAt, setLowStockAt] = useState(String(product.lowStockAt ?? 5));
  const [unit, setUnit] = useState(product.unit || "pcs");
  const [showInShop, setShowInShop] = useState(product.showInShop ?? true);
  const [image, setImage] = useState<string | null | undefined>(undefined); // undefined = unchanged
  const [adjustBy, setAdjustBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const preview = image === undefined ? product.imageUrl : image;

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setImage(await resizeImage(file));
    } catch {
      setError("Could not read that photo");
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body: any = {
        name,
        category: cat || "General",
        description,
        price: Number(price) || 0,
        lowStockAt: Number(lowStockAt) || 0,
        unit,
        showInShop,
      };
      if (isNew) body.stock = Number(stock) || 0;
      if (image !== undefined) body.image = image;

      const res = await fetch(isNew ? "/api/inventory" : `/api/inventory/${product._id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ success: false, error: `The server returned an error (${res.status}). Please try again.` }));
      if (!data.success) throw new Error(data.error);

      const change = Math.trunc(Number(adjustBy));
      if (!isNew && change) {
        await fetch(`/api/inventory/${product._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ change, reason: change > 0 ? "Restocked" : "Stock correction" }),
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setSaving(true);
    await fetch(`/api/inventory/${product._id}`, { method: "DELETE" });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle>{isNew ? "Add product" : "Edit product"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              aspectRatio: "16/10",
              borderRadius: 2,
              border: 1,
              borderStyle: preview ? "solid" : "dashed",
              borderColor: "divider",
              cursor: "pointer",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover",
              position: "relative",
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Stack alignItems="center" color="text.secondary">
                <AddPhotoAlternate sx={{ fontSize: 40 }} />
                <Typography variant="body2">Add photo</Typography>
              </Stack>
            )}
          </Box>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          {preview && (
            <Button size="small" color="inherit" onClick={() => setImage(null)} sx={{ alignSelf: "flex-start" }}>
              Remove photo
            </Button>
          )}

          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }} />
          <TextField
            label="Category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="e.g. Shuttles, Rackets, Drinks"
            inputProps={{ list: "product-categories", maxLength: 40 }}
          />
          <datalist id="product-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Selling price"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              inputProps={{ inputMode: "decimal" }}
              helperText="0 = not for sale"
              fullWidth
            />
            <TextField label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ width: 110 }} inputProps={{ maxLength: 20 }} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            {isNew ? (
              <TextField label="Opening stock" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} inputProps={{ inputMode: "numeric" }} fullWidth />
            ) : (
              <TextField
                label={`Add/remove stock (now ${product.stock})`}
                value={adjustBy}
                onChange={(e) => setAdjustBy(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="+20 or -3"
                inputProps={{ inputMode: "numeric" }}
                fullWidth
              />
            )}
            <TextField label="Alert below" value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value.replace(/\D/g, ""))} inputProps={{ inputMode: "numeric" }} sx={{ width: 130 }} />
          </Stack>
          <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 400 }} />
          <FormControlLabel control={<Switch checked={showInShop} onChange={(e) => setShowInShop(e.target.checked)} />} label="Show in public shop" />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!isNew && (
          <IconButton color="error" onClick={remove} disabled={saving} aria-label="Delete product">
            <DeleteOutline />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" size="large" onClick={save} disabled={saving || !name.trim()}>
          {saving ? <CircularProgress size={22} color="inherit" /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
