import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const password = body.password || body.new_password;
    const targetUserEmail = body.targetUserEmail;
    const coachName = body.coachName || targetUserEmail;

    const isAdminChangingPassword = targetUserEmail && user.user_type === 'super_admin';
    const isChangingSelf = !targetUserEmail;

    if (!isAdminChangingPassword && !isChangingSelf) {
      return Response.json({ error: 'Unauthorized to change password' }, { status: 403 });
    }

    const emailToUpdate = isAdminChangingPassword ? targetUserEmail : user.email;

    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Find the user by email using service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === emailToUpdate.toLowerCase());
    
    if (targetUser) {
      // User exists — update their password
      console.log('Updating password for user id:', targetUser.id, 'email:', targetUser.email);
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        password: password
      });
      return Response.json({ success: true, message: 'Password changed successfully' });
    } else {
      // User doesn't exist yet — create them with the given password
      console.log('User not found, creating new account for:', emailToUpdate);
      
      // Invite user first to create the account
      try {
        await base44.users.inviteUser(emailToUpdate, 'user');
      } catch (inviteError) {
        if (!inviteError.message?.includes('already exists')) {
          throw inviteError;
        }
      }

      // Wait and find the newly created user
      let foundUser = null;
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const users = await base44.asServiceRole.entities.User.list();
        foundUser = users.find(u => u.email?.toLowerCase() === emailToUpdate.toLowerCase());
        if (foundUser) break;
      }

      if (foundUser) {
        // Set password and user_type
        await base44.asServiceRole.entities.User.update(foundUser.id, {
          password: password,
          full_name: coachName,
          user_type: 'student_coach',
        });
        return Response.json({ success: true, message: 'Account created and password set successfully' });
      } else {
        return Response.json({ error: 'Could not create user account. Please try again.' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error changing password:', error);
    return Response.json({ error: error.message || 'Failed to change password' }, { status: 500 });
  }
});