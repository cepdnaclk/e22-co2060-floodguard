import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function GET(request) {
  const session = verifySession(request);

  if (!session.authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: session.user });
}
