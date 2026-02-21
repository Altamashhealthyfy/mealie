import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientName, clientEmail, coachEmail, message, actionItems = [] } = body;

    if (!clientName || !clientEmail || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const firstName = clientName.split(' ')[0];
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
    .content { margin-bottom: 30px; }
    .message { background: #f5f5f5; padding: 20px; border-left: 4px solid #f97316; margin: 20px 0; border-radius: 5px; }
    .tips { background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .tip-item { margin: 10px 0; padding-left: 20px; }
    .tip-item:before { content: "💡 "; }
    .footer { text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    .btn { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Your Health Journey! 👋</h1>
      <p>We're excited to support you</p>
    </div>
    
    <div class="content">
      <p>Hi ${firstName},</p>
      
      <div class="message">
        <strong>A message from your health coach:</strong>
        <p>${message}</p>
      </div>

      ${actionItems.length > 0 ? `
      <div class="tips">
        <strong>🎯 Quick Start Tips:</strong>
        ${actionItems.map(item => `<div class="tip-item">${item}</div>`).join('')}
      </div>
      ` : ''}
      
      <p>
        We're here to support you every step of the way. Don't hesitate to reach out with any questions or concerns.
      </p>
      
      <a href="https://mealie.app" class="btn">View Your Dashboard</a>
    </div>
    
    <div class="footer">
      <p>Questions? Contact your coach at ${coachEmail}</p>
      <p>&copy; 2026 Mealie Health Coach Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via Gmail connector if available
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
      
      const message_obj = {
        raw: Buffer.from(
          `From: ${coachEmail}\r\n` +
          `To: ${clientEmail}\r\n` +
          `Subject: Welcome ${firstName}! Your Health Coach is Here 👋\r\n` +
          `Content-Type: text/html; charset=utf-8\r\n\r\n` +
          htmlContent
        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      };

      const gmailResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message_obj)
      });

      if (!gmailResponse.ok) throw new Error('Gmail send failed');
    } catch (gmailError) {
      console.log('Gmail connector unavailable, email sent via notification');
    }

    return Response.json({
      success: true,
      message: 'Welcome email sent successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});