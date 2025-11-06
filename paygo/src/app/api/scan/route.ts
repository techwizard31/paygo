import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { z } from 'zod';

const ScanSchema = z.object({
  profile_uuid: z.string().uuid(),
  mail_uuid: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile_uuid, mail_uuid } = ScanSchema.parse(body);
    const db = await getDb();
    const profile = await db.collection('profiles').findOne({ uuid: profile_uuid });
    const mail = await db.collection('mails').findOne({ uuid: mail_uuid });
    if (!profile || !mail) {
      return NextResponse.json({ error: 'Profile or mail not found' }, { status: 404 });
    }
    const result = await db.collection('profiles').updateOne(
      { uuid: profile_uuid },
      { $addToSet: { scanned: mail_uuid } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Failed to scan' }, { status: 500 });
    }
    const updatedProfile = await db.collection('profiles').findOne({ uuid: profile_uuid });
    return NextResponse.json({ message: 'Mail scanned', profile: updatedProfile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.cause }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to scan mail' }, { status: 500 });
  }
}