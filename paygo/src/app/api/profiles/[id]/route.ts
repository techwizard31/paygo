import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ProfileSchema } from '@/lib/schemas';
import { generateUUID } from '@/lib/mongodb'; // Import if needed for creation edge cases
import {z} from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const collection = db.collection('profiles');
    const profile = await collection.findOne({ uuid: params.id });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = await getDb();
    const collection = db.collection('profiles');
    const validated = ProfileSchema.partial().parse(body); // Partial for updates
    const result = await collection.updateOne(
      { uuid: params.id },
      { $set: validated }
    );
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const updated = await collection.findOne({ uuid: params.id });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.cause }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const collection = db.collection('profiles');
    await db.collection('mails').deleteMany({ user_uuid: params.id }); // Cascade delete mails
    const result = await collection.deleteOne({ uuid: params.id });
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ message: 'Profile deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}