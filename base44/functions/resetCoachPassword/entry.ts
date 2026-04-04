import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || (user.user_type !== 'super_admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const targetUserEmail = body?.targetUserEmail?.trim().toLowerCase();

    if (!targetUserEmail) {
      return Response.json({ error: 'targetUserEmail is required' }, { status: 400 });
    }

    // Verify user exists before sending reset email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === targetUserEmail);

    if (!targetUser) {
      return Response.json({ 
        error: `No account found for ${targetUserEmail}. The coach must be invited first before a password reset can be sent.` 
      }, { status: 404 });
    }

    // Send password reset email via the platform's auth system
    await base44.auth.resetPasswordRequest(targetUserEmail);

    console.log(`Password reset email sent to: ${targetUserEmail} by admin: ${user.email}`);

    return Response.json({ 
      success: true, 
      message: `Password reset email sent successfully to ${targetUserEmail}` 
    });

  } catch (error) {
    console.error('Error sending password reset:', error);
    return Response.json({ error: error.message || 'Failed to send password reset email' }, { status: 500 });
  }
});