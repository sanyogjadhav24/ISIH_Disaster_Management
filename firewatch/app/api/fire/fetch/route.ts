import { NextRequest, NextResponse } from 'next/server';
import { schedulerService } from '@/lib/services/schedulerService';
import { logger } from '@/lib/config/logger';
import { ApiResponse } from '@/lib/types/fire.types';

export async function POST(request: NextRequest) {
  try {
    logger.info('Manual global fire data fetch triggered via API');

    const result = await schedulerService.triggerManualFetch();

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Global fire data fetch completed successfully',
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (error) {
    logger.error('Error in manual fetch API:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch fire data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = schedulerService.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (error) {
    logger.error('Error getting scheduler status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scheduler status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}