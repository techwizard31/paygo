// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ProfileSchema } from '@/lib/schemas';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  console.log('[POST /api/auth/signup] - Request received');
  try {
    console.log('[SIGNUP] - Parsing request body as JSON...');
    const body = await request.json();
    console.log('[SIGNUP] - Request body received');

    console.log('[SIGNUP] - Validating schema with Zod...');
    const { uuid, password, ...rest } = ProfileSchema.parse(body);
    console.log('[SIGNUP] - Zod validation successful.');

    console.log('[SIGNUP] - Connecting to database...');
    const db = await getDb();
    const collection = db.collection('profiles');

    // Check if user already exists
    console.log('[SIGNUP] - Checking if email already exists...');
    const existingUser = await collection.findOne({ email: rest.email });
    if (existingUser) {
      console.log('[SIGNUP] - Email already exists');
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    console.log('[SIGNUP] - Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[SIGNUP] - Password hashed successfully.');

    // Construct the final object
    const data = {
      uuid: uuid || randomUUID(),
      ...rest,
      password: hashedPassword,
      createdAt: new Date(),
    };
    console.log('[SIGNUP] - Final data object to be inserted');

    console.log('[SIGNUP] - Inserting new user into database...');
    const result = await collection.insertOne(data);
    console.log('[SIGNUP] - Insert successful. Result:', result);

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = data;
    const newUser = { ...userWithoutPassword, _id: result.insertedId };
    
    console.log('[SIGNUP] - Sending new user as response.');
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('[SIGNUP] - An error occurred:', error);

    if (error instanceof z.ZodError) {
      console.error('[SIGNUP] - Zod validation error:', error.flatten());
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create account',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}