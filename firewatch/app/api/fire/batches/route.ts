import { NextRequest, NextResponse } from 'next/server';
import { batchProcessingService } from '@/lib/services/batchProcessingService';
import { logger } from '@/lib/config/logger';
import { ApiResponse } from '@/lib/types/fire.types';

export async function GET(request: NextRequest) {
  try {
    logger.info('Fire data batches request received');
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const date = searchParams.get('date') || undefined;
    const satellite = searchParams.get('satellite') || undefined;
    const minConfidence = searchParams.get('minConfidence') ? 
      parseFloat(searchParams.get('minConfidence')!) : undefined;

    // Parse bounds if provided
    let bounds;
    const north = searchParams.get('north');
    const south = searchParams.get('south');
    const east = searchParams.get('east');
    const west = searchParams.get('west');

    if (north && south && east && west) {
      bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      };

      // Validate bounds
      if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid geographic bounds',
            timestamp: new Date().toISOString()
          } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    const result = await batchProcessingService.getFireDataBatches({
      page,
      limit,
      bounds,
      date,
      satellite,
      minConfidence
    });

    logger.info(`Fire data batches returned: ${result.data.length} batches`);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in fire data batches API:', error);

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