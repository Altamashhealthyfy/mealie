import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OAUTH_CONFIGS = {
  fitbit: {
    clientId: Deno.env.get('FITBIT_CLIENT_ID'),
    clientSecret: Deno.env.get('FITBIT_CLIENT_SECRET'),
    authUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    redirectUri: `${Deno.env.get('APP_URL')}/api/wearable/callback`
  },
  garmin: {
    clientId: Deno.env.get('GARMIN_CLIENT_ID'),
    clientSecret: Deno.env.get('GARMIN_CLIENT_SECRET'),
    authUrl: 'https://connect.garmin.com/oauthserver/oauth/authorize',
    tokenUrl: 'https://connect.garmin.com/oauthserver/oauth/token',
    redirectUri: `${Deno.env.get('APP_URL')}/api/wearable/callback`
  },
  apple_health: {
    clientId: Deno.env.get('APPLE_HEALTH_CLIENT_ID'),
    clientSecret: Deno.env.get('APPLE_HEALTH_CLIENT_SECRET'),
    authUrl: 'https://appleid.apple.com/auth/oauth2/v2/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/oauth2/v2/token',
    redirectUri: `${Deno.env.get('APP_URL')}/api/wearable/callback`
  }
};

// Generate authorization URL
function generateAuthUrl(deviceType, clientId, state) {
  const config = OAUTH_CONFIGS[deviceType];
  if (!config) {
    throw new Error(`Unsupported device type: ${deviceType}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: getScopes(deviceType),
    redirect_uri: config.redirectUri,
    state: state
  });

  return `${config.authUrl}?${params.toString()}`;
}

// Get OAuth scopes per device
function getScopes(deviceType) {
  const scopes = {
    fitbit: 'activity heartrate profile settings sleep',
    garmin: 'ACTIVITIES DAILIES HEARTRATE SLEEP',
    apple_health: 'health'
  };
  return scopes[deviceType] || '';
}

// Exchange auth code for tokens
async function getAccessToken(deviceType, authCode) {
  const config = OAUTH_CONFIGS[deviceType];
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: authCode,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

// Generate authorization URL endpoint
Deno.serve(async (req) => {
  if (req.method === 'POST') {
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();

      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { deviceType, clientId } = await req.json();

      // Validate device type
      if (!OAUTH_CONFIGS[deviceType]) {
        return Response.json({ 
          error: 'Unsupported device type' 
        }, { status: 400 });
      }

      // Generate state token for CSRF protection
      const state = crypto.getRandomValues(new Uint8Array(16))
        .reduce((a, b) => a + b.toString(16), '');

      // Store state in database or cache
      await base44.entities.WearableDevice.create({
        client_id: clientId,
        client_email: user.email,
        device_type: deviceType,
        device_name: `${deviceType} (pending connection)`,
        is_connected: false,
        connection_status: 'disconnected',
        data_types: getDefaultDataTypes(deviceType)
      });

      const authUrl = generateAuthUrl(deviceType, clientId, state);

      return Response.json({ 
        authUrl,
        state
      });

    } catch (error) {
      console.error('Authorization error:', error);
      return Response.json({ 
        error: error.message 
      }, { status: 500 });
    }
  }

  // Handle callback
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const deviceType = url.searchParams.get('device_type');
      const clientId = url.searchParams.get('client_id');

      if (!code || !deviceType) {
        return Response.json({ 
          error: 'Missing parameters' 
        }, { status: 400 });
      }

      const base44 = createClientFromRequest(req);

      // Exchange code for tokens
      const tokens = await getAccessToken(deviceType, code);

      // Calculate expiry
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      // Find and update the device
      const devices = await base44.entities.WearableDevice.filter({
        client_id: clientId,
        device_type: deviceType,
        is_connected: false
      });

      if (devices && devices.length > 0) {
        await base44.entities.WearableDevice.update(devices[0].id, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiryDate.toISOString(),
          is_connected: true,
          connection_status: 'connected',
          device_id: tokens.user_id || `${deviceType}_${Date.now()}`
        });

        // Redirect to success page
        return Response.redirect(
          `${Deno.env.get('APP_URL')}/wearable-connected?device=${deviceType}&success=true`,
          302
        );
      } else {
        throw new Error('Device not found');
      }

    } catch (error) {
      console.error('Callback error:', error);
      return Response.redirect(
        `${Deno.env.get('APP_URL')}/wearable-connected?success=false&error=${encodeURIComponent(error.message)}`,
        302
      );
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

function getDefaultDataTypes(deviceType) {
  const dataTypes = {
    fitbit: ['steps', 'heart_rate', 'sleep', 'calories', 'active_minutes'],
    garmin: ['steps', 'heart_rate', 'sleep', 'calories', 'active_minutes', 'distance'],
    apple_health: ['steps', 'heart_rate', 'sleep', 'calories', 'active_minutes', 'blood_oxygen']
  };
  return dataTypes[deviceType] || [];
}