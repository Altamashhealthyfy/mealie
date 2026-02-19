import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { device_type, access_token, refresh_token, external_user_id, device_name, data_permissions } = await req.json();

    if (!device_type || !access_token || !external_user_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get client profile
    const clients = await base44.entities.Client.filter({ email: user.email });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: 'Client profile not found' }, { status: 404 });
    }

    // Check if device already connected
    const existing = await base44.entities.WearableDevice.filter({
      client_id: client.id,
      device_type: device_type,
      external_user_id: external_user_id
    });

    if (existing.length > 0) {
      // Update existing device
      await base44.entities.WearableDevice.update(existing[0].id, {
        access_token,
        refresh_token,
        is_connected: true,
        sync_status: 'pending',
        token_expiry: refresh_token ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        data_permissions: data_permissions || ['steps', 'heart_rate', 'sleep', 'calories']
      });

      return Response.json({
        success: true,
        message: 'Device reconnected',
        device_id: existing[0].id
      });
    }

    // Create new device connection
    const device = await base44.entities.WearableDevice.create({
      client_id: client.id,
      client_email: user.email,
      device_type,
      device_name: device_name || `${device_type.replace('_', ' ').toUpperCase()} Device`,
      access_token,
      refresh_token,
      external_user_id,
      is_connected: true,
      sync_status: 'pending',
      token_expiry: refresh_token ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      data_permissions: data_permissions || ['steps', 'heart_rate', 'sleep', 'calories']
    });

    // Trigger initial sync
    await base44.functions.invoke('syncWearableData', {});

    return Response.json({
      success: true,
      message: 'Device connected successfully',
      device_id: device.id
    });
  } catch (error) {
    console.error('Connection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});