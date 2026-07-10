import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'floodguard_super_secret_key';

export async function POST(request) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Query engineer
    const { rows } = await pool.query('SELECT * FROM engineers WHERE name = $1', [name]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const engineer = rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, engineer.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        engineer_id: engineer.engineer_id,
        name: engineer.name,
        role: engineer.role,
        assigned_dam_id: engineer.assigned_dam_id
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set cookie
    const response = NextResponse.json({
      engineer_id: engineer.engineer_id,
      name: engineer.name,
      role: engineer.role,
      assigned_dam_id: engineer.assigned_dam_id
    });

    response.cookies.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
