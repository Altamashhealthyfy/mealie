import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coaches } = await req.json();

    if (!Array.isArray(coaches) || coaches.length === 0) {
      return Response.json({ error: 'No coaches provided' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const coach of coaches) {
      try {
        // Invite the user
        await base44.users.inviteUser(coach.email, 'user');
        
        // Wait a moment for the user to be created
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Get the newly created user
        const allUsers = await base44.asServiceRole.entities.User.list();
        const newUser = allUsers.find(u => u.email === coach.email);
        
        if (newUser) {
          // Update user_type to student_coach
          await base44.asServiceRole.entities.User.update(newUser.id, {
            user_type: 'student_coach'
          });
        }
        
        // Create coach profile
        const profileResult = await base44.asServiceRole.entities.CoachProfile.create({
          created_by: coach.email
        });

        results.push({
          email: coach.email,
          name: coach.full_name,
          status: 'invited',
          profileId: profileResult.id
        });
      } catch (error) {
        errors.push({
          email: coach.email,
          name: coach.full_name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      invited: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error in bulkInviteHealthCoaches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});