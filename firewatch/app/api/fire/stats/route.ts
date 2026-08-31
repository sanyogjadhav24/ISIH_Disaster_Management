import { NextResponse } from 'next/server';
import { batchProcessingService } from '@/lib/services/batchProcessingService';
import { logger } from '@/lib/config/logger';
import { ApiResponse } from '@/lib/types/fire.types';

export async function GET() {
  try {
    logger.info('Batch statistics request received');

    const stats = await batchProcessingService.getBatchStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (error) {
    logger.error('Error getting batch statistics:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get batch statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}