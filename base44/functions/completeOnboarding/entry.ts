import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, clientEmail } = await req.json();

    // Award onboarding completion points
    const pointsRecord = await base44.entities.GamificationPoints.create({
      client_id: clientId,
      client_email: clientEmail,
      points_awarded: 250,
      activity_type: 'onboarding_completed',
      description: 'Welcome bonus for completing onboarding',
      date_awarded: new Date().toISOString()
    });

    // Update client onboarding status
    await base44.entities.Client.update(clientId, {
      onboarding_completed: true,
      tutorial_completed: true
    });

    // Send welcome message from coach
    const coaches = await base44.entities.CoachProfile.filter({ created_by: user.email });
    if (coaches.length > 0) {
      await base44.entities.Message.create({
        client_id: clientId,
        sender_type: 'dietitian',
        sender_id: user.email,
        sender_name: coaches[0].business_name || user.full_name,
        message: `Welcome to your health journey! 🎉 We're excited to work with you. Your personalized meal plans and coaching will be ready soon. In the meantime, explore the dashboard and set your wellness goals.`,
        content_type: 'text'
      });
    }

    return Response.json({
      success: true,
      pointsAwarded: 250,
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});