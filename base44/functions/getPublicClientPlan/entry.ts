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

    const plan = plans[0];
    
    // Only return plans that are global OR created by coaches (not test/personal plans)
    if (!plan) {
      return Response.json(null);
    }
    
    // Allow if plan is marked as global OR has a coach_email (created by a coach)
    if (plan.is_global || plan.coach_email) {
      return Response.json(plan);
    }
    
    // Hide personal/test plans
    return Response.json(null);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});