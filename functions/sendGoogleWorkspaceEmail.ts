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

        // Create properly formatted MIME message
        const emailContent = [
            `From: ${workspaceEmail}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            emailBody
        ].join('\r\n');

        // Encode to base64url format (replace + with -, / with _, remove =)
        const encoder = new TextEncoder();
        const data = encoder.encode(emailContent);
        const base64 = btoa(String.fromCharCode(...data));
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        // Use Gmail API via fetch
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await base44.asServiceRole.connectors.getAccessToken('gmail')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: base64url
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