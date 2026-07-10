import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'floodguard_super_secret_key';

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(sessionCookie.value, JWT_SECRET);
      return NextResponse.json({ authenticated: true, user: decoded });
    } catch (err) {
      return NextResponse.json({ authenticated: false, error: 'Invalid or expired session' }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
