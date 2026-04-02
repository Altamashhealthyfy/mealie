import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const loginDate = nowIST.toISOString().split('T')[0];

    // Avoid duplicate logs: check if already logged in last 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const recent = await base44.asServiceRole.entities.LoginActivity.filter({
      user_email: user.email
    });
    const hasRecent = recent.some(r => r.login_at && r.login_at > thirtyMinAgo);
    if (hasRecent) {
      return Response.json({ success: true, skipped: true });
    }

    await base44.asServiceRole.entities.LoginActivity.create({
      user_email: user.email,
      user_name: user.full_name || '',
      user_type: user.user_type || user.role || 'client',
      login_at: nowIST.toISOString(),
      login_date: loginDate,
      device_info: body.device_info || req.headers.get('user-agent') || '',
      page_url: body.page_url || '',
      session_id: body.session_id || '',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});