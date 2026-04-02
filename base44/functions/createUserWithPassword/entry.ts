import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // Check if user already exists by listing all users and matching email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email?.toLowerCase() === finalEmail);

    if (existingUser) {
      // Already exists — just promote their role
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

    // Send invite (this triggers the Base44 account creation flow)
    try {
      await base44.users.inviteUser(finalEmail, 'user');
    } catch (inviteError) {
      if (!inviteError.message?.includes('already exists')) throw inviteError;
    }

    // Re-apply correct user_type immediately after invite, in case invite resets it
    // Try to find the user after invite with retries (up to ~12 seconds)
    let foundUser = null;
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const users = await base44.asServiceRole.entities.User.list();
      foundUser = users.find(u => u.email?.toLowerCase() === finalEmail);
      if (foundUser) break;
    }

    if (foundUser) {
      // Always re-set user_type AFTER invite to prevent invite system from overwriting it
      await base44.asServiceRole.entities.User.update(foundUser.id, {
        full_name: finalFullName,
        user_type: finalUserType,
      });

      // Verify the write persisted
      const verifiedUsers = await base44.asServiceRole.entities.User.list();
      const verifiedUser = verifiedUsers.find(u => u.email?.toLowerCase() === finalEmail);
      console.log('createUserWithPassword result:', finalEmail, finalUserType, verifiedUser?.user_type);

      return Response.json({
        success: true,
        message: 'Health coach created and activated successfully',
        email: finalEmail,
        user_id: foundUser.id,
        activated: true,
        verified_type: verifiedUser?.user_type,
      });
    }

    // User not found yet — will be auto-activated via automation when they first log in
    // The CoachSubscriptionHistory record (action_type: account_created) acts as the trigger
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