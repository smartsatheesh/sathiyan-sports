const MAX_IMAGE_CHARS = 400_000; // ~300 KB image; the browser resizes before upload

/** Validates product fields from a request body. Returns [data, error]. */
export function parseProduct(body: any, opts: { partial?: boolean } = {}): [any, string | null] {
  const data: any = {};
  const has = (k: string) => body[k] !== undefined;

  if (!opts.partial || has('name')) {
    const name = String(body.name || '').trim();
    if (!name) return [null, 'Product name is required'];
    data.name = name.slice(0, 80);
  }
  if (has('category')) data.category = String(body.category || 'General').trim().slice(0, 40) || 'General';
  if (has('description')) data.description = String(body.description || '').trim().slice(0, 400);
  if (has('unit')) data.unit = String(body.unit || 'pcs').trim().slice(0, 20) || 'pcs';
  for (const k of ['price', 'lowStockAt', 'stock']) {
    if (has(k)) {
      const n = Number(body[k]);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return [null, `Invalid ${k}`];
      data[k] = k === 'price' ? n : Math.trunc(n);
    }
  }
  if (has('showInShop')) data.showInShop = Boolean(body.showInShop);

  if (has('image')) {
    if (body.image === null || body.image === '') {
      data.image = undefined;
      data.hasImage = false;
    } else {
      const img = String(body.image);
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(img)) return [null, 'Photo must be JPEG, PNG or WebP'];
      if (img.length > MAX_IMAGE_CHARS) return [null, 'Photo is too large'];
      data.image = img;
      data.hasImage = true;
    }
  }
  return [data, null];
}
