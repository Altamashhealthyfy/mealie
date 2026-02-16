import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized - No user logged in' 
            }, { status: 401 });
        }

        const body = await req.json();
        const { to, subject, body: emailBody } = body;

        if (!to || !subject || !emailBody) {
            return Response.json({ 
                success: false,
                error: 'Missing required fields: to, subject, body'
            }, { status: 400 });
        }

        // Use the built-in SendEmail integration
        const result = await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: user.full_name || 'Mealie Pro',
            to: to,
            subject: subject,
            body: emailBody
        });

        return Response.json({ 
            success: true,
            from: 'noreply@mealiepro.com',
            to: to,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ 
            success: false,
            error: 'Email sending failed',
            details: error.message,
        }, { status: 500 });
    }
});