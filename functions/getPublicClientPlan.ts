import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { planId } = await req.json();

    if (!planId) {
      return Response.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plans = await base44.asServiceRole.entities.ClientPlanDefinition.filter({ 
      id: planId, 
      status: 'active' 
    });

    return Response.json(plans[0] || null);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});