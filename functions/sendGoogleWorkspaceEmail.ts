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

        console.log("📧 Email request received:", { to, subject });

        if (!to || !subject || !emailBody) {
            return Response.json({ 
                error: 'Missing required fields',
                details: 'Required: to, subject, body'
            }, { status: 400 });
        }

        // Get credentials from environment
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        if (!email || !appPassword) {
            return Response.json({ 
                error: 'Google Workspace credentials not configured',
                details: 'Please set GOOGLE_WORKSPACE_EMAIL and GOOGLE_WORKSPACE_APP_PASSWORD in Dashboard → Settings → Environment Variables',
                help: 'Get App Password from: https://myaccount.google.com/apppasswords'
            }, { status: 500 });
        }

        // Clean password (remove spaces)
        const cleanPassword = appPassword.replace(/\s/g, '');

        console.log("🔧 Email config:", { from: email, to: to });

        // Multiple SMTP configurations to try
        const configs = [
            // Config 1: Standard Gmail SMTP with STARTTLS (works for both Gmail and Workspace)
            {
                name: 'Gmail SMTP (Port 587)',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: { user: email, pass: cleanPassword },
                tls: { rejectUnauthorized: false }
            },
            // Config 2: Gmail SMTP with SSL (alternative)
            {
                name: 'Gmail SMTP SSL (Port 465)',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: { user: email, pass: cleanPassword },
                tls: { rejectUnauthorized: false }
            },
            // Config 3: Google Workspace SMTP (if using custom domain)
            {
                name: 'Workspace SMTP (Port 587)',
                host: 'smtp-relay.gmail.com',
                port: 587,
                secure: false,
                auth: { user: email, pass: cleanPassword },
                tls: { rejectUnauthorized: false }
            }
        ];

        let lastError = null;

        // Try each configuration
        for (const config of configs) {
            try {
                console.log(`🔍 Trying: ${config.name}...`);
                
                const transporter = nodemailer.createTransport({
                    ...config,
                    connectionTimeout: 10000, // 10 seconds
                    greetingTimeout: 10000,
                    socketTimeout: 10000
                });

                // Verify connection
                await transporter.verify();
                console.log(`✅ Connected with: ${config.name}`);

                // Email options
                const mailOptions = {
                    from: `Healthyfy <${email}>`,
                    to: to,
                    subject: subject,
                    text: emailBody,
                    html: html || emailBody.replace(/\n/g, '<br>')
                };

                // Send email
                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent successfully via ${config.name}:`, info.messageId);

                return Response.json({ 
                    success: true,
                    messageId: info.messageId,
                    message: `Email sent successfully from ${email} to ${to}`,
                    method: config.name,
                    from: email
                });

            } catch (configError) {
                console.log(`❌ ${config.name} failed:`, configError.message);
                lastError = configError;
                continue; // Try next config
            }
        }

        // All configs failed
        throw lastError || new Error('All SMTP configurations failed');

    } catch (error) {
        console.error("❌ Final error:", error);
        
        // Detailed error response with troubleshooting
        const errorResponse = {
            error: 'Failed to send email',
            message: error.message,
            code: error.code
        };

        // Add specific help based on error code
        if (error.code === 'EAUTH') {
            errorResponse.help = '❌ Authentication Failed. Please:\n1. Enable 2-Step Verification in Google Account\n2. Generate App Password at: https://myaccount.google.com/apppasswords\n3. Select "Mail" and "Other device"\n4. Copy the 16-character password\n5. Paste in Dashboard → Settings → Environment Variables';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorResponse.help = '❌ Connection Failed. This might be a network/firewall issue. Try:\n1. Check internet connection\n2. Contact Base44 support about SMTP access\n3. Use Gmail compose method as backup';
        } else if (error.code === 'EENVELOPE') {
            errorResponse.help = '❌ Invalid email address. Check recipient email.';
        } else {
            errorResponse.help = '❌ Unknown error. Please:\n1. Verify App Password is correct\n2. Check function logs in Dashboard\n3. Use Gmail compose method as backup';
        }

        return Response.json(errorResponse, { status: 500 });
    }
});