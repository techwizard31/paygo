import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ProfileSchema } from '@/lib/schemas';
import { z } from 'zod';
// Import the 'crypto' module for UUID generation
import { randomUUID } from 'crypto';

export async function GET() {
  console.log('[GET /api/profiles] - Request received');
  try {
    console.log('[GET] - Connecting to database...');
    const db = await getDb();
    console.log('[GET] - Database connection successful. Fetching collection...');
    const collection = db.collection('profiles');

    console.log('[GET] - Finding all profiles...');
    const profiles = await collection.find({}).toArray();
    console.log(`[GET] - Found ${profiles.length} profiles.`);

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('[GET] - Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[POST /api/profiles] - Request received');
  try {
    console.log('[POST] - Parsing request body as JSON...');
    const body = await request.json();
    console.log('[POST] - Request body received:', body);

    console.log('[POST] - Validating schema with Zod...');
    // This now works because 'uuid' and 'scanned' are optional in the schema
    const { uuid, scanned, ...rest } = ProfileSchema.parse(body);
    console.log('[POST] - Zod validation successful.');

    // Construct the final object, correctly assigning defaults
    const data = {
      uuid: uuid || generateUUID(),
      scanned: scanned || [],
      ...rest,
    };
    console.log('[POST] - Final data object to be inserted:', data);

    console.log('[POST] - Connecting to database...');
    const db = await getDb();
    console.log('[POST] - Database connection successful. Getting collection...');
    const collection = db.collection('profiles');

    console.log('[POST] - Inserting new profile into database...');
    const result = await collection.insertOne(data);
    console.log('[POST] - Insert successful. Result:', result);

    const newProfile = { ...data, _id: result.insertedId };
    console.log('[POST] - Sending new profile as response.');
    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error('[POST] - An error occurred:', error);

    if (error instanceof z.ZodError) {
      console.error('[POST] - Zod validation error:', error.cause);
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { 
        error: 'Failed to create profile',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * Generates a standard UUID.
 */
function generateUUID(): string {
  console.log('[UTIL] - Generating new UUID...');
  return randomUUID();
}