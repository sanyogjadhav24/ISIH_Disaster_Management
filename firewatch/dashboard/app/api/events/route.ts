import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const state = searchParams.get('state'); // OPEN, ACKED, RESOLVED, FALSE_POSITIVE
    const level = searchParams.get('level'); // CRITICAL, HIGH, WATCH
    const hazard = searchParams.get('hazard'); // FF, GL, FL, LS
    const nodeId = searchParams.get('nodeId');
    const id = searchParams.get('id');

    const query: any = {};
    if (id) {
      try {
        query._id = new ObjectId(id);
      } catch {
        query._id = id;
      }
    }
    if (state) query['ack.state'] = state;
    if (level) query.level = level;
    if (hazard) query.hazard = hazard;
    if (nodeId) query.nodeId = nodeId;

    const { db } = await connectToDatabase();
    const events = await db.collection('events')
      .find(query)
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error: any) {
    console.error('Failed to get events:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const id = searchParams.get('id') || body.id || body.eventId;
    const { state, by, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required in query (?id=...) or body' },
        { status: 400 }
      );
    }

    if (!state || !['OPEN', 'ACKED', 'RESOLVED', 'FALSE_POSITIVE'].includes(state)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ack state. Must be OPEN, ACKED, RESOLVED, or FALSE_POSITIVE' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    let filter: any;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { _id: id };
    }

    const updateDoc = {
      $set: {
        'ack.state': state,
        'ack.by': by || 'HQ-Cmdr-1',
        'ack.at': new Date(),
        'ack.notes': notes || '',
      },
    };

    const result = await db.collection('events').updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Event status updated to ${state}`,
    });
  } catch (error: any) {
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}
