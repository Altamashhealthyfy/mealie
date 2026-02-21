import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { to, subject, body, from_name, reply_to } = await req.json();

        if (!to || !subject || !body) {
            return Response.json({ success: false, error: 'Missing required fields: to, subject, body' }, { status: 400 });
        }

        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        const senderName = from_name || user.full_name || 'Health Coach';
        const senderEmail = Deno.env.get('GOOGLE_WORKSPACE_EMAIL') || user.email;

        const htmlBody = body.replace(/\n/g, '<br/>');

        const headers = [
            `From: "${senderName}" <${senderEmail}>`,
            `To: ${to}`,
            `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
            reply_to ? `Reply-To: ${reply_to}` : '',
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
        ].filter(Boolean).join('\r\n');

        const rawMessage = `${headers}\r\n\r\n${htmlBody}`;

        const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

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
            messageId: result.id,
            from: senderEmail,
            to,
            sentAt: new Date().toISOString(),
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
});