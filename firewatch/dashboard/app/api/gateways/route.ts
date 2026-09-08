import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const gateways = await db.collection('gateways').find({}).sort({ _id: 1 }).toArray();

    return NextResponse.json({
      success: true,
      data: gateways,
      count: gateways.length,
    });
  } catch (error: any) {
    console.error('Failed to get gateways:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gateways' },
      { status: 500 }
    );
  }
}
