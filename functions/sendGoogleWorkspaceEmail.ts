import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.9';

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

        const gmailUser = Deno.env.get('GOOGLE_WORKSPACE_EMAIL');
        const gmailPass = Deno.env.get('GOOGLE_WORKSPACE_APP_PASSWORD');

        if (!gmailUser || !gmailPass) {
            return Response.json({
                success: false,
                error: 'Google Workspace email credentials not configured'
            }, { status: 500 });
        }

        // Create SMTP transporter using Google Workspace / Gmail App Password
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        await transporter.sendMail({
            from: `"${user.full_name || 'Health Coach'}" <${gmailUser}>`,
            to: to,
            subject: subject,
            html: emailBody.replace(/\n/g, '<br/>'),
            text: emailBody,
        });

        return Response.json({ 
            success: true,
            from: gmailUser,
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