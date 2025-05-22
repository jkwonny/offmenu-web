import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const venueId = url.searchParams.get('venueId') || '1';
    const startDate = url.searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    
    // Test regular availability endpoint
    const availabilityResponse = await fetch(
      `${url.origin}/api/calendar/availability?venueId=${venueId}&startDate=${startDate}`,
      { method: 'GET' }
    );
    
    const availabilityResult = await availabilityResponse.json();
    
    // Test check-availability endpoint
    const checkResponse = await fetch(
      `${url.origin}/api/calendar/check-availability?startDate=${startDate}&endDate=${startDate}`,
      { method: 'GET' }
    );
    
    const checkResult = await checkResponse.json();
    
    // Return combined results
    return NextResponse.json({
      availabilityEndpoint: {
        status: availabilityResponse.status,
        result: availabilityResult
      },
      checkAvailabilityEndpoint: {
        status: checkResponse.status,
        result: checkResult
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 