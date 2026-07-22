import { NextRequest, NextResponse } from 'next/server';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLES } from '@/lib/dynamodb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || '').trim().toLowerCase();

    // Validate
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Check duplicate
    const existing = await db.send(
      new GetCommand({ TableName: TABLES.SUBSCRIBERS, Key: { email } }),
    );
    if (existing.Item) {
      return NextResponse.json({ message: 'Already subscribed!' });
    }

    // Save
    await db.send(
      new PutCommand({
        TableName: TABLES.SUBSCRIBERS,
        Item: {
          email,
          subscribedAt: new Date().toISOString(),
          source: req.headers.get('referer') || 'direct',
        },
      }),
    );

    return NextResponse.json({ message: 'Subscribed successfully!' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/subscribe]', err);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}
