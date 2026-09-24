import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateToken, createSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Query engineer by name
    const { rows } = await pool.query(
      'SELECT engineer_id, name, role, contact, assigned_dam_id, password_hash FROM engineers WHERE name = $1',
      [name]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const engineer = rows[0];

    // Verify password
    if (!engineer.password_hash) {
      return NextResponse.json({ error: 'Account not configured' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, engineer.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Generate JWT and set secure session cookie
    const token = generateToken(engineer);
    const response = NextResponse.json({
      engineer_id: engineer.engineer_id,
      name: engineer.name,
      role: engineer.role,
      assigned_dam_id: engineer.assigned_dam_id,
    });

    response.cookies.set(createSessionCookie(token));
    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
