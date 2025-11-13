import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log("🚀 Function called at:", new Date().toISOString());
    
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        console.log("🔐 Checking user authentication...");
        const user = await base44.auth.me();
        if (!user) {
            console.error("❌ No user authenticated");
            return Response.json({ 
                success: false,
                error: 'Unauthorized - No user logged in' 
            }, { status: 401 });
        }
        console.log("✅ User authenticated:", user.email);

        // Get request body
        const body = await req.json();
        const { to, subject, body: emailBody } = body;

        console.log("📧 Email Request:", { 
            to: to, 
            subject: subject,
            bodyLength: emailBody?.length 
        });

        if (!to || !subject || !emailBody) {
            console.error("❌ Missing required fields");
            return Response.json({ 
                success: false,
                error: 'Missing required fields: to, subject, body'
            }, { status: 400 });
        }

        // Get credentials from environment
        console.log("🔑 Reading credentials from environment...");
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        console.log("📝 Email:", email || "❌ NOT SET");
        console.log("📝 App Password:", appPassword ? `✅ SET (${appPassword.length} chars)` : "❌ NOT SET");

        if (!email || !appPassword) {
            console.error("❌ Credentials missing!");
            return Response.json({ 
                success: false,
                error: 'Gmail credentials not configured in environment variables',
                details: {
                    email: email ? 'SET' : 'MISSING',
                    password: appPassword ? 'SET' : 'MISSING'
                }
            }, { status: 500 });
        }

        // Clean password (remove spaces)
        const cleanPassword = appPassword.replace(/\s+/g, '');
        console.log("🧹 Password cleaned. Length:", cleanPassword.length, "(should be 16)");

        if (cleanPassword.length !== 16) {
            console.error("❌ Invalid password length! Expected 16, got:", cleanPassword.length);
            return Response.json({
                success: false,
                error: 'App Password must be exactly 16 characters',
                details: {
                    currentLength: cleanPassword.length,
                    expectedLength: 16
                }
            }, { status: 500 });
        }

        console.log("📊 Final Config:", {
            from: email,
            to: to,
            passwordLength: cleanPassword.length,
            smtpHost: 'smtp.gmail.com',
            smtpPort: 587
        });

        // Import nodemailer
        console.log("📦 Importing nodemailer...");
        const nodemailer = await import('npm:nodemailer@6.9.7');
        console.log("✅ Nodemailer imported");
        
        // Create transporter
        console.log("🔧 Creating SMTP transporter...");
        const transporter = nodemailer.default.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: email,
                pass: cleanPassword
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true, // Enable debug output
            logger: true // Enable logger
        });
        console.log("✅ Transporter created");

        // Verify SMTP connection
        console.log("🔍 Verifying SMTP connection to Gmail...");
        try {
            await transporter.verify();
            console.log("✅ SMTP connection verified successfully!");
        } catch (verifyError) {
            console.error("❌ SMTP verification failed!");
            console.error("Error details:", {
                message: verifyError.message,
                code: verifyError.code,
                command: verifyError.command,
                response: verifyError.response,
                responseCode: verifyError.responseCode
            });
            throw verifyError;
        }

        // Send email
        console.log("📤 Sending email...");
        const info = await transporter.sendMail({
            from: `Healthyfy <${email}>`,
            to: to,
            subject: subject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br>')
        });

        console.log("✅ Email sent successfully!");
        console.log("📬 Message ID:", info.messageId);
        console.log("📊 Response:", info.response);

        return Response.json({ 
            success: true,
            messageId: info.messageId,
            from: email,
            to: to,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("=" .repeat(60));
        console.error("❌ FATAL ERROR");
        console.error("=" .repeat(60));
        console.error("Error type:", error.constructor.name);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error command:", error.command);
        console.error("Error response:", error.response);
        console.error("Error responseCode:", error.responseCode);
        console.error("Full error:", error);
        console.error("=" .repeat(60));
        
        // Determine specific error message
        let userFriendlyError = 'Unknown error occurred';
        let helpMessage = 'Please contact support';
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            userFriendlyError = 'Gmail authentication failed';
            helpMessage = 'Your App Password is incorrect or expired. Please:\n1. Go to https://myaccount.google.com/apppasswords\n2. Delete the old app password\n3. Generate a NEW 16-character app password\n4. Update GOOGLE_WORKSPACE_APP_PASSWORD in Dashboard → Settings → Environment Variables';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            userFriendlyError = 'Cannot connect to Gmail SMTP server';
            helpMessage = 'Network or firewall issue. Check your internet connection.';
        } else if (error.code === 'ESOCKET') {
            userFriendlyError = 'Socket connection failed';
            helpMessage = 'Network issue connecting to Gmail. Try again in a few minutes.';
        } else if (error.message?.includes('Greeting never received')) {
            userFriendlyError = 'Gmail did not respond';
            helpMessage = 'Gmail server timeout. Try again.';
        }
        
        return Response.json({ 
            success: false,
            error: userFriendlyError,
            details: error.message,
            code: error.code,
            responseCode: error.responseCode,
            help: helpMessage,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});