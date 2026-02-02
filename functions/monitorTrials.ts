import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // This function should be called by admin or automation
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Get all active trial subscriptions
    const trialSubs = await base44.asServiceRole.entities.HealthCoachSubscription.filter({
      status: 'trial',
      is_trial: true
    });

    const results = {
      checked: trialSubs.length,
      expired: 0,
      expiringSoon: 0,
      notified: []
    };

    const ADMIN_EMAIL = Deno.env.get("GOOGLE_WORKSPACE_EMAIL") || 'admin@example.com';

    for (const sub of trialSubs) {
      const trialEndDate = new Date(sub.trial_end_date);
      trialEndDate.setHours(0, 0, 0, 0);
      
      const daysRemaining = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));

      // Trial has expired
      if (daysRemaining <= 0) {
        await base44.asServiceRole.entities.HealthCoachSubscription.update(sub.id, {
          status: 'expired'
        });

        // Send expiration notification if not already sent
        if (!sub.trial_expired_notified) {
          // Email to coach
          await base44.integrations.Core.SendEmail({
            to: sub.coach_email,
            subject: '⏰ Your Free Trial Has Ended',
            body: `
              <h2>Your 7-Day Free Trial Has Ended</h2>
              <p>Hi ${sub.coach_name},</p>
              <p>Your free trial of <strong>${sub.plan_name}</strong> has expired.</p>
              
              <p>Don't worry - you can continue enjoying all the premium features by subscribing now!</p>
              
              <h3>Subscribe to Continue:</h3>
              <p>Visit your dashboard and click "My Subscription" to choose a plan that fits your needs.</p>
              
              <p>We'd love to have you continue your journey with us!</p>
              
              <p>Best regards,<br>Mealie Team</p>
            `
          });

          // Email to admin
          await base44.integrations.Core.SendEmail({
            to: ADMIN_EMAIL,
            subject: '🔔 Trial Expired - Follow Up Required',
            body: `
              <h2>Trial Expired Notification</h2>
              <p><strong>Coach:</strong> ${sub.coach_name}</p>
              <p><strong>Email:</strong> ${sub.coach_email}</p>
              <p><strong>Plan:</strong> ${sub.plan_name}</p>
              <p><strong>Trial Started:</strong> ${new Date(sub.trial_start_date).toLocaleDateString()}</p>
              <p><strong>Trial Ended:</strong> ${new Date(sub.trial_end_date).toLocaleDateString()}</p>
              
              <p>Consider following up with this coach to convert them to a paid subscription.</p>
            `
          });

          await base44.asServiceRole.entities.HealthCoachSubscription.update(sub.id, {
            trial_expired_notified: true
          });

          results.notified.push({
            coach: sub.coach_email,
            status: 'expired'
          });
        }

        results.expired++;
      }
      // Trial expiring in 1 day (24-hour warning)
      else if (daysRemaining === 1 && !sub.trial_expired_notified) {
        await base44.integrations.Core.SendEmail({
          to: sub.coach_email,
          subject: '⏰ Your Free Trial Ends Tomorrow!',
          body: `
            <h2>Your Trial Ends Tomorrow!</h2>
            <p>Hi ${sub.coach_name},</p>
            <p>Just a friendly reminder - your 7-day free trial of <strong>${sub.plan_name}</strong> ends tomorrow (${trialEndDate.toLocaleDateString()}).</p>
            
            <p>To continue enjoying all the amazing features, subscribe now and never miss a beat!</p>
            
            <h3>Why Subscribe?</h3>
            <ul>
              <li>✓ Unlimited access to all features</li>
              <li>✓ Priority support</li>
              <li>✓ Regular updates and improvements</li>
            </ul>
            
            <p>Visit your dashboard now to subscribe!</p>
            
            <p>Best regards,<br>Mealie Team</p>
          `
        });

        // Notify admin about expiring trial
        await base44.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: '⚠️ Trial Expiring Tomorrow',
          body: `
            <h2>Trial Expiring Soon</h2>
            <p><strong>Coach:</strong> ${sub.coach_name}</p>
            <p><strong>Email:</strong> ${sub.coach_email}</p>
            <p><strong>Expires:</strong> Tomorrow (${trialEndDate.toLocaleDateString()})</p>
            
            <p>This is a good time to reach out and help convert them to a paid plan!</p>
          `
        });

        results.expiringSoon++;
        results.notified.push({
          coach: sub.coach_email,
          status: 'expiring_soon'
        });
      }
    }

    return Response.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monitor trials error:', error);
    return Response.json({ 
      error: error.message || 'Failed to monitor trials' 
    }, { status: 500 });
  }
});