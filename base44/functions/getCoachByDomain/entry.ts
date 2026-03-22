import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { domain } = await req.json();

    if (!domain) {
      return Response.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Find coach profile by custom domain
    const coaches = await base44.asServiceRole.entities.CoachProfile.filter({ 
      custom_domain: domain,
      custom_domain_status: 'active'
    });

    if (coaches.length === 0) {
      return Response.json({ error: 'Coach not found for this domain' }, { status: 404 });
    }

    const coach = coaches[0];
    
    return Response.json({
      success: true,
      branding: {
        name: coach.custom_branding_name || coach.business_name || 'Mealie',
        logo_url: coach.logo_url,
        tagline: coach.tagline
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});