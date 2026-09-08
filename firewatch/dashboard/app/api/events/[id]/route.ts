import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    let filter: any;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { _id: id };
    }
    const event = await db.collection('events').findOne(filter);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { state, by, notes } = body;

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
        'ack.by': by || 'Operator-1',
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
