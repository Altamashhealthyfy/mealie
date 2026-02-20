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

        // Get Gmail OAuth access token (already authorized)
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        // Build RFC 2822 email message
        const fromEmail = Deno.env.get('GOOGLE_WORKSPACE_EMAIL') || user.email;
        const fromName = user.full_name || 'Health Coach';

        const rawMessage = [
            `From: "${fromName}" <${fromEmail}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            emailBody.replace(/\n/g, '<br/>')
        ].join('\r\n');

        // Base64url encode the message
        const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send via Gmail API
        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: encoded }),
        });

        if (!gmailRes.ok) {
            const errData = await gmailRes.json();
            throw new Error(errData?.error?.message || `Gmail API error: ${gmailRes.status}`);
        }

        const result = await gmailRes.json();

        return Response.json({ 
            success: true,
            from: fromEmail,
            to: to,
            messageId: result.id,
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