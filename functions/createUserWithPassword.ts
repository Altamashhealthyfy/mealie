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

    const { email, full_name, password, user_type } = await req.json();

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Invite user as "user" role first (works for new users)
    await base44.users.inviteUser(email, 'user');
    
    // Wait for invitation to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find the newly invited user and update their details
    const users = await base44.asServiceRole.entities.User.list();
    const newUser = users.find(u => u.email === email);
    
    if (newUser) {
      // Update user details with proper role
      await base44.asServiceRole.entities.User.update(newUser.id, {
        full_name: full_name || email,
        user_type: user_type || 'student_coach'
      });
    }

    return Response.json({
      success: true,
      message: 'Health coach created successfully. Invitation email sent.',
      email: email
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});