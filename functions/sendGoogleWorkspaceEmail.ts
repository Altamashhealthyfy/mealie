import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

        // Use Base44's built-in email integration
        await base44.integrations.Core.SendEmail({
            from_name: 'Mealie Pro',
            to: to,
            subject: subject,
            body: emailBody
        });

        return Response.json({ 
            success: true,
            to: to,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Email sending error:', error);
        return Response.json({ 
            success: false,
            error: 'Email sending failed',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});