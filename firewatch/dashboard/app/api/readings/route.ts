import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const hazard = searchParams.get('hazard');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const hours = parseInt(searchParams.get('hours') || '24');
    const includeTruth = searchParams.get('truth') === 'true';

    const query: any = {};
    if (nodeId) query['meta.nodeId'] = nodeId;
    if (hazard) query['meta.hazards'] = hazard;

    if (hours > 0) {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      query.ts = { $gte: since };
    }

    const projection: any = {
      ts: 1,
      meta: 1,
      v: 1,
      adc: 1,
      q: 1,
      risk: 1,
      link: 1,
      sdRef: 1,
    };
    if (includeTruth) {
      projection._truth = 1;
    }

    const { db } = await connectToDatabase();
    const readings = await db.collection('readings')
      .find(query)
      .project(projection)
      .sort({ ts: 1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: readings,
      count: readings.length,
    });
  } catch (error: any) {
    console.error('Failed to get readings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch telemetry readings' },
      { status: 500 }
    );
  }
}
