import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req, {
      serviceToken: Deno.env.get('BASE44_SERVICE_TOKEN')
    });
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachEmails, planId, startDate, endDate } = await req.json();

    if (!Array.isArray(coachEmails) || !planId || !startDate || !endDate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the plan details
    const plans = await base44.asServiceRole.entities.HealthCoachPlan.filter({ id: planId });
    if (!plans.length) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = plans[0];

    const results = [];
    const errors = [];

    for (const email of coachEmails) {
      try {
        // Get user to get the name
        const users = await base44.asServiceRole.entities.User.filter({ email });
        const coachUser = users[0];
        if (!coachUser) {
          errors.push({
            email,
            error: 'Coach user not found'
          });
          continue;
        }

        // Check if subscription already exists
        const existingSubs = await base44.asServiceRole.entities.HealthCoachSubscription.filter({
          coach_email: email
        });

        if (existingSubs.length > 0) {
          // Update existing subscription
          await base44.asServiceRole.entities.HealthCoachSubscription.update(existingSubs[0].id, {
            plan_id: planId,
            plan_name: plan.plan_name,
            start_date: startDate,
            end_date: endDate,
            status: 'active',
            billing_cycle: 'monthly',
            amount: plan.monthly_price || 0
          });
          results.push({
            email,
            name: coachUser.full_name,
            status: 'updated'
          });
        } else {
          // Create new subscription
          await base44.asServiceRole.entities.HealthCoachSubscription.create({
            coach_email: email,
            coach_name: coachUser.full_name,
            plan_id: planId,
            plan_name: plan.plan_name,
            start_date: startDate,
            end_date: endDate,
            status: 'active',
            billing_cycle: 'monthly',
            amount: plan.monthly_price || 0
          });
          results.push({
            email,
            name: coachUser.full_name,
            status: 'created'
          });
        }
      } catch (error) {
        errors.push({
          email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      assigned: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error in bulkAssignCoachSubscriptions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});