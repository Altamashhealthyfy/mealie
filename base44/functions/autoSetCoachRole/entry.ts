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

    // Guard: do not overwrite users who already have a non-client role
    const currentUser = await base44.asServiceRole.entities.User.filter({ id: data.id });
    const currentType = currentUser[0]?.user_type;
    const protectedRoles = ['health_coach', 'student_coach', 'super_admin', 'team_member', 'student_team_member'];
    if (protectedRoles.includes(currentType)) {
      console.log(`autoSetCoachRole skipped: ${userEmail} already has role ${currentType}`);
      return Response.json({ success: true, skipped: `already has role ${currentType}` });
    }

    // Promote the user to student_coach
    await base44.asServiceRole.entities.User.update(data.id, {
      user_type: 'student_coach',
      full_name: data.full_name || pendingRecord.coach_name || userEmail,
    });

    // Verify the write actually persisted
    const verifiedUsers = await base44.asServiceRole.entities.User.filter({ id: data.id });
    const verifiedType = verifiedUsers[0]?.user_type;
    console.log('autoSetCoachRole result:', data.id, 'student_coach', verifiedType);

    return Response.json({ success: true, message: `${userEmail} promoted to student_coach`, verified_type: verifiedType });

  } catch (error) {
    console.error('autoSetCoachRole error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});