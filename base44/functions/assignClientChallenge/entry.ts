import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { challenge_id, client_id, challenge_title } = await req.json();

    if (!challenge_id || !client_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if client already has this challenge
    const existing = await base44.entities.ClientChallenge.filter({
      client_id,
      challenge_id
    });

    if (existing.length > 0) {
      return Response.json({ error: 'Client already has this challenge' }, { status: 400 });
    }

    // Create client challenge assignment
    const clientChallenge = await base44.entities.ClientChallenge.create({
      client_id,
      challenge_id,
      challenge_title: challenge_title || 'Challenge',
      status: 'active',
      started_date: new Date().toISOString(),
      progress_percentage: 0
    });

    return Response.json({
      success: true,
      clientChallenge
    });
  } catch (error) {
    console.error('Error assigning challenge:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});