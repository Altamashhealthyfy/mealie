import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify access - allow super_admin, student_coach, and team_member
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const allowedTypes = ['super_admin', 'student_coach', 'team_member', 'student_team_member'];
    if (!allowedTypes.includes(user.user_type)) {
      return Response.json(
        { error: 'Unauthorized - Only health coaches and team members can create accounts' },
        { status: 403 }
      );
    }

    const { email, fullName, full_name, password, userType, user_type } = await req.json();
    
    const finalEmail = email;
    const finalFullName = fullName || full_name;
    const finalUserType = userType || user_type || 'student_coach';
    const finalPassword = password || 'HFI@123';

    if (!finalEmail) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (finalPassword.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
    if (existingUsers.length > 0) {
      return Response.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Invite user through Base44 authentication system
    // This creates the user account and sends invitation email
    try {
      const inviteResult = await base44.users.inviteUser(finalEmail, 'user');
      console.log('Invite result:', inviteResult);
    } catch (inviteError) {
      console.error('Invite error:', inviteError);
      // If user already exists, continue to update their details
      if (!inviteError.message?.includes('already exists')) {
        throw inviteError;
      }
    }

    // Wait for user to be created in the system
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to find and update user record
    let users = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
    console.log('Found users:', users.length);
    
    // Retry a few times if user not found yet
    let retries = 3;
    while (users.length === 0 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      users = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
      console.log(`Retry ${4-retries}: Found users:`, users.length);
      retries--;
    }
    
    if (users.length > 0) {
      const updatedUser = await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: finalFullName || finalEmail,
        user_type: finalUserType,
      });
      console.log('Updated user:', updatedUser);

      return Response.json({
        success: true,
        message: `Health coach created successfully. An invitation email has been sent to ${finalEmail}`,
        email: finalEmail,
        user_id: users[0].id,
        note: 'User will receive an email to set their password'
      });
    } else {
      // User will be created when they click the invitation link
      return Response.json({
        success: true,
        message: `Invitation sent successfully to ${finalEmail}`,
        email: finalEmail,
        note: 'The health coach will appear in the list once they accept the invitation and set their password'
      });
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});