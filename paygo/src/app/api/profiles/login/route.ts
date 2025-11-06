// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const LoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

export async function POST(request: NextRequest) {
  console.log('[POST /api/auth/login] - Request received');
  try {
    console.log('[LOGIN] - Parsing request body as JSON...');
    const body = await request.json();
    console.log('[LOGIN] - Request body received');

    console.log('[LOGIN] - Validating schema with Zod...');
    const { email, password } = LoginSchema.parse(body);
    console.log('[LOGIN] - Zod validation successful.');

    console.log('[LOGIN] - Connecting to database...');
    const db = await getDb();
    const collection = db.collection('profiles');

    console.log('[LOGIN] - Finding user by email...');
    const user = await collection.findOne({ email });
    
    if (!user) {
      console.log('[LOGIN] - User not found');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('[LOGIN] - User found, verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('[LOGIN] - Invalid password');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('[LOGIN] - Login successful');
    
    // Don't return password in response
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json(
      { 
        message: 'Login successful',
        user: userWithoutPassword 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[LOGIN] - An error occurred:', error);

    if (error instanceof z.ZodError) {
      console.error('[LOGIN] - Zod validation error:', error.flatten());
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Login failed',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}