import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called when a client submits their symptom check-in form.
// Payload: { clientId, symptomStatus, energyLevel, digestiveHealth, notes, worseningDetails }
// symptomStatus: "improving" | "same" | "worsening" | "much_worse"

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { clientId, symptomStatus, energyLevel, digestiveHealth, notes, worseningDetails } = body;

    if (!clientId || !symptomStatus) {
      return Response.json({ error: 'clientId and symptomStatus are required' }, { status: 400 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1 — Fetch client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // 2 — Save to ProgressLog for history
    await base44.asServiceRole.entities.ProgressLog.create({
      client_id: clientId,
      date: todayStr,
      log_type: 'symptom_checkin',
      symptom_status: symptomStatus,
      energy_level: energyLevel || null,
      digestive_health: digestiveHealth || null,
      notes: notes || '',
      worsening_details: worseningDetails || '',
      submitted_at: now.toISOString()
    });

    // 3 — Determine if worsening — flag client + create alert
    const isWorsening = symptomStatus === 'worsening' || symptomStatus === 'much_worse';

    if (isWorsening) {
      // Flag the client record
      await base44.asServiceRole.entities.Client.update(clientId, {
        notes: `⚠️ ATTENTION NEEDED [${todayStr}]: Client reported ${symptomStatus} symptoms. ${worseningDetails ? 'Details: ' + worseningDetails : ''}. Previous notes: ${client.notes || ''}`.trim()
      });

      // Find coaches to notify
      const coachEmails = [];
      if (client.created_by) coachEmails.push(client.created_by);
      if (client.assigned_to && !coachEmails.includes(client.assigned_to)) coachEmails.push(client.assigned_to);
      if (Array.isArray(client.assigned_coach)) {
        client.assigned_coach.forEach(e => { if (e && !coachEmails.includes(e)) coachEmails.push(e); });
      }

      const severityLabel = symptomStatus === 'much_worse' ? '🚨 URGENT' : '⚠️ ATTENTION NEEDED';
      const alertTitle = `${severityLabel}: ${client.full_name} reported worsening symptoms`;
      const alertMsg = `${client.full_name} submitted a symptom check-in and reported "${symptomStatus.replace('_', ' ')}" symptoms on ${todayStr}.${worseningDetails ? ' Details: ' + worseningDetails : ''} Energy: ${energyLevel || 'N/A'}/5. Please review and reach out.`;

      for (const coachEmail of coachEmails) {
        // High-priority in-app notification for coach
        await base44.asServiceRole.entities.Notification.create({
          user_email: coachEmail,
          type: 'symptom_alert',
          title: alertTitle,
          message: alertMsg,
          priority: symptomStatus === 'much_worse' ? 'urgent' : 'high',
          link: `/ClientHub?clientId=${clientId}`,
          read: false,
          metadata: {
            client_id: clientId,
            client_name: client.full_name,
            symptom_status: symptomStatus,
            alert_date: todayStr,
            energy_level: energyLevel,
            worsening_details: worseningDetails
          }
        });

        // Email the coach
        const coachEmailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fef2f2; border-radius: 12px; border: 2px solid #fca5a5;">
            <div style="text-align:center; margin-bottom: 20px;">
              <div style="font-size: 48px; margin-bottom: 8px;">${symptomStatus === 'much_worse' ? '🚨' : '⚠️'}</div>
              <h2 style="color: #991b1b; font-size: 22px; margin: 0;">${severityLabel}</h2>
              <p style="color: #b91c1c; margin: 6px 0 0;">${client.full_name} needs your attention</p>
            </div>
            <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 140px;">Client</td><td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${client.full_name}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Symptom Status</td><td style="padding: 6px 0; color: #dc2626; font-weight: 700;">${symptomStatus.replace('_', ' ').toUpperCase()}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Energy Level</td><td style="padding: 6px 0; color: #1f2937;">${energyLevel ? energyLevel + '/5' : 'Not reported'}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Digestive Health</td><td style="padding: 6px 0; color: #1f2937;">${digestiveHealth || 'Not reported'}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Reported On</td><td style="padding: 6px 0; color: #1f2937;">${todayStr}</td></tr>
                ${worseningDetails ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Details</td><td style="padding: 6px 0; color: #1f2937;">${worseningDetails}</td></tr>` : ''}
                ${notes ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Notes</td><td style="padding: 6px 0; color: #1f2937; font-style: italic;">"${notes}"</td></tr>` : ''}
              </table>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${req.headers.get('origin') || 'https://app.base44.app'}/ClientHub?clientId=${clientId}" 
                style="background: linear-gradient(to right, #ef4444, #dc2626); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: bold; display: inline-block;">
                🔍 View Client Profile
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated alert from your Mealie health coaching platform.
            </p>
          </div>
        `;

        try {
          await base44.asServiceRole.functions.invoke('sendEmail', {
            to: coachEmail,
            subject: `${severityLabel}: ${client.full_name} reported ${symptomStatus.replace('_', ' ')} symptoms`,
            body: coachEmailBody
          });
        } catch (emailErr) {
          console.error(`Coach email failed for ${coachEmail}:`, emailErr.message);
        }
      }
    } else {
      // Positive check-in — still notify coach briefly
      const coachEmail = client.created_by || client.assigned_to;
      if (coachEmail) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: coachEmail,
          type: 'symptom_checkin_response',
          title: `✅ ${client.full_name} submitted symptom check-in`,
          message: `${client.full_name} reported "${symptomStatus.replace('_', ' ')}" symptoms. Energy: ${energyLevel || 'N/A'}/5. ${notes || ''}`,
          priority: 'low',
          link: `/ClientHub?clientId=${clientId}`,
          read: false,
          metadata: { client_id: clientId, symptom_status: symptomStatus, alert_date: todayStr }
        });
      }
    }

    return Response.json({
      success: true,
      isWorsening,
      message: isWorsening
        ? 'Your coach has been alerted and will reach out soon.'
        : 'Thank you! Your check-in has been recorded.'
    });

  } catch (error) {
    console.error('processSymptomResponse error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});