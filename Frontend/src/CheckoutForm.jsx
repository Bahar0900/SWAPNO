import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

function CheckoutForm({ cart, idToken, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg('');

    try {
      const items = cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }));

      // 1. Backend calculates the true total from PRODUCTS and creates the PaymentIntent
      const { data } = await axios.post(
        'http://localhost:5000/api/payments/create-intent',
        { items },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      // 2. Confirm the card payment client-side with Stripe.js
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });

      if (result.error) {
        setErrorMsg(result.error.message);
        setProcessing(false);
        return;
      }

      if (result.paymentIntent.status === 'succeeded') {
        // 3. Only place the order once Stripe confirms payment succeeded
        const orderRes = await axios.post(
          'http://localhost:5000/api/orders',
          { items, paymentIntentId: result.paymentIntent.id },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        onSuccess(orderRes.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-200 rounded p-3">
        <CardElement options={{ style: { base: { fontSize: '14px' } } }} />
      </div>
      <p className="text-[11px] text-gray-400">Test card: 4242 4242 4242 4242 · any future date · any CVC.</p>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-[#fce303] hover:bg-yellow-400 text-gray-900 font-extrabold text-xs py-3 rounded disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Pay & Place Order'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 text-xs text-gray-500 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CheckoutForm;
