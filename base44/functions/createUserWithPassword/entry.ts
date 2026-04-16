import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedTypes = ['super_admin', 'student_coach', 'team_member', 'student_team_member'];
    if (!allowedTypes.includes(user.user_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, fullName, full_name, userType, user_type } = await req.json();

    const finalEmail = email?.trim().toLowerCase();
    const finalFullName = fullName || full_name || finalEmail;
    const finalUserType = userType || user_type || 'student_coach';

    if (!finalEmail) return Response.json({ error: 'Email is required' }, { status: 400 });

    // Check if user already exists — filter by email directly instead of listing all
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
    const existingUser = existingUsers[0];

    if (existingUser) {
      // Already exists — just update role
      await base44.asServiceRole.entities.User.update(existingUser.id, {
        full_name: finalFullName,
        user_type: finalUserType,
      });
      return Response.json({
        success: true,
        message: `User already exists — role updated to ${finalUserType}`,
        email: finalEmail,
        user_id: existingUser.id,
        activated: true,
      });
    }

    // Send invite (triggers Base44 account creation)
    try {
      await base44.users.inviteUser(finalEmail, 'user');
    } catch (inviteError) {
      if (!inviteError.message?.includes('already exists')) throw inviteError;
    }

    // Poll for the new user with 3 attempts × 2s = 6s max (reduced from 12s)
    let foundUser = null;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const users = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
      foundUser = users[0];
      if (foundUser) break;
    }

    if (foundUser) {
      await base44.asServiceRole.entities.User.update(foundUser.id, {
        full_name: finalFullName,
        user_type: finalUserType,
      });

      console.log('createUserWithPassword: activated', finalEmail, 'as', finalUserType);

      return Response.json({
        success: true,
        message: 'Health coach created and activated successfully',
        email: finalEmail,
        user_id: foundUser.id,
        activated: true,
      });
    }

    // Not found yet — will be auto-activated on first login via automation
    return Response.json({
      success: true,
      message: `Invitation sent to ${finalEmail}. Coach will appear as "Pending Login" until they log in.`,
      email: finalEmail,
      activated: false,
      pending: true,
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
});