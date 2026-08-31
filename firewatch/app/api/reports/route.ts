import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Report } from '@/lib/models/Report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Rough India bounding box (good enough for filtering by lat/lng)
const INDIA_BBOX = {
  minLat: 6,
  maxLat: 37,
  minLng: 68,
  maxLng: 98,
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scope = (url.searchParams.get('scope') || 'india').toLowerCase();
    const limit = Math.min(Number(url.searchParams.get('limit') || '2000'), 10000);

    await connectDB();

    const query: any = { lat: { $type: 'number' }, lng: { $type: 'number' } };

    if (scope === 'india') {
      query.lat = { $gte: INDIA_BBOX.minLat, $lte: INDIA_BBOX.maxLat };
      query.lng = { $gte: INDIA_BBOX.minLng, $lte: INDIA_BBOX.maxLng };
    }

    const docs = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: docs.length,
        data: docs,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
