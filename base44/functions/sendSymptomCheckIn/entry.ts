import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow automation or admin calls
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth && !req.headers.get('x-automation-key')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Get all active clients
    const allClients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });

    const sent = [];
    const skipped = [];

    for (const client of allClients) {
      if (!client.email) { skipped.push({ id: client.id, reason: 'no_email' }); continue; }

      // Check if a check-in was already sent in the last 3 days
      const recentNotifs = await base44.asServiceRole.entities.Notification.filter({
        user_email: client.email,
        type: 'symptom_checkin'
      }, '-created_date', 1);

      if (recentNotifs.length > 0) {
        const lastSent = new Date(recentNotifs[0].created_date);
        if (lastSent > threeDaysAgo) {
          skipped.push({ id: client.id, name: client.full_name, reason: 'sent_recently' });
          continue;
        }
      }

      // Build the check-in link (public page)
      const appBaseUrl = req.headers.get('origin') || 'https://app.base44.app';
      const checkInUrl = `${appBaseUrl}/SymptomCheckIn?clientId=${client.id}&email=${encodeURIComponent(client.email)}`;

      // 1 — In-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: client.email,
        type: 'symptom_checkin',
        title: '💚 Quick Symptom Check-in',
        message: 'Hi! How are your symptoms today? Please take 30 seconds to let your coach know. Tap to respond.',
        priority: 'normal',
        link: `/SymptomCheckIn?clientId=${client.id}&email=${encodeURIComponent(client.email)}`,
        read: false,
        metadata: { client_id: client.id, sent_date: todayStr }
      });

      // 2 — Email notification
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align:center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 8px;">💚</div>
            <h2 style="color: #1f2937; font-size: 22px; margin: 0;">3-Day Symptom Check-in</h2>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi <strong>${client.full_name}</strong>,
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            It's been 3 days — your coach wants to know how you're feeling. 
            Are your symptoms improving, staying the same, or worsening? 
            This quick check-in helps us tailor your meal plan and care.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${checkInUrl}" style="background: linear-gradient(to right, #10b981, #059669); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: bold; display: inline-block;">
              ✅ Submit My Check-in (30 sec)
            </a>
          </div>
          <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #10b981; margin-bottom: 20px;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 6px;">You'll be asked to rate:</p>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 18px; line-height: 1.8;">
              <li>Overall symptom status</li>
              <li>Energy level</li>
              <li>Digestive health</li>
              <li>Any new or worsening concerns</li>
            </ul>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
            Your coach reviews every response. 💙<br/>
            — Your Health Team
          </p>
        </div>
      `;

      try {
        await base44.asServiceRole.functions.invoke('sendEmail', {
          to: client.email,
          subject: `💚 How are your symptoms today, ${client.full_name}?`,
          body: emailBody
        });
      } catch (emailErr) {
        console.error(`Email failed for ${client.email}:`, emailErr.message);
      }

      sent.push({ id: client.id, name: client.full_name, email: client.email });
    }

    console.log(`Symptom check-ins: sent=${sent.length}, skipped=${skipped.length}`);
    return Response.json({ success: true, sent: sent.length, skipped: skipped.length, details: { sent, skipped: skipped.slice(0, 20) } });

  } catch (error) {
    console.error('sendSymptomCheckIn error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});