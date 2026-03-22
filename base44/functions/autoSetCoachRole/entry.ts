import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * autoSetCoachRole — Entity Automation (User: create)
 * When a new user logs in for the first time, check if their email
 * exists in CoachSubscriptionHistory (action_type: account_created).
 * If yes, promote them to student_coach automatically.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    if (event?.type !== 'create' || !data?.email) {
      return Response.json({ success: true, skipped: true });
    }

    const userEmail = data.email.toLowerCase();

    // Check if this email was added as a pending coach
    const history = await base44.asServiceRole.entities.CoachSubscriptionHistory.filter({
      action_type: 'account_created',
    });

    const pendingRecord = history.find(
      h => h.coach_email?.toLowerCase() === userEmail
    );

    if (!pendingRecord) {
      return Response.json({ success: true, skipped: 'not a pending coach' });
    }

    // Promote the user to student_coach
    await base44.asServiceRole.entities.User.update(data.id, {
      user_type: 'student_coach',
      full_name: data.full_name || pendingRecord.coach_name || userEmail,
    });

    console.log(`Auto-promoted ${userEmail} to student_coach`);

    return Response.json({ success: true, message: `${userEmail} promoted to student_coach` });

  } catch (error) {
    console.error('autoSetCoachRole error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});