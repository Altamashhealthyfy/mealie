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

    // Send password reset email to the coach via the auth system
    await base44.auth.resetPasswordRequest(targetUserEmail);

    console.log('Password reset email sent to:', targetUserEmail);

    return Response.json({ success: true, message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error sending password reset:', error);
    return Response.json({ error: error.message || 'Failed to send password reset email' }, { status: 500 });
  }
});