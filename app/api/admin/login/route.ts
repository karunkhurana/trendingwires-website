import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const secret = process.env.ADMIN_PASSWORD;

  if (!secret) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }
  if (password !== secret) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Set a simple session cookie valid for 8 hours
  res.cookies.set('tw_admin', secret, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   60 * 60 * 8,
    path:     '/',
  });
  return res;
}
