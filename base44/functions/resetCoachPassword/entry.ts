import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || (user.user_type !== 'super_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { targetUserEmail } = await req.json();

    if (!targetUserEmail) {
      return Response.json({ error: 'targetUserEmail is required' }, { status: 400 });
    }

    // Generate a secure random password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let newPassword = '';
    for (let i = 0; i < 10; i++) {
      newPassword += chars[Math.floor(Math.random() * chars.length)];
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === targetUserEmail.toLowerCase());

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(targetUser.id, { password: newPassword });

    return Response.json({ success: true, newPassword });
  } catch (error) {
    console.error('Error resetting password:', error);
    return Response.json({ error: error.message || 'Failed to reset password' }, { status: 500 });
  }
});