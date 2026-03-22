import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.user_type !== 'student_coach') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await req.json();

    if (!domain) {
      return Response.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Get coach profile
    const profiles = await base44.entities.CoachProfile.filter({ created_by: user.email });
    const profile = profiles[0];

    if (!profile || profile.custom_domain !== domain) {
      return Response.json({ error: 'Domain not found in profile' }, { status: 404 });
    }

    // Verify DNS records using DNS-over-HTTPS
    const verificationCode = profile.domain_verification_code;
    
    // Check CNAME record
    let cnameValid = false;
    try {
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const cnameData = await cnameResponse.json();
      
      if (cnameData.Answer) {
        cnameValid = cnameData.Answer.some(record => 
          record.data?.replace(/\.$/, '').includes('mealie-platform.base44.app')
        );
      }
      
      // Also check A records as alternative to CNAME
      if (!cnameValid) {
        const aResponse = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
          { headers: { 'Accept': 'application/dns-json' } }
        );
        const aData = await aResponse.json();
        if (aData.Answer && aData.Answer.length > 0) {
          cnameValid = true; // If A record exists pointing anywhere, consider it configured
        }
      }
    } catch (error) {
      console.error('CNAME check error:', error);
    }

    // Check TXT record for verification - try both root and subdomain
    let txtValid = false;
    try {
      // Try _mealie-verify at the subdomain level first
      let txtResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=_mealie-verify.${domain}&type=TXT`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      let txtData = await txtResponse.json();
      
      if (txtData.Answer) {
        txtValid = txtData.Answer.some(record => 
          record.data?.replace(/"/g, '').includes(verificationCode)
        );
      }
      
      // If not found, try at root domain level
      if (!txtValid) {
        const rootDomain = domain.split('.').slice(-2).join('.');
        txtResponse = await fetch(
          `https://cloudflare-dns.com/dns-query?name=_mealie-verify.${rootDomain}&type=TXT`,
          { headers: { 'Accept': 'application/dns-json' } }
        );
        txtData = await txtResponse.json();
        
        if (txtData.Answer) {
          txtValid = txtData.Answer.some(record => 
            record.data?.replace(/"/g, '').includes(verificationCode)
          );
        }
      }
    } catch (error) {
      console.error('TXT check error:', error);
    }

    // Update profile based on verification results
    if (cnameValid && txtValid) {
      await base44.entities.CoachProfile.update(profile.id, {
        custom_domain_status: 'active',
        domain_configured_date: new Date().toISOString()
      });

      return Response.json({
        success: true,
        status: 'active',
        message: '✅ Domain verified successfully!'
      });
    } else {
      const issues = [];
      if (!cnameValid) issues.push('CNAME record not found or incorrect');
      if (!txtValid) issues.push('TXT verification record not found');

      return Response.json({
        success: false,
        status: 'pending_verification',
        message: `❌ Verification failed:\n${issues.join('\n')}`,
        details: { cnameValid, txtValid }
      });
    }

  } catch (error) {
    console.error('Verification error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});