import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active subscriptions
    const subscriptions = await base44.asServiceRole.entities.HealthCoachSubscription.filter({
      status: 'active'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    // Filter subscriptions expiring within the next 7 days
    const expiring = subscriptions.filter(sub => {
      if (!sub.end_date) return false;
      const endDate = new Date(sub.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today && endDate <= in7Days;
    });

    if (expiring.length === 0) {
      return Response.json({ message: 'No subscriptions expiring in the next 7 days.', count: 0 });
    }

    const ADMIN_EMAIL = 'admin@healthyfy.in'; // Change to your actual admin email

    let notified = 0;
    const errors = [];

    for (const sub of expiring) {
      const endDate = new Date(sub.end_date);
      const daysLeft = Math.round((endDate - today) / (1000 * 60 * 60 * 24));
      const formattedDate = endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // Email to coach
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: sub.coach_email,
          subject: `⚠️ Your Healthyfy subscription expires in ${daysLeft} day(s)`,
          body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #f97316;">Subscription Expiring Soon</h2>
  <p>Dear ${sub.coach_name || 'Health Coach'},</p>
  <p>Your <strong>${sub.plan_name || 'Healthyfy'}</strong> subscription is expiring on <strong>${formattedDate}</strong> (in <strong>${daysLeft} day(s)</strong>).</p>
  <p>To continue enjoying uninterrupted access to all features, please renew your subscription before the expiry date.</p>
  <p style="margin-top: 24px;">
    <a href="https://app.base44.app/CoachSubscriptions" style="background: linear-gradient(to right, #f97316, #dc2626); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Renew Now
    </a>
  </p>
  <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">If you have already renewed or have questions, please contact your administrator.</p>
</div>
          `,
        });
        notified++;
      } catch (err) {
        errors.push(`Coach email failed for ${sub.coach_email}: ${err.message}`);
      }

      // Email to admin
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: `[Admin Alert] Coach subscription expiring: ${sub.coach_name || sub.coach_email}`,
          body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #dc2626;">Subscription Expiry Alert</h2>
  <p>The following coach subscription is expiring soon:</p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e5e7eb;">Coach Name</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${sub.coach_name || '—'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e5e7eb;">Email</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${sub.coach_email}</td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e5e7eb;">Plan</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${sub.plan_name || '—'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e5e7eb;">Expiry Date</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${formattedDate} (${daysLeft} day(s) left)</td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e5e7eb;">Billing Cycle</td>
      <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${sub.billing_cycle || '—'}</td>
    </tr>
  </table>
  <p style="margin-top: 16px; color: #6b7280; font-size: 13px;">Please follow up if renewal is needed.</p>
</div>
          `,
        });
      } catch (err) {
        errors.push(`Admin email failed for ${sub.coach_email}: ${err.message}`);
      }
    }

    return Response.json({
      message: `Checked ${subscriptions.length} active subscriptions. Found ${expiring.length} expiring soon. Notified ${notified} coach(es).`,
      expiring: expiring.map(s => ({ email: s.coach_email, name: s.coach_name, end_date: s.end_date })),
      errors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});