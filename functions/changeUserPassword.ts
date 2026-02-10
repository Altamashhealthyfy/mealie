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

    // Update user password using backend SDK admin method
    const users = await base44.asServiceRole.entities.User.filter({ email: emailToUpdate });
    
    if (users.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Use the admin SDK to update password
    const adminUpdateUrl = `${Deno.env.get('BASE44_API_URL') || 'https://api.base44.com'}/admin/users/${users[0].id}/password`;
    const adminResponse = await fetch(adminUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ password })
    });

    if (!adminResponse.ok) {
      const error = await adminResponse.text();
      throw new Error(`Failed to update password: ${error}`);
    }

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