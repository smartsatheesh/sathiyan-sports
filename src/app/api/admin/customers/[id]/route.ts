import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { isOwner } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { invalidateChamps } from '@/app/lib/customers.server';
import { connectToMongoose } from '@/app/server/mongodb';
import Customer from '@/app/models/Customer';

const MAX_PHOTO = 400 * 1024; // the browser resizes to ~320px, so a photo is a few tens of KB

/** Owner: edit a customer's name, email, notes, photo and whether they may appear as a champ. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(isOwner);
  if (!auth.ok) return auth.response;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  try {
    const body = await request.json();
    const set: Record<string, any> = {};
    const unset: Record<string, 1> = {};
    if (typeof body.name === 'string') set.name = body.name.trim().slice(0, 80);
    if (typeof body.email === 'string') set.email = body.email.trim().slice(0, 120);
    if (typeof body.notes === 'string') set.notes = body.notes.trim().slice(0, 500);
    if (typeof body.showOnLeaderboard === 'boolean') set.showOnLeaderboard = body.showOnLeaderboard;
    if (body.photo === null) unset.photo = 1;
    else if (typeof body.photo === 'string') {
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(body.photo) || body.photo.length > MAX_PHOTO) {
        return NextResponse.json({ success: false, error: 'Photo must be a small JPEG/PNG' }, { status: 400 });
      }
      set.photo = body.photo;
    }
    await connectToMongoose();
    const update: Record<string, any> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    const doc = await (Customer.findByIdAndUpdate as any)(params.id, update, { new: true }).select('mobile name email showOnLeaderboard notes updatedAt photo').lean();
    if (!doc) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    invalidateChamps();
    return NextResponse.json({
      success: true,
      customer: {
        id: String(doc._id), mobile: doc.mobile, name: doc.name, email: doc.email, notes: doc.notes, showOnLeaderboard: doc.showOnLeaderboard !== false,
        photoUrl: doc.photo ? `/api/customers/${doc._id}/photo?v=${new Date(doc.updatedAt || 0).getTime()}` : null,
      },
    });
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}
