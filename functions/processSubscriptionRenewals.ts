import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const today = new Date();
    const results = {
      coach_reminders_sent: 0,
      client_reminders_sent: 0,
      coach_expired: 0,
      client_expired: 0,
      errors: []
    };

    // Process Coach Subscriptions
    const coachSubscriptions = await base44.asServiceRole.entities.HealthCoachSubscription.filter({ 
      status: 'active' 
    });

    for (const sub of coachSubscriptions) {
      try {
        const endDate = new Date(sub.end_date);
        const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        // Mark as expired if past end date
        if (daysUntilExpiry < 0) {
          await base44.asServiceRole.entities.HealthCoachSubscription.update(sub.id, {
            status: 'expired'
          });
          results.coach_expired++;
          
          // Send expiration notification
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: sub.coach_email,
            subject: '⚠️ Your Health Coach Subscription Has Expired',
            body: `
              <h2>Subscription Expired</h2>
              <p>Hi ${sub.coach_name || 'Coach'},</p>
              <p>Your ${sub.plan_name} subscription has expired as of ${endDate.toLocaleDateString()}.</p>
              <p>To continue enjoying premium features, please renew your subscription.</p>
              <p>Contact support if you have any questions.</p>
              <br>
              <p>Best regards,<br>Mealie Team</p>
            `
          });
        }
        // Send renewal reminders
        else if ([7, 3, 1].includes(daysUntilExpiry)) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: sub.coach_email,
            subject: `⏰ Subscription Expiring in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'Day' : 'Days'}`,
            body: `
              <h2>Renewal Reminder</h2>
              <p>Hi ${sub.coach_name || 'Coach'},</p>
              <p>Your ${sub.plan_name} subscription will expire in <strong>${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}</strong> on ${endDate.toLocaleDateString()}.</p>
              <p>To avoid interruption of service, please renew your subscription.</p>
              ${sub.auto_renew ? '<p><strong>Auto-renewal is enabled.</strong> Your subscription will be renewed automatically.</p>' : ''}
              <p>Thank you for being a valued member!</p>
              <br>
              <p>Best regards,<br>Mealie Team</p>
            `
          });
          results.coach_reminders_sent++;
        }
      } catch (error) {
        results.errors.push({
          type: 'coach',
          email: sub.coach_email,
          error: error.message
        });
      }
    }

    // Process Client Subscriptions
    const clientPurchases = await base44.asServiceRole.entities.ClientPlanPurchase.filter({ 
      status: 'active' 
    });

    for (const purchase of clientPurchases) {
      try {
        const endDate = new Date(purchase.end_date);
        const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        // Mark as expired if past end date
        if (daysUntilExpiry < 0) {
          await base44.asServiceRole.entities.ClientPlanPurchase.update(purchase.id, {
            status: 'expired'
          });
          results.client_expired++;
          
          // Update client subscription status
          const clientSubs = await base44.asServiceRole.entities.ClientSubscription.filter({
            client_id: purchase.client_id,
            status: 'active'
          });
          
          for (const clientSub of clientSubs) {
            await base44.asServiceRole.entities.ClientSubscription.update(clientSub.id, {
              status: 'expired'
            });
          }
          
          // Send expiration notification to client
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: purchase.client_email,
            subject: '⚠️ Your Subscription Has Expired',
            body: `
              <h2>Subscription Expired</h2>
              <p>Hi ${purchase.client_name || 'Client'},</p>
              <p>Your ${purchase.plan_name} subscription has expired as of ${endDate.toLocaleDateString()}.</p>
              <p>To continue your wellness journey, please contact your coach to renew.</p>
              <br>
              <p>Best regards,<br>Your Wellness Team</p>
            `
          });
        }
        // Send renewal reminders
        else if ([7, 3, 1].includes(daysUntilExpiry)) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: purchase.client_email,
            subject: `⏰ Subscription Expiring in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'Day' : 'Days'}`,
            body: `
              <h2>Renewal Reminder</h2>
              <p>Hi ${purchase.client_name || 'Client'},</p>
              <p>Your ${purchase.plan_name} subscription will expire in <strong>${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}</strong> on ${endDate.toLocaleDateString()}.</p>
              <p>Contact your coach (${purchase.coach_email}) to renew and continue your progress.</p>
              <br>
              <p>Best regards,<br>Your Wellness Team</p>
            `
          });
          results.client_reminders_sent++;
        }
      } catch (error) {
        results.errors.push({
          type: 'client',
          email: purchase.client_email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});