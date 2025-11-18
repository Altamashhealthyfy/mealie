import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createHmac } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user || user.user_type !== 'client') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId } = await req.json();

    // Verify payment signature
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      // Log successful payment in PaymentRecord entity
      await base44.asServiceRole.entities.PaymentRecord.create({
        customer_email: user.email,
        customer_name: user.full_name,
        payment_type: 'subscription',
        product_name: 'Client Plan Subscription',
        amount: 0, // Will be updated separately if needed
        currency: 'INR',
        payment_method: 'razorpay',
        payment_status: 'completed',
        transaction_id: razorpay_payment_id,
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Subscription payment for subscription ID: ${subscriptionId}`
      });
    }

    return Response.json({
      success: isValid,
      message: isValid ? 'Payment verified successfully' : 'Invalid payment signature'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});