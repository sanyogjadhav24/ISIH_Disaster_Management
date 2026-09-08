import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const nodes = await db.collection('nodes').find({}).sort({ nodeType: 1, _id: 1 }).toArray();

    // Fetch the latest reading for each node to attach live telemetry snapshot
    const nodeIds = nodes.map((n) => n._id);
    const latestReadings = await Promise.all(
      nodeIds.map((id) =>
        db.collection('readings')
          .find({ 'meta.nodeId': id })
          .sort({ ts: -1 })
          .limit(1)
          .project({ _truth: 0 })
          .toArray()
      )
    );

    const latestByNode: Record<string, any> = {};
    latestReadings.forEach((arr) => {
      if (arr.length > 0) {
        latestByNode[String(arr[0].meta.nodeId)] = arr[0];
      }
    });

    const enrichedNodes = nodes.map((n) => ({
      ...n,
      latestReading: latestByNode[String(n._id)] || null,
    }));

    return NextResponse.json({
      success: true,
      data: enrichedNodes,
      count: enrichedNodes.length,
    });
  } catch (error: any) {
    console.error('Failed to get nodes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}
