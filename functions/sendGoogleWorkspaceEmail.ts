import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        // Get request body
        const body = await req.json();
        const { to, subject, body: emailBody } = body;

        console.log("📧 Email Request:", { to, subject });

        if (!to || !subject || !emailBody) {
            return Response.json({ 
                success: false,
                error: 'Missing required fields: to, subject, body'
            }, { status: 400 });
        }

        // Get credentials
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        if (!email || !appPassword) {
            return Response.json({ 
                success: false,
                error: 'Credentials not configured',
                help: 'Set GOOGLE_WORKSPACE_EMAIL and GOOGLE_WORKSPACE_APP_PASSWORD in environment variables'
            }, { status: 500 });
        }

        // Clean password
        const cleanPassword = appPassword.replace(/\s+/g, '');

        console.log("📝 Config:", {
            email: email,
            passwordLength: cleanPassword.length,
            to: to
        });

        // Use Gmail API via fetch (simpler than nodemailer)
        const auth = btoa(`${email}:${cleanPassword}`);
        
        const emailContent = `From: Healthyfy <${email}>
To: ${to}
Subject: ${subject}
Content-Type: text/plain; charset=utf-8

${emailBody}`;

        console.log("🔑 Attempting SMTP auth...");

        // Try direct SMTP connection
        const smtpHost = 'smtp.gmail.com';
        const smtpPort = 587;

        // Use nodemailer dynamically imported
        const nodemailer = await import('npm:nodemailer@6.9.7');
        
        const transporter = nodemailer.default.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: false,
            auth: {
                user: email,
                pass: cleanPassword
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log("✅ Transporter created");

        // Verify connection
        console.log("🔍 Verifying connection...");
        await transporter.verify();
        console.log("✅ Connection verified");

        // Send email
        console.log("📤 Sending email...");
        const info = await transporter.sendMail({
            from: `Healthyfy <${email}>`,
            to: to,
            subject: subject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br>')
        });

        console.log("✅ Email sent:", info.messageId);

        return Response.json({ 
            success: true,
            messageId: info.messageId,
            from: email,
            to: to
        });

    } catch (error) {
        console.error("❌ Error:", error);
        console.error("Error type:", error.constructor.name);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        // Detailed error response
        let helpMessage = 'Unknown error occurred.';
        
        if (error.code === 'EAUTH') {
            helpMessage = 'Authentication failed. Check:\n1. App password is correct (16 chars)\n2. 2-Step Verification is enabled\n3. Using App Password, not regular password';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            helpMessage = 'Cannot connect to Gmail SMTP. Network or firewall issue.';
        } else if (error.message?.includes('authenticate')) {
            helpMessage = 'Gmail authentication failed. Regenerate your App Password.';
        }
        
        return Response.json({ 
            success: false,
            error: error.message,
            code: error.code,
            type: error.constructor.name,
            help: helpMessage
        }, { status: 500 });
    }
});