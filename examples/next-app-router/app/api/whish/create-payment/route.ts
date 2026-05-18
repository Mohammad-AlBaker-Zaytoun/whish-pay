import { WhishClient, WhishApiError, WhishValidationError } from 'whish-pay';
import { NextResponse } from 'next/server';

// Instantiate once at module scope — credentials are read from env at startup.
// This code only runs server-side (Next.js API routes are never sent to the browser).
const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

export async function POST(request: Request) {
  let amount: number;
  let currency: string;
  let orderId: string;
  let invoice: string;

  try {
    ({ amount, currency, orderId, invoice } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!orderId || !amount || !currency || !invoice) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Generate a unique ID that links the Whish transaction to your order.
  // Store this BEFORE calling createPayment so you can always look up the order
  // when Whish calls your callback URL.
  const externalId = whish.generateExternalId();

  // TODO: Persist externalId to your database before proceeding.
  //   await db.orders.update(orderId, {
  //     externalId,
  //     status: 'awaiting_payment',
  //   });

  try {
    const result = await whish.createPayment({
      amount,
      currency: currency as 'USD' | 'LBP' | 'AED',
      invoice,
      externalId,
      successCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/success`,
      failureCallbackUrl: `${process.env.WEBSITE_URL}/api/whish/callback/failure`,
      successRedirectUrl: `${process.env.WEBSITE_URL}/checkout/success`,
      failureRedirectUrl: `${process.env.WEBSITE_URL}/checkout/failure`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.dialog?.message ?? 'Payment creation failed', code: result.code },
        { status: 400 }
      );
    }

    // Return the payment URL and externalId to the frontend.
    // The frontend redirects the user to collectUrl.
    // It must NOT use collectUrl as proof of payment — only as a redirect target.
    return NextResponse.json({
      collectUrl: result.collectUrl,
      externalId,
    });
  } catch (error) {
    if (error instanceof WhishValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 }
      );
    }
    if (error instanceof WhishApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 502 }
      );
    }
    // Log the error safely — do not include secrets or full response bodies
    console.error('[whish] createPayment failed:', (error as Error).message);
    return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
  }
}
