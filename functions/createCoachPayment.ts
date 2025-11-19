import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Razorpay from 'npm:razorpay@2.9.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.user_type !== 'student_coach') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscriptionId, amount, currency, coachName, coachEmail, planName } = await req.json();

        // Get platform payment gateway settings
        const gateways = await base44.asServiceRole.entities.CoachPaymentGateway.filter({ setup_completed: true });
        const gateway = gateways[0];

        if (!gateway) {
            return Response.json({ error: 'Payment gateway not configured' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: gateway.razorpay_key_id,
            key_secret: gateway.razorpay_key_secret,
        });

        const order = await razorpay.orders.create({
            amount: amount,
            currency: currency,
            receipt: `coach_sub_${subscriptionId}`,
            notes: {
                subscription_id: subscriptionId,
                coach_email: coachEmail,
                plan_name: planName
            }
        });

        return Response.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            razorpay_key_id: gateway.razorpay_key_id
        });
    } catch (error) {
        console.error('Error creating coach payment:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});