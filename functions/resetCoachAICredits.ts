import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Only allow admin or system calls
        if (user && user.user_type !== 'super_admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all active coach subscriptions
        const subscriptions = await base44.asServiceRole.entities.HealthCoachSubscription.filter({
            status: 'active'
        });

        const results = [];
        const today = new Date();

        for (const sub of subscriptions) {
            try {
                // Check if credits need to be reset
                const resetDate = sub.ai_credits_reset_date ? new Date(sub.ai_credits_reset_date) : null;
                const shouldReset = !resetDate || today >= resetDate;

                if (shouldReset) {
                    // Calculate next reset date (1 month from now)
                    const nextResetDate = new Date(today);
                    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

                    // Check if subscription has expired
                    const endDate = new Date(sub.end_date);
                    if (today > endDate) {
                        // Subscription expired, mark as expired
                        await base44.asServiceRole.entities.HealthCoachSubscription.update(sub.id, {
                            status: 'expired',
                            ai_credits_used_this_month: 0
                        });

                        results.push({
                            coach_email: sub.coach_email,
                            action: 'expired',
                            message: 'Subscription expired, credits reset to 0'
                        });
                        continue;
                    }

                    // Reset monthly usage
                    await base44.asServiceRole.entities.HealthCoachSubscription.update(sub.id, {
                        ai_credits_used_this_month: 0,
                        ai_credits_reset_date: nextResetDate.toISOString().split('T')[0]
                    });

                    results.push({
                        coach_email: sub.coach_email,
                        action: 'reset',
                        plan_name: sub.plan_name,
                        reset_date: nextResetDate.toISOString().split('T')[0]
                    });
                }
            } catch (error) {
                results.push({
                    coach_email: sub.coach_email,
                    action: 'error',
                    error: error.message
                });
            }
        }

        return Response.json({
            success: true,
            processed: subscriptions.length,
            results: results,
            timestamp: today.toISOString()
        });

    } catch (error) {
        console.error('Reset AI Credits Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});