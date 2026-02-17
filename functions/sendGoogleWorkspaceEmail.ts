import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

        const workspaceEmail = Deno.env.get('GOOGLE_WORKSPACE_EMAIL');
        const workspacePassword = Deno.env.get('GOOGLE_WORKSPACE_APP_PASSWORD');

        if (!workspaceEmail || !workspacePassword) {
            return Response.json({ 
                success: false,
                error: 'Google Workspace credentials not configured'
            }, { status: 500 });
        }

        // Send email using Google Workspace SMTP
        const client = new SMTPClient({
            connection: {
                hostname: "smtp.gmail.com",
                port: 465,
                tls: true,
                auth: {
                    username: workspaceEmail,
                    password: workspacePassword,
                },
            },
        });

        await client.send({
            from: workspaceEmail,
            to: to,
            subject: subject,
            content: emailBody,
            html: emailBody,
        });

        await client.close();

        return Response.json({ 
            success: true,
            from: workspaceEmail,
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