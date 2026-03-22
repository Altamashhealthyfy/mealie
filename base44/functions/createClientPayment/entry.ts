import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Razorpay from 'npm:razorpay@2.9.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user || user.user_type !== 'client') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, amount, currency, clientName, clientEmail, planName } = await req.json();

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID'),
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount, // amount in paise
      currency: currency,
      receipt: `sub_${subscriptionId}_${Date.now()}`,
      notes: {
        subscription_id: subscriptionId,
        client_name: clientName,
        client_email: clientEmail,
        plan_name: planName
      }
    });

    return Response.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpay_key_id: Deno.env.get('RAZORPAY_KEY_ID')
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});