import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const [nodesCount, gatewaysCount, readingsCount, eventsCount] = await Promise.all([
      db.collection('nodes').countDocuments(),
      db.collection('gateways').countDocuments(),
      db.collection('readings').countDocuments(),
      db.collection('events').countDocuments(),
    ]);

    // Active unacknowledged events
    const openEvents = await db.collection('events').find({ 'ack.state': 'OPEN' }).sort({ ts: -1 }).limit(10).toArray();
    
    // Severity breakdown
    const criticalCount = await db.collection('events').countDocuments({ level: 'CRITICAL', 'ack.state': 'OPEN' });
    const highCount = await db.collection('events').countDocuments({ level: 'HIGH', 'ack.state': 'OPEN' });
    const watchCount = await db.collection('events').countDocuments({ level: 'WATCH', 'ack.state': 'OPEN' });

    // Node types & status
    const fgNodes = await db.collection('nodes').countDocuments({ nodeType: 'FG' });
    const fsNodes = await db.collection('nodes').countDocuments({ nodeType: 'FS' });
    const activeNodes = await db.collection('nodes').countDocuments({ status: 'active' });

    // Latest readings sample for signal & latency stats
    const latestReadings = await db.collection('readings')
      .find({})
      .sort({ ts: -1 })
      .limit(50)
      .project({ link: 1, q: 1, ts: 1, risk: 1 })
      .toArray();

    let avgRssi = -95;
    let avgLatency = 3500;
    let holdCount = 0;

    if (latestReadings.length > 0) {
      const sumRssi = latestReadings.reduce((acc, r: any) => acc + (r.link?.rssi || -95), 0);
      const sumLat = latestReadings.reduce((acc, r: any) => acc + (r.link?.latency_ms || 3500), 0);
      avgRssi = Math.round(sumRssi / latestReadings.length);
      avgLatency = Math.round(sumLat / latestReadings.length);
      holdCount = latestReadings.filter((r: any) => r.q?.crossCheck === 'HOLD').length;
    }

    return NextResponse.json({
      success: true,
      data: {
        nodes: { total: nodesCount, fg: fgNodes, fs: fsNodes, online: activeNodes },
        gateways: { total: gatewaysCount, online: gatewaysCount },
        readings: { total: readingsCount },
        events: {
          total: eventsCount,
          open: openEvents.length,
          critical: criticalCount,
          high: highCount,
          watch: watchCount,
          recent: openEvents,
        },
        telemetry: {
          avgRssi,
          avgLatency,
          crossCheckHoldRate: latestReadings.length ? Math.round((holdCount / latestReadings.length) * 100) : 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to get network stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch network stats' },
      { status: 500 }
    );
  }
}
