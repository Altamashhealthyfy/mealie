import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      user_email, 
      type, 
      title, 
      message, 
      link, 
      priority = 'normal',
      send_email = false,
      metadata = {}
    } = await req.json();

    if (!user_email || !type || !title || !message) {
      return Response.json(
        { error: 'Missing required fields: user_email, type, title, message' },
        { status: 400 }
      );
    }

    // Create in-app notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      type,
      title,
      message,
      link,
      priority,
      read: false,
      email_sent: false,
      metadata
    });

    // Send email notification if requested
    if (send_email) {
      try {
        const emailSubject = `🔔 ${title}`;
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(to right, #f97316, #dc2626); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Mealie Notification</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #111827; margin-bottom: 15px;">${title}</h2>
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">${message}</p>
              ${link ? `
                <a href="${link}" style="display: inline-block; background: linear-gradient(to right, #f97316, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Details
                </a>
              ` : ''}
            </div>
            <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p>You received this notification from Mealie Health Platform</p>
            </div>
          </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user_email,
          subject: emailSubject,
          body: emailBody
        });

        // Update notification to mark email as sent
        await base44.asServiceRole.entities.Notification.update(notification.id, {
          email_sent: true
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    return Response.json({
      success: true,
      notification,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});