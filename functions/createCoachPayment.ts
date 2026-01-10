import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Razorpay from 'npm:razorpay@2.9.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'student_coach') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscriptionId, amount, currency, coachName, coachEmail, planName, description, payment_type } = await req.json();

        // Use platform Razorpay keys from environment
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!razorpayKeyId || !razorpayKeySecret) {
            return Response.json({ error: 'Payment gateway not configured' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret,
        });

        const order = await razorpay.orders.create({
            amount: amount,
            currency: currency || 'INR',
            receipt: payment_type === 'ai_credits' ? `ai_credits_${Date.now()}` : `coach_sub_${subscriptionId || Date.now()}`,
            notes: {
                subscription_id: subscriptionId || null,
                coach_email: coachEmail || user.email,
                plan_name: planName || null,
                description: description || null,
                payment_type: payment_type || 'subscription'
            }
        });

        return Response.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            razorpay_key_id: razorpayKeyId
        });
    } catch (error) {
        console.error('Error creating coach payment:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});