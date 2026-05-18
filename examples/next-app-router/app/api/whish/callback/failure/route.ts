import { parseCallbackUrl } from 'whish-pay';
import { NextResponse } from 'next/server';

// This route is called server-to-server by Whish when a payment fails or is cancelled.
// It is a background notification — the user is redirected separately via failureRedirectUrl.
export async function GET(request: Request) {
  const { externalId, currency, errorCode, errorMessage } = parseCallbackUrl(request.url);

  if (!externalId) {
    console.warn('[whish] failure callback missing externalId', request.url);
    return NextResponse.json({ ok: false, error: 'Missing externalId' }, { status: 400 });
  }

  // Log the failure details (avoid logging anything that contains secrets)
  console.info('[whish] payment failed | externalId:', externalId, '| errorCode:', errorCode);

  // TODO: Update your order status and restore any held inventory.
  //   const order = await db.orders.findByExternalId(externalId);
  //   if (order && order.status === 'awaiting_payment') {
  //     await db.orders.markFailed(order.id, errorCode ?? 'UNKNOWN');
  //     // Optionally: restore inventory, release reserved stock, etc.
  //   }

  return NextResponse.json({ ok: true });
}
