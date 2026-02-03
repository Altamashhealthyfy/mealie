import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { coaches } = await req.json();

    if (!coaches || !Array.isArray(coaches) || coaches.length === 0) {
      return Response.json({ error: 'No coaches data provided' }, { status: 400 });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // Fetch all available plans
    const allPlans = await base44.asServiceRole.entities.HealthCoachPlan.list();
    const planMap = {};
    allPlans.forEach(plan => {
      planMap[plan.plan_name.toLowerCase()] = plan;
    });

    for (const coachData of coaches) {
      try {
        const { coach_email, coach_name, plan_name, billing_cycle, duration_months } = coachData;

        // Validate required fields
        if (!coach_email || !plan_name) {
          results.push({
            coach_email,
            coach_name,
            success: false,
            error: 'Missing required fields (coach_email or plan_name)'
          });
          failedCount++;
          continue;
        }

        // Find plan
        const plan = planMap[plan_name.toLowerCase()];
        if (!plan) {
          results.push({
            coach_email,
            coach_name,
            success: false,
            error: `Plan "${plan_name}" not found`
          });
          failedCount++;
          continue;
        }

        // Validate billing cycle
        const cycle = billing_cycle?.toLowerCase();
        if (cycle && cycle !== 'monthly' && cycle !== 'yearly') {
          results.push({
            coach_email,
            coach_name,
            success: false,
            error: 'billing_cycle must be "monthly" or "yearly"'
          });
          failedCount++;
          continue;
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        const months = parseInt(duration_months) || (cycle === 'yearly' ? 12 : 1);
        endDate.setMonth(endDate.getMonth() + months);

        const nextBillingDate = new Date(endDate);

        // Calculate amount
        const amount = cycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

        // Check if subscription already exists
        const existingSubs = await base44.asServiceRole.entities.HealthCoachSubscription.filter({
          coach_email: coach_email,
          status: 'active'
        });

        if (existingSubs.length > 0) {
          // Update existing subscription
          await base44.asServiceRole.entities.HealthCoachSubscription.update(existingSubs[0].id, {
            plan_id: plan.id,
            plan_name: plan.plan_name,
            billing_cycle: cycle || 'monthly',
            amount: amount,
            end_date: endDate.toISOString().split('T')[0],
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            manually_granted: true,
            granted_by: user.email
          });

          results.push({
            coach_email,
            coach_name: coach_name || coach_email,
            plan_name: plan.plan_name,
            success: true,
            message: `Updated existing subscription - ${plan.plan_name} (${cycle || 'monthly'}) for ${months} months`
          });
        } else {
          // Create new subscription
          await base44.asServiceRole.entities.HealthCoachSubscription.create({
            coach_email: coach_email,
            coach_name: coach_name || coach_email,
            plan_id: plan.id,
            plan_name: plan.plan_name,
            billing_cycle: cycle || 'monthly',
            amount: amount,
            currency: 'INR',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            status: 'active',
            manually_granted: true,
            granted_by: user.email,
            auto_renew: false
          });

          results.push({
            coach_email,
            coach_name: coach_name || coach_email,
            plan_name: plan.plan_name,
            success: true,
            message: `Granted ${plan.plan_name} (${cycle || 'monthly'}) for ${months} months`
          });
        }

        successCount++;

      } catch (error) {
        console.error(`Error processing coach ${coachData.coach_email}:`, error);
        results.push({
          coach_email: coachData.coach_email,
          coach_name: coachData.coach_name,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: coaches.length,
        success: successCount,
        failed: failedCount
      },
      results: results
    });

  } catch (error) {
    console.error('Bulk grant coach access error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});