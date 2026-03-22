import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an active subscription or trial
    const existingSubs = await base44.entities.HealthCoachSubscription.filter({
      coach_email: user.email,
      status: { '$in': ['active', 'trial'] }
    });

    if (existingSubs.length > 0) {
      return Response.json({ 
        error: 'You already have an active subscription or trial' 
      }, { status: 400 });
    }

    // Check if user already used trial before (even if expired)
    const previousTrials = await base44.entities.HealthCoachSubscription.filter({
      coach_email: user.email,
      is_trial: true
    });

    if (previousTrials.length > 0) {
      return Response.json({ 
        error: 'Trial can only be used once per account' 
      }, { status: 400 });
    }

    // Get Basic Plan
    const plans = await base44.entities.HealthCoachPlan.filter({ 
      plan_name: 'Mealie Basic',
      status: 'active'
    });

    if (plans.length === 0) {
      return Response.json({ error: 'Basic plan not found' }, { status: 404 });
    }

    const basicPlan = plans[0];
    
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // Create trial subscription
    const trialSubscription = await base44.entities.HealthCoachSubscription.create({
      coach_email: user.email,
      coach_name: user.full_name,
      plan_id: basicPlan.id,
      plan_name: basicPlan.plan_name,
      billing_cycle: 'monthly',
      amount: 0,
      currency: 'INR',
      start_date: trialStartDate.toISOString().split('T')[0],
      end_date: trialEndDate.toISOString().split('T')[0],
      status: 'trial',
      is_trial: true,
      trial_start_date: trialStartDate.toISOString().split('T')[0],
      trial_end_date: trialEndDate.toISOString().split('T')[0],
      trial_expired_notified: false,
      payment_method: 'manual',
      auto_renew: false,
      manually_granted: false
    });

    // Send welcome email
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: '🎉 Welcome to Your 7-Day Free Trial!',
      body: `
        <h2>Welcome to Mealie Health Coach Platform!</h2>
        <p>Hi ${user.full_name},</p>
        <p>Your 7-day free trial of the <strong>Mealie Basic</strong> plan has been activated!</p>
        
        <h3>Trial Details:</h3>
        <ul>
          <li><strong>Plan:</strong> ${basicPlan.plan_name}</li>
          <li><strong>Started:</strong> ${trialStartDate.toLocaleDateString()}</li>
          <li><strong>Expires:</strong> ${trialEndDate.toLocaleDateString()}</li>
          <li><strong>Duration:</strong> 7 Days</li>
        </ul>

        <h3>What's Included:</h3>
        <ul>
          ${basicPlan.features?.map(f => `<li>${f}</li>`).join('') || ''}
        </ul>

        <p>Make the most of your trial period! After 7 days, you can subscribe to continue enjoying all these features.</p>
        
        <p>Questions? Reply to this email - we're here to help!</p>
        
        <p>Best regards,<br>Mealie Team</p>
      `
    });

    return Response.json({ 
      success: true, 
      subscription: trialSubscription,
      message: 'Trial activated successfully!'
    });

  } catch (error) {
    console.error('Trial activation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to activate trial' 
    }, { status: 500 });
  }
});