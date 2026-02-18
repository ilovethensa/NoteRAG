import { NextResponse } from 'next/server';
import { getTokenUsageStats } from '@/lib/server-utils';

export async function GET() {
  try {
    const stats = await getTokenUsageStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
