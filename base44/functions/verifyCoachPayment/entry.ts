import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as crypto from "node:crypto";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'student_coach') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId } = await req.json();

        // Use platform Razorpay keys from environment
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!razorpayKeySecret) {
            return Response.json({ error: 'Payment gateway not configured' }, { status: 400 });
        }

        const generated_signature = crypto
            .createHmac('sha256', razorpayKeySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
        }

        // Get subscription details
        const subscription = await base44.asServiceRole.entities.HealthCoachSubscription.filter({ id: subscriptionId });
        const sub = subscription[0];

        if (sub) {
            // Update subscription to active
            await base44.asServiceRole.entities.HealthCoachSubscription.update(subscriptionId, {
                status: 'active',
                razorpay_payment_id: razorpay_payment_id,
                razorpay_order_id: razorpay_order_id
            });

            // Log payment
            await base44.asServiceRole.entities.Payment.create({
                coach_email: sub.coach_email,
                subscription_id: subscriptionId,
                amount: sub.amount,
                currency: sub.currency,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'razorpay',
                transaction_id: razorpay_payment_id,
                status: 'completed',
                payment_for: `Health Coach Plan: ${sub.plan_name}`
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error verifying coach payment:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});