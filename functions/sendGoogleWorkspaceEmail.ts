import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import nodemailer from 'npm:nodemailer@6.9.7';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            console.error("❌ Authentication failed - no user");
            return Response.json({ 
                success: false,
                error: 'Unauthorized',
                help: 'User not authenticated' 
            }, { status: 401 });
        }

        console.log("✅ User authenticated:", user.email);

        // Get request body
        const body = await req.json();
        const { to, subject, body: emailBody, html } = body;

        console.log("📧 Email request:", { 
            from_user: user.email,
            to: to, 
            subject: subject,
            has_body: !!emailBody 
        });

        // Validate required fields
        if (!to || !subject || !emailBody) {
            console.error("❌ Missing required fields:", { to: !!to, subject: !!subject, body: !!emailBody });
            return Response.json({ 
                success: false,
                error: 'Missing required fields',
                details: {
                    to: to ? '✓' : '✗ Missing',
                    subject: subject ? '✓' : '✗ Missing',
                    body: emailBody ? '✓' : '✗ Missing'
                }
            }, { status: 400 });
        }

        // Get credentials from environment
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        console.log("🔑 Checking credentials:");
        console.log("  - Email configured:", !!email);
        console.log("  - Email value:", email);
        console.log("  - Password configured:", !!appPassword);
        console.log("  - Password length:", appPassword?.length);

        if (!email || !appPassword) {
            console.error("❌ Missing credentials in environment");
            return Response.json({ 
                success: false,
                error: 'Email credentials not configured',
                details: {
                    email: email ? '✓ Set' : '✗ Not set',
                    password: appPassword ? '✓ Set' : '✗ Not set'
                },
                help: 'Go to Dashboard → Settings → Environment Variables and set GOOGLE_WORKSPACE_EMAIL and GOOGLE_WORKSPACE_APP_PASSWORD'
            }, { status: 500 });
        }

        // Clean password (remove ALL whitespace including newlines)
        const cleanPassword = appPassword.replace(/\s+/g, '');
        console.log("  - Password after cleaning:", cleanPassword.length, "characters");

        if (cleanPassword.length !== 16) {
            console.error("❌ Invalid app password length:", cleanPassword.length);
            return Response.json({
                success: false,
                error: 'Invalid App Password format',
                details: `App password should be 16 characters, but got ${cleanPassword.length}`,
                help: 'Generate a new App Password at: https://myaccount.google.com/apppasswords\nMake sure to copy all 16 characters (ignore spaces)'
            }, { status: 500 });
        }

        // SMTP Configuration - Simple and direct
        const smtpConfig = {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: email,
                pass: cleanPassword
            },
            tls: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 15000
        };

        console.log("🔧 SMTP Config:", {
            host: smtpConfig.host,
            port: smtpConfig.port,
            user: smtpConfig.auth.user,
            passwordLength: smtpConfig.auth.pass.length
        });

        // Create transporter
        const transporter = nodemailer.createTransport(smtpConfig);

        // Step 1: Verify SMTP connection
        console.log("🔍 Step 1: Verifying SMTP connection...");
        try {
            await transporter.verify();
            console.log("✅ SMTP connection verified successfully");
        } catch (verifyError) {
            console.error("❌ SMTP verification failed:", verifyError);
            
            // Check specific error types
            if (verifyError.code === 'EAUTH') {
                return Response.json({
                    success: false,
                    error: 'Authentication Failed',
                    details: verifyError.message,
                    help: '🔐 Your App Password is incorrect or invalid. Please:\n\n1. Go to https://myaccount.google.com/apppasswords\n2. Make sure 2-Step Verification is ENABLED first\n3. Generate a NEW App Password for "Mail"\n4. Copy all 16 characters (ignore spaces)\n5. Update in Dashboard → Settings → Environment Variables\n\nCommon issues:\n- Using regular password instead of App Password ❌\n- 2-Step Verification not enabled ❌\n- Typo in App Password ❌'
                }, { status: 500 });
            } else if (verifyError.code === 'ECONNECTION' || verifyError.code === 'ETIMEDOUT') {
                return Response.json({
                    success: false,
                    error: 'Connection Failed',
                    details: verifyError.message,
                    help: '🌐 Cannot connect to Gmail SMTP server. This might be:\n\n1. Network/firewall issue\n2. Gmail SMTP temporarily blocked\n3. Server connectivity problem\n\nTry:\n- Wait a few minutes and try again\n- Use "Open Gmail" option as backup\n- Contact support if issue persists'
                }, { status: 500 });
            } else {
                return Response.json({
                    success: false,
                    error: 'SMTP Connection Error',
                    details: verifyError.message,
                    code: verifyError.code,
                    help: 'Unknown SMTP error. Please check function logs or use Gmail compose as backup.'
                }, { status: 500 });
            }
        }

        // Step 2: Prepare email
        console.log("📝 Step 2: Preparing email...");
        const mailOptions = {
            from: `Healthyfy <${email}>`,
            to: to,
            subject: subject,
            text: emailBody,
            html: html || emailBody.replace(/\n/g, '<br>')
        };

        console.log("📬 Email prepared:", {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            textLength: mailOptions.text.length
        });

        // Step 3: Send email
        console.log("📤 Step 3: Sending email...");
        const info = await transporter.sendMail(mailOptions);
        
        console.log("✅ Email sent successfully!");
        console.log("  - Message ID:", info.messageId);
        console.log("  - Response:", info.response);

        return Response.json({ 
            success: true,
            messageId: info.messageId,
            message: `Email sent successfully from ${email} to ${to}`,
            from: email,
            to: to,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌❌❌ FATAL ERROR ❌❌❌");
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error stack:", error.stack);
        
        // Return detailed error for debugging
        return Response.json({ 
            success: false,
            error: 'Email sending failed',
            message: error.message,
            code: error.code,
            type: error.constructor.name,
            help: error.code === 'EAUTH' 
                ? '🔐 App Password authentication failed. Generate new App Password at: https://myaccount.google.com/apppasswords'
                : '⚠️ Check the error message above. Common issues:\n1. Invalid App Password\n2. 2-Step Verification not enabled\n3. Network/connectivity issues\n\nUse "Open Gmail" option as backup.'
        }, { status: 500 });
    }
});