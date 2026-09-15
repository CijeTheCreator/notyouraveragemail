import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pan, amount, descriptor } = body;

    const LITHIC_API_KEY = process.env.LITHIC_API_KEY;

    if (!LITHIC_API_KEY) {
      return NextResponse.json({ error: 'LITHIC_API_KEY is not set' }, { status: 500 });
    }

    if (!pan || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Simulate Authorization
    const authRes = await fetch('https://sandbox.lithic.com/v1/simulate/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LITHIC_API_KEY,
      },
      body: JSON.stringify({
        pan,
        amount,
        descriptor: descriptor || 'Test Checkout',
      }),
    });

    if (!authRes.ok) {
      const errorData = await authRes.json().catch(() => ({}));
      console.error('Lithic Auth Error:', errorData);
      return NextResponse.json(
        { error: 'Authorization failed', details: errorData },
        { status: authRes.status },
      );
    }

    const authData = await authRes.json();
    const token = authData.token;

    if (!token) {
      return NextResponse.json({ error: 'No token returned from authorization' }, { status: 500 });
    }

    // Wait for Lithic sandbox to process the authorization before clearing it
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Simulate Clearing
    const clearRes = await fetch('https://sandbox.lithic.com/v1/simulate/clearing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LITHIC_API_KEY,
      },
      body: JSON.stringify({
        token,
        amount,
      }),
    });

    if (!clearRes.ok) {
      const errorData = await clearRes.json().catch(() => ({}));
      console.error('Lithic Clearing Error:', errorData);
      return NextResponse.json(
        { error: 'Clearing failed', details: errorData },
        { status: clearRes.status },
      );
    }

    return NextResponse.json(
      { success: true, message: 'Authorization and clearing successful' },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Simulate API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
