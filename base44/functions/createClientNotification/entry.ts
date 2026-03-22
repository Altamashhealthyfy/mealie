import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { client_id, type, title, message, priority = 'normal', link } = await req.json();

    if (!client_id || !type || !title || !message) {
      return Response.json({ 
        error: 'Missing required fields: client_id, type, title, message' 
      }, { status: 400 });
    }

    // Get client to find their assigned dietitian
    const clients = await base44.entities.Client.filter({ id: client_id });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Determine who to notify (assigned coach or creator)
    const notifyEmail = client.assigned_coach || client.created_by;

    if (!notifyEmail) {
      return Response.json({ 
        error: 'No dietitian assigned to this client' 
      }, { status: 400 });
    }

    // Create notification
    const notification = await base44.entities.Notification.create({
      user_email: notifyEmail,
      type,
      title,
      message,
      priority,
      link,
      read: false,
      metadata: {
        client_id,
        client_name: client.full_name
      }
    });

    return Response.json({ 
      success: true, 
      notification 
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});