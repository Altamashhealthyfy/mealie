import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { coach_id, full_name, email, phone, old_email } = payload;

    if (!coach_id || !full_name || !email || !old_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update user details with service role (directly by ID)
    await base44.asServiceRole.entities.User.update(coach_id, {
      full_name: full_name,
      email: email,
      phone: phone || null,
    });

    // Update all subscription records with new name/email
    const subscriptions = await base44.asServiceRole.entities.HealthCoachSubscription.filter({ 
      coach_email: old_email 
    });

    for (const sub of subscriptions) {
      await base44.asServiceRole.entities.HealthCoachSubscription.update(sub.id, {
        coach_email: email,
        coach_name: full_name,
      });
    }

    // Update CoachProfile if exists
    const profiles = await base44.asServiceRole.entities.CoachProfile.filter({ created_by: old_email });
    for (const profile of profiles) {
      await base44.asServiceRole.entities.CoachProfile.update(profile.id, {
        created_by: email,
      });
    }

    // Update Client assignments if exists
    const clients = await base44.asServiceRole.entities.Client.filter({ assigned_coach: [old_email] });
    for (const client of clients) {
      const updatedCoaches = client.assigned_coach.map(coach => coach === old_email ? email : coach);
      await base44.asServiceRole.entities.Client.update(client.id, {
        assigned_coach: updatedCoaches,
      });
    }

    // Record history
    await base44.asServiceRole.entities.CoachSubscriptionHistory.create({
      coach_email: email,
      coach_name: full_name,
      action_type: 'profile_updated',
      old_value: `${old_email}`,
      new_value: `${full_name} (${email})`,
      performed_by: user.email,
    });

    return Response.json({ 
      success: true,
      message: 'Coach profile updated successfully' 
    });
  } catch (error) {
    console.error('Update coach profile error:', error);
    return Response.json({ 
      error: error.message || 'Failed to update coach profile' 
    }, { status: 500 });
  }
});