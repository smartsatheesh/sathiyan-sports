import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Inventory from '@/app/models/Inventory';
import { parseProduct } from '@/app/lib/inventory.server';

export const dynamic = 'force-dynamic';

// GET: public shop list; staff (admin/coach) also see stock levels and hidden items
export async function GET() {
  await connectToMongoose();
  const session = await getServerSession(authOptions);
  const isStaff = session?.user?.role === 'admin' || session?.user?.role === 'coach';

  const products = await (Inventory.find as any)(isStaff ? {} : { showInShop: true })
    .sort({ category: 1, name: 1 })
    .lean();

  const list = products.map((p: any) => ({
    _id: p._id,
    name: p.name,
    category: p.category,
    description: p.description,
    price: p.price,
    unit: p.unit,
    imageUrl: p.hasImage ? `/api/inventory/${p._id}/image?v=${new Date(p.updatedAt).getTime()}` : null,
    // Customers only see whether it's available, not exact counts
    ...(isStaff
      ? { stock: p.stock, lowStockAt: p.lowStockAt, showInShop: p.showInShop }
      : { inStock: p.stock > 0 }),
  }));
  return NextResponse.json({ success: true, products: list });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const [data, error] = parseProduct(await request.json());
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  await connectToMongoose();
  const product = await (Inventory.create as any)({
    ...data,
    history: data.stock ? [{ change: data.stock, reason: 'Opening stock', by: session.user.name }] : [],
  });
  return NextResponse.json({ success: true, id: product._id });
}
