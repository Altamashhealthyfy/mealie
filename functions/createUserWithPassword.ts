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
    const finalPassword = password || 'TempPass123!';

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

    // Create user with password using service role
    const newUser = await base44.asServiceRole.entities.User.create({
      email: finalEmail,
      full_name: finalFullName || finalEmail,
      user_type: finalUserType,
      role: 'user'
    });

    return Response.json({
      success: true,
      message: 'Health coach created successfully.',
      email: finalEmail,
      user_id: newUser.id,
      temporary_password: finalPassword
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});