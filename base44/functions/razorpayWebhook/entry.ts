import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as crypto from "node:crypto";

Deno.serve(async (req) => {
    try {
        // Get webhook signature from headers
        const webhookSignature = req.headers.get('X-Razorpay-Signature');
        const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

        // Read raw body
        const body = await req.text();
        
        // Verify webhook signature
        if (webhookSecret && webhookSignature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(body)
                .digest('hex');

            if (expectedSignature !== webhookSignature) {
                console.error('Invalid webhook signature');
                return Response.json({ error: 'Invalid signature' }, { status: 400 });
            }
        }

        const event = JSON.parse(body);
        console.log('Webhook event:', event.event);

        // Handle payment.captured event (for QR code and other payment methods)
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;
            const amount = payment.amount / 100; // Convert paise to rupees

            console.log('Payment captured:', { orderId, paymentId, amount });

            // Initialize Base44 SDK with service role
            const base44 = createClientFromRequest(req);

            // Check if this is an AI credits payment
            if (payment.notes && payment.notes.payment_type === 'ai_credits') {
                const coachEmail = payment.notes.coach_email;
                const creditsAmount = parseInt(payment.notes.credits_amount || 0);

                // Get coach subscription
                const subs = await base44.asServiceRole.entities.HealthCoachSubscription.filter({ 
                    coach_email: coachEmail,
                    status: 'active'
                });

                if (subs.length > 0) {
                    const subscription = subs[0];

                    // Update subscription with purchased credits
                    await base44.asServiceRole.entities.HealthCoachSubscription.update(subscription.id, {
                        ai_credits_purchased: (subscription.ai_credits_purchased || 0) + creditsAmount
                    });

                    // Record transaction
                    await base44.asServiceRole.entities.AICreditsTransaction.create({
                        coach_email: coachEmail,
                        subscription_id: subscription.id,
                        transaction_type: 'purchase',
                        credits_amount: creditsAmount,
                        cost: amount,
                        payment_id: paymentId,
                        payment_status: 'completed',
                        description: `Purchased ${creditsAmount} AI credits via webhook`
                    });

                    console.log('AI credits updated successfully:', { coachEmail, creditsAmount });
                }
            }
            // Handle subscription payment
            else if (payment.notes && payment.notes.subscription_id) {
                const subscriptionId = payment.notes.subscription_id;

                const subscription = await base44.asServiceRole.entities.HealthCoachSubscription.filter({ id: subscriptionId });
                const sub = subscription[0];

                if (sub) {
                    // Update subscription to active
                    await base44.asServiceRole.entities.HealthCoachSubscription.update(subscriptionId, {
                        status: 'active',
                        razorpay_payment_id: paymentId,
                        razorpay_order_id: orderId
                    });

                    // Log payment
                    await base44.asServiceRole.entities.Payment.create({
                        coach_email: sub.coach_email,
                        subscription_id: subscriptionId,
                        amount: sub.amount,
                        currency: sub.currency,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'razorpay',
                        transaction_id: paymentId,
                        status: 'completed',
                        payment_for: `Health Coach Plan: ${sub.plan_name}`
                    });

                    console.log('Subscription activated via webhook:', subscriptionId);
                }
            }
        }

        return Response.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});