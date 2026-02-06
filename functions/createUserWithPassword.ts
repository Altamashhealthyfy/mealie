import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.user_type !== 'super_admin') {
      return Response.json(
        { error: 'Unauthorized - Admin access required' },
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
    const inviteResult = await base44.users.inviteUser(finalEmail, 'user');

    // Update user record with additional details
    const users = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: finalFullName || finalEmail,
        user_type: finalUserType,
      });
    }

    return Response.json({
      success: true,
      message: `Health coach created successfully. An invitation email has been sent to ${finalEmail}`,
      email: finalEmail,
      user_id: users[0]?.id,
      note: 'User will receive an email to set their password'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});