import { NextRequest, NextResponse } from 'next/server';
// [FIX] Removed generateUUID from this import
import { getDb } from '@/lib/mongodb'; 
import { MailSchema } from '@/lib/schemas';
import { z } from 'zod';
// [FIX] Added crypto import for generating UUIDs
import { randomUUID } from 'crypto'; 

export async function GET() {
  console.log('[GET /api/mails] - Request received');
  try {
    console.log('[GET] - Connecting to database...');
    const db = await getDb();
    console.log('[GET] - Database connection successful. Fetching collection...');
    const collection = db.collection('mails');
    
    console.log('[GET] - Finding all mails...');
    const mails = await collection.find({}).toArray();
    console.log(`[GET] - Found ${mails.length} mails.`);

    return NextResponse.json(mails);
  } catch (error) {
    console.error('[GET] - Error fetching mails:', error);
    return NextResponse.json({ error: 'Failed to fetch mails' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[POST /api/mails] - Request received');
  try {
    console.log('[POST] - Parsing request body as JSON...');
    const body = await request.json();
    console.log('[POST] - Request body received:', body);

    console.log('[POST] - Validating schema with Zod...');
    // This will work once MailSchema has uuid as .optional()
    const { uuid, ...validatedData } = MailSchema.parse(body);
    console.log('[POST] - Zod validation successful.');

    // This logic is correct: provide a uuid if one wasn't sent.
    const data = { uuid: uuid || generateUUID(), ...validatedData };
    console.log('[POST] - Final data object to be inserted:', data);

    console.log('[POST] - Connecting to database...');
    const db = await getDb();
    console.log('[POST] - Database connection successful.');

    // Check if the associated profile exists
    console.log(`[POST] - Checking for profile with uuid: ${data.user_uuid}`);
    const profileExists = await db.collection('profiles').findOne({ uuid: data.user_uuid });

    if (!profileExists) {
      console.warn('[POST] - Profile not found.');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    console.log('[POST] - Profile found. Proceeding with mail creation...');

    const collection = db.collection('mails');
    console.log('[POST] - Inserting new mail into database...');
    const result = await collection.insertOne(data);
    console.log('[POST] - Insert successful. Result:', result);

    const newMail = { ...data, _id: result.insertedId };
    console.log('[POST] - Sending new mail as response.');
    return NextResponse.json(newMail, { status: 201 });
  } catch (error) {
    console.error('[POST] - An error occurred:', error);
    
    if (error instanceof z.ZodError) {
      console.error('[POST] - Zod validation error:', error.cause);
      // [FIX] Returning detailed Zod errors
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }

    // [FIX] Returning a more detailed generic error
    return NextResponse.json(
      { 
        error: 'Failed to create mail',
        details: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}

/**
 * [FIX] Added local UUID generator function
 */
function generateUUID(): string {
  console.log('[UTIL] - Generating new UUID...');
  return randomUUID();
}