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

        const workspaceEmail = Deno.env.get('GOOGLE_WORKSPACE_EMAIL') || 'contactus@healthyfy.com';

        // Use Gmail API via fetch since SMTP is blocked
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await base44.asServiceRole.connectors.getAccessToken('gmail')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: btoa(
                    `From: ${workspaceEmail}\r\n` +
                    `To: ${to}\r\n` +
                    `Subject: ${subject}\r\n` +
                    `Content-Type: text/html; charset=utf-8\r\n\r\n` +
                    emailBody
                ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gmail API error: ${error}`);
        }

        const result = await response.json();

        return Response.json({ 
            success: true,
            from: workspaceEmail,
            to: to,
            messageId: result.id,
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