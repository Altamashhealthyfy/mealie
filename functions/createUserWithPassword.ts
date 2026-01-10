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

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // First, invite the user as admin
    await base44.users.inviteUser(email, 'admin');
    
    // The user is now invited and will be in the system
    // We need to wait a moment for the invitation to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now find the user and update their details
    const users = await base44.asServiceRole.entities.User.list();
    const newUser = users.find(u => u.email === email);
    
    if (newUser) {
      // Update user details
      await base44.asServiceRole.entities.User.update(newUser.id, {
        full_name: full_name || email,
        user_type: user_type || 'student_coach'
      });
    }

    return Response.json({
      success: true,
      message: 'User created successfully. Invitation email sent.',
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