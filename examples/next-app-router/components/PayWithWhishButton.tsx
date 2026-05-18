'use client';

import { useState } from 'react';

interface PayWithWhishButtonProps {
  amount: number;
  currency: 'USD' | 'LBP' | 'AED';
  orderId: string;
  invoice: string;
  /** Called if payment URL creation fails */
  onError?: (message: string) => void;
}

/**
 * Client component that initiates a Whish payment.
 *
 * It calls your backend API route to create the payment server-side,
 * then redirects the user to the Whish payment page.
 *
 * IMPORTANT: This component never calls the Whish API directly and never
 * has access to WHISH_CHANNEL or WHISH_SECRET. Those credentials stay on
 * the server inside app/api/whish/create-payment/route.ts.
 */
export default function PayWithWhishButton({
  amount,
  currency,
  orderId,
  invoice,
  onError,
}: PayWithWhishButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      // Call your backend to create the payment — never call Whish directly from here
      const response = await fetch('/api/whish/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, orderId, invoice }),
      });

      const data = await response.json();

      if (!response.ok || !data.collectUrl) {
        onError?.(data.error ?? 'Payment creation failed');
        return;
      }

      // Redirect user to the Whish payment page
      // After payment, Whish will redirect to your successRedirectUrl or failureRedirectUrl
      window.location.href = data.collectUrl;
    } catch {
      onError?.('Unable to reach payment service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Redirecting to Whish…' : `Pay ${amount} ${currency} with Whish`}
    </button>
  );
}
