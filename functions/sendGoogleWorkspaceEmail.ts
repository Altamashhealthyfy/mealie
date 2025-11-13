import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get request body
        const { to, subject, body, html } = await req.json();

        if (!to || !subject || !body) {
            return Response.json({ 
                error: 'Missing required fields: to, subject, body' 
            }, { status: 400 });
        }

        // Get credentials from environment
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        if (!email || !appPassword) {
            return Response.json({ 
                error: 'Google Workspace credentials not configured' 
            }, { status: 500 });
        }

        // Create transporter for Google Workspace
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: email,
                pass: appPassword
            }
        });

        // Email options
        const mailOptions = {
            from: `Healthyfy <${email}>`,
            to: to,
            subject: subject,
            text: body,
            html: html || body.replace(/\n/g, '<br>')
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        return Response.json({ 
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully from ' + email
        });

    } catch (error) {
        console.error("Error sending email:", error);
        return Response.json({ 
            error: error.message || 'Failed to send email',
            details: error.toString()
        }, { status: 500 });
    }
});