import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || (user.user_type !== 'super_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { targetUserEmail, password } = await req.json();

    if (!targetUserEmail || !password) {
      return Response.json({ error: 'targetUserEmail and password are required' }, { status: 400 });
    }

    // Find the target user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === targetUserEmail.toLowerCase());

    if (!targetUser) {
      return Response.json({ error: 'User not found. Make sure the coach has been invited and has an account.' }, { status: 404 });
    }

    // Store the temporary password in the user's data field so admin can reference it
    // and send a reset email so the coach can set their own permanent password
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      data: {
        ...targetUser.data,
        temp_password: password,
        temp_password_set_at: new Date().toISOString(),
        temp_password_set_by: user.email,
        force_password_reset: true,
      }
    });

    // Also trigger a password reset email so the coach can set their own permanent password
    await base44.auth.resetPasswordRequest(targetUserEmail);

    console.log('Temp password stored and reset email sent for:', targetUserEmail, 'by admin:', user.email);

    return Response.json({ 
      success: true, 
      message: 'Temporary password stored and password reset email sent to coach.',
      note: 'The coach must use the reset email to set their actual login password.'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
});