import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { email, password, targetUserEmail } = await req.json();

    // Check if this is admin changing someone else's password
    const isAdminChangingPassword = targetUserEmail && user.user_type === 'super_admin';
    
    // Check if coach is changing their own password
    const isCoachChangingSelf = !targetUserEmail && user.user_type === 'student_coach';
    
    if (!isAdminChangingPassword && !isCoachChangingSelf) {
      return Response.json(
        { error: 'Unauthorized to change password' },
        { status: 403 }
      );
    }

    const emailToUpdate = isAdminChangingPassword ? targetUserEmail : user.email;

    if (!password) {
      return Response.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Update user password using asServiceRole
    const users = await base44.asServiceRole.entities.User.filter({ email: emailToUpdate });
    
    if (!users || users.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetUser = users[0];
    
    // Update password using service role
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      password: password
    });

    return Response.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return Response.json(
      { error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
});