import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        // Get credentials from environment
        const email = Deno.env.get("GOOGLE_WORKSPACE_EMAIL");
        const appPassword = Deno.env.get("GOOGLE_WORKSPACE_APP_PASSWORD");

        if (!email || !appPassword) {
            return Response.json({ 
                success: false,
                error: 'Gmail credentials not configured in environment variables',
            }, { status: 500 });
        }

        const cleanPassword = appPassword.replace(/\s+/g, '');

        const nodemailer = await import('npm:nodemailer@6.9.7');
        
        const transporter = nodemailer.default.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: email,
                pass: cleanPassword
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        await transporter.verify();

        const info = await transporter.sendMail({
            from: `${user.full_name || 'Mealie Pro'} <${email}>`,
            to: to,
            subject: subject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br>')
        });

        return Response.json({ 
            success: true,
            messageId: info.messageId,
            from: email,
            to: to,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        let userFriendlyError = 'Email sending failed';
        let helpMessage = 'Please try again';
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            userFriendlyError = 'Gmail authentication failed';
            helpMessage = 'Invalid App Password. Generate a new one from Google Account settings.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            userFriendlyError = 'Cannot connect to Gmail';
            helpMessage = 'Check internet connection.';
        }
        
        return Response.json({ 
            success: false,
            error: userFriendlyError,
            details: error.message,
            help: helpMessage,
        }, { status: 500 });
    }
});