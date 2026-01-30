import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only super_admin can add AI credits
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { coachEmail, creditsToAdd, reason } = await req.json();

    if (!coachEmail || !creditsToAdd || creditsToAdd <= 0) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Find active subscription for the coach
    const subscriptions = await base44.asServiceRole.entities.HealthCoachSubscription.filter({
      coach_email: coachEmail,
      status: 'active'
    });

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ error: 'No active subscription found for this coach' }, { status: 404 });
    }

    const subscription = subscriptions[0];
    const currentCredits = subscription.ai_credits_purchased || 0;
    const newCredits = currentCredits + creditsToAdd;

    // Update subscription with new credits
    await base44.asServiceRole.entities.HealthCoachSubscription.update(subscription.id, {
      ai_credits_purchased: newCredits
    });

    // Log the transaction
    await base44.asServiceRole.entities.AICreditsTransaction.create({
      user_email: coachEmail,
      transaction_type: 'admin_grant',
      credits: creditsToAdd,
      amount: 0,
      status: 'completed',
      reason: reason || 'Admin manually added credits',
      admin_email: user.email,
      subscription_id: subscription.id
    });

    return Response.json({
      success: true,
      message: `Successfully added ${creditsToAdd} AI credits to ${coachEmail}`,
      newTotal: newCredits,
      previousTotal: currentCredits
    });

  } catch (error) {
    console.error('Add AI credits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});