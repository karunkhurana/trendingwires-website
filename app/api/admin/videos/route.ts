import { NextRequest, NextResponse } from 'next/server';
import { PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLES } from '@/lib/dynamodb';

// ─── Auth guard ───────────────────────────────────────────────────────────────
function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get('tw_admin')?.value;
  return cookie === process.env.ADMIN_PASSWORD;
}

// ─── GET — list all videos ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await db.send(new ScanCommand({ TableName: TABLES.VIDEOS }));
  const items  = (result.Items || []).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return NextResponse.json({ data: items });
}

// ─── POST — add a video ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, description, category, platform = 'youtube', duration, viewCount } = body;

  if (!id || !title || !category) {
    return NextResponse.json({ error: 'id, title and category are required' }, { status: 400 });
  }

  const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  const item = {
    id,
    title:       title.trim(),
    description: (description || '').trim(),
    thumbnail,
    publishedAt: new Date().toISOString(),
    category,
    platform,
    ...(duration    && { duration }),
    ...(viewCount   && { viewCount: Number(viewCount) }),
  };

  await db.send(new PutCommand({ TableName: TABLES.VIDEOS, Item: item }));
  return NextResponse.json({ data: item }, { status: 201 });
}

// ─── DELETE — remove a video ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, publishedAt } = await req.json();
  if (!id || !publishedAt) {
    return NextResponse.json({ error: 'id and publishedAt required' }, { status: 400 });
  }

  await db.send(new DeleteCommand({ TableName: TABLES.VIDEOS, Key: { id, publishedAt } }));
  return NextResponse.json({ ok: true });
}
