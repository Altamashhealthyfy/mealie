import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { coachEmail } = await req.json();

    if (!coachEmail) {
      return Response.json({ error: 'Coach email is required' }, { status: 400 });
    }

    const profiles = await base44.asServiceRole.entities.CoachProfile.filter({ 
      created_by: coachEmail 
    });

    return Response.json(profiles[0] || null);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});