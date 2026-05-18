import { WhishClient, parseCallbackUrl, WhishApiError } from 'whish-pay';
import { NextResponse } from 'next/server';

const whish = new WhishClient({
  channel: process.env.WHISH_CHANNEL!,
  secret: process.env.WHISH_SECRET!,
  websiteUrl: process.env.WEBSITE_URL!,
});

// This route is called server-to-server by Whish after a successful payment.
// It is NOT called by the user's browser — it is a background notification from Whish.
//
// IMPORTANT: The presence of this callback does NOT guarantee the payment succeeded.
// Always call getPaymentStatus() to verify before updating your order.
export async function GET(request: Request) {
  const { externalId, currency } = parseCallbackUrl(request.url);

  if (!externalId || !currency) {
    // Malformed callback — log it for debugging but return 200 so Whish doesn't retry
    console.warn('[whish] success callback missing externalId or currency', request.url);
    return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // Step 1: Verify payment status with Whish — this is the source of truth.
    const status = await whish.getPaymentStatus(currency, externalId);

    if (status.collectStatus !== 'success') {
      console.warn(
        '[whish] success callback received but status is',
        status.collectStatus,
        '| externalId:',
        externalId
      );
      return NextResponse.json(
        { ok: false, status: status.collectStatus },
        { status: 400 }
      );
    }

    // Step 2: Load your order from the database.
    // const order = await db.orders.findByExternalId(externalId);
    // if (!order) {
    //   console.error('[whish] unknown externalId:', externalId);
    //   return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    // }

    // Step 3: Verify the amount and currency match your order.
    // if (!whish.validateAmount(status.amount!, order.amount, order.currency as 'USD' | 'LBP' | 'AED')) {
    //   console.error('[whish] amount mismatch — expected', order.amount, 'got', status.amount);
    //   return NextResponse.json({ ok: false, error: 'Amount mismatch' }, { status: 400 });
    // }

    // Step 4: Mark the order as paid — idempotently (guard against duplicate callbacks).
    // if (order.status !== 'paid') {
    //   await db.orders.markPaid(order.id);
    //   // Optionally: send confirmation email, trigger fulfillment, etc.
    // }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WhishApiError) {
      console.error('[whish] status check failed:', error.code, error.message);
      return NextResponse.json({ ok: false, error: 'Status check failed' }, { status: 502 });
    }
    console.error('[whish] unexpected error in success callback:', (error as Error).message);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
