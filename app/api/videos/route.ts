import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLES } from '@/lib/dynamodb';
import { MOCK_VIDEOS } from '@/lib/mockData';
import type { Video } from '@/types';

export const revalidate = 60; // ISR — revalidate every 60s

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'all';
  const limit    = Math.min(Number(searchParams.get('limit') || 12), 50);

  try {
    let items: Video[];

    if (category === 'all') {
      const result = await db.send(
        new ScanCommand({
          TableName: TABLES.VIDEOS,
          Limit: limit,
        }),
      );
      items = (result.Items as Video[]) || [];
    } else {
      const result = await db.send(
        new QueryCommand({
          TableName:                 TABLES.VIDEOS,
          IndexName:                 'category-publishedAt-index',
          KeyConditionExpression:    'category = :cat',
          ExpressionAttributeValues: { ':cat': category },
          Limit:                     limit,
          ScanIndexForward:          false, // newest first
        }),
      );
      items = (result.Items as Video[]) || [];
    }

    // Fallback to mock data in local dev or empty table
    if (!items.length) items = MOCK_VIDEOS;

    return NextResponse.json({ data: items, total: items.length });
  } catch (err) {
    console.error('[GET /api/videos]', err);
    // Always return something — degrade gracefully
    const data = category === 'all'
      ? MOCK_VIDEOS
      : MOCK_VIDEOS.filter(v => v.category === category);
    return NextResponse.json({ data, total: data.length });
  }
}
