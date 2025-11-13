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
        const body = await req.json();
        const { to, subject, body: emailBody, html } = body;

        console.log("📧 Email request received:", { to, subject, hasBody: !!emailBody });

        if (!to || !subject || !emailBody) {
            return Response.json({ 
                error: 'Missing required fields',
                details: 'Required: to, subject, body'
            }, { status: 400 });
        }

        // Get credentials from environment
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        console.log("🔑 Credentials check:", { 
            emailConfigured: !!email,
            email: email,
            passwordConfigured: !!appPassword,
            passwordLength: appPassword?.length 
        });

        if (!email || !appPassword) {
            return Response.json({ 
                error: 'Google Workspace credentials not configured',
                details: 'Please set GOOGLE_WORKSPACE_EMAIL and GOOGLE_WORKSPACE_APP_PASSWORD in Dashboard → Settings → Environment Variables'
            }, { status: 500 });
        }

        // Remove any spaces from app password (common issue)
        const cleanPassword = appPassword.replace(/\s/g, '');

        console.log("🔧 Creating transporter with config:", {
            host: 'smtp.gmail.com',
            port: 587,
            user: email
        });

        // Create transporter for Google Workspace
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: email,
                pass: cleanPassword
            },
            tls: {
                rejectUnauthorized: true
            },
            debug: true, // Enable debug output
            logger: true // Enable logging
        });

        // Verify connection
        console.log("🔍 Verifying SMTP connection...");
        try {
            await transporter.verify();
            console.log("✅ SMTP connection verified successfully");
        } catch (verifyError) {
            console.error("❌ SMTP verification failed:", verifyError);
            return Response.json({ 
                error: 'SMTP connection failed',
                details: verifyError.message,
                help: 'Check: 1) App password is correct (16 chars, no spaces), 2) 2-Step Verification is enabled, 3) Less secure app access is OFF'
            }, { status: 500 });
        }

        // Email options
        const mailOptions = {
            from: `Healthyfy <${email}>`,
            to: to,
            subject: subject,
            text: emailBody,
            html: html || emailBody.replace(/\n/g, '<br>')
        };

        console.log("📤 Sending email...");

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Email sent successfully:", info.messageId);

        return Response.json({ 
            success: true,
            messageId: info.messageId,
            message: `Email sent successfully from ${email} to ${to}`,
            from: email
        });

    } catch (error) {
        console.error("❌ Error sending email:", error);
        
        // Detailed error response
        return Response.json({ 
            error: 'Failed to send email',
            message: error.message,
            code: error.code,
            details: error.toString(),
            help: error.code === 'EAUTH' 
                ? 'Authentication failed. Please verify: 1) App password is correct (16 chars), 2) 2-Step Verification is enabled in Google Account, 3) Generated App Password for "Mail"'
                : 'Check server logs for details'
        }, { status: 500 });
    }
});