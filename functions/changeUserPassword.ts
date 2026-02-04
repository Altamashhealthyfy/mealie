import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin authentication
    const user = await base44.auth.me();
    if (!user || user.user_type !== 'super_admin') {
      return Response.json(
        { error: 'Only super admins can change passwords' },
        { status: 403 }
      );
    }

    const { email, password } = await req.json();

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

    // Update user password using admin privileges
    const result = await base44.asServiceRole.auth.updateUserPassword(email, password);

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