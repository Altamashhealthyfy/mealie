import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const password = body.password || body.new_password;
    const targetUserEmail = body.targetUserEmail;

    // Allow super_admin to change other users' passwords, or any user to change their own
    const isAdminChangingPassword = targetUserEmail && user.user_type === 'super_admin';
    const isChangingSelf = !targetUserEmail;

    if (!isAdminChangingPassword && !isChangingSelf) {
      return Response.json({ error: 'Unauthorized to change password' }, { status: 403 });
    }

    const emailToUpdate = isAdminChangingPassword ? targetUserEmail : user.email;

    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Use auth service role to change password
    await base44.asServiceRole.auth.setUserPassword(emailToUpdate, password);

    return Response.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    
    // Fallback: try updating via entities if auth method fails
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json().catch(() => ({}));
      const password = body.password || body.new_password;
      const targetUserEmail = body.targetUserEmail;
      
      const users = await base44.asServiceRole.entities.User.filter({ email: targetUserEmail });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      
      await base44.asServiceRole.entities.User.update(users[0].id, { password });
      return Response.json({ success: true, message: 'Password changed successfully' });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return Response.json({ error: error.message || 'Failed to change password' }, { status: 500 });
    }
  }
});