import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Step 1: Get all coach emails from CoachSubscriptionHistory with action_type: account_created
    const history = await base44.asServiceRole.entities.CoachSubscriptionHistory.filter({ action_type: 'account_created' });
    const coachEmails = [...new Set(history.map(h => h.coach_email?.toLowerCase()).filter(Boolean))];

    if (coachEmails.length === 0) {
      return Response.json({ success: true, fixed: 0, skipped: 0, notFound: 0, message: 'No coach history records found' });
    }

    // Step 2: Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    let fixed = 0;
    let skipped = 0;
    let notFound = 0;
    const fixedList = [];
    const notFoundList = [];

    // Step 3: For each coach email, check and fix their role
    for (const email of coachEmails) {
      const matchedUser = allUsers.find(u => u.email?.toLowerCase() === email);

      if (!matchedUser) {
        notFound++;
        notFoundList.push(email);
        continue;
      }

      if (matchedUser.user_type === 'student_coach') {
        skipped++;
        continue;
      }

      // Fix the role
      await base44.asServiceRole.entities.User.update(matchedUser.id, {
        user_type: 'student_coach',
      });

      fixed++;
      fixedList.push({ email, name: matchedUser.full_name, was: matchedUser.user_type });
    }

    return Response.json({
      success: true,
      fixed,
      skipped,
      notFound,
      fixedList,
      notFoundList,
      message: `Fixed ${fixed} coach role(s). ${skipped} already correct. ${notFound} not yet registered.`,
    });

  } catch (error) {
    console.error('fixAllCoachRoles error:', error);
    return Response.json({ error: error.message || 'Failed to fix coach roles' }, { status: 500 });
  }
});