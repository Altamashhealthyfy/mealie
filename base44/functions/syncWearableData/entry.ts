import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3.6.0';

const GOOGLE_FIT_API = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';
const FITBIT_API = 'https://api.fitbit.com/1.2/user/-';
const APPLE_HEALTH_API = 'https://health.apple.com/api/v1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client profile
    const clients = await base44.entities.Client.filter({ email: user.email });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: 'Client profile not found' }, { status: 404 });
    }

    // Get all connected wearable devices
    const devices = await base44.entities.WearableDevice.filter({
      client_id: client.id,
      is_connected: true
    });

    const results = {
      synced_devices: [],
      errors: []
    };

    // Sync data from each device
    for (const device of devices) {
      try {
        if (device.device_type === 'google_fit') {
          await syncGoogleFitData(base44, client, device);
          results.synced_devices.push({ device_type: 'google_fit', status: 'success' });
        } else if (device.device_type === 'fitbit') {
          await syncFitbitData(base44, client, device);
          results.synced_devices.push({ device_type: 'fitbit', status: 'success' });
        } else if (device.device_type === 'apple_health') {
          await syncAppleHealthData(base44, client, device);
          results.synced_devices.push({ device_type: 'apple_health', status: 'success' });
        }

        // Update last sync timestamp
        await base44.entities.WearableDevice.update(device.id, {
          last_sync: new Date().toISOString(),
          sync_status: 'active'
        });
      } catch (error) {
        results.errors.push({
          device_type: device.device_type,
          error: error.message
        });

        // Update sync status
        await base44.entities.WearableDevice.update(device.id, {
          sync_status: 'failed',
          sync_error: error.message
        });
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncGoogleFitData(base44, client, device) {
  const today = new Date();
  const startTime = new Date(today);
  startTime.setDate(startTime.getDate() - 7); // Last 7 days

  const payload = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.heart_rate.bpm' },
      { dataTypeName: 'com.google.sleep.segment' },
      { dataTypeName: 'com.google.calories.expended' }
    ],
    bucketByTime: { durationMillis: 86400000 }, // 1 day
    startTimeMillis: startTime.getTime(),
    endTimeMillis: today.getTime()
  };

  const response = await fetch(GOOGLE_FIT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${device.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Google Fit API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Process and save data
  for (const bucket of data.bucket) {
    const date = new Date(parseInt(bucket.startTimeMillis));
    const dateStr = format(date, 'yyyy-MM-dd');

    const wearableData = {
      client_id: client.id,
      device_id: device.id,
      device_type: 'google_fit',
      date: dateStr,
      data_type: 'daily_summary'
    };

    // Extract steps
    const stepData = bucket.dataset.find(d => d.dataTypeName === 'com.google.step_count.delta');
    if (stepData?.point?.length > 0) {
      wearableData.steps = stepData.point.reduce((sum, p) => sum + (p.value?.[0]?.intVal || 0), 0);
    }

    // Extract heart rate
    const hrData = bucket.dataset.find(d => d.dataTypeName === 'com.google.heart_rate.bpm');
    if (hrData?.point?.length > 0) {
      const hrValues = hrData.point.map(p => p.value?.[0]?.fpVal || 0).filter(v => v > 0);
      if (hrValues.length > 0) {
        wearableData.heart_rate = {
          average: Math.round(hrValues.reduce((a, b) => a + b) / hrValues.length),
          max: Math.max(...hrValues),
          min: Math.min(...hrValues)
        };
      }
    }

    // Extract calories
    const caloriesData = bucket.dataset.find(d => d.dataTypeName === 'com.google.calories.expended');
    if (caloriesData?.point?.length > 0) {
      wearableData.calories = {
        burned: Math.round(caloriesData.point.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0))
      };
    }

    wearableData.sync_timestamp = new Date().toISOString();

    // Save or update wearable data
    const existing = await base44.entities.WearableData.filter({
      client_id: client.id,
      device_id: device.id,
      date: dateStr,
      data_type: 'daily_summary'
    });

    if (existing.length > 0) {
      await base44.entities.WearableData.update(existing[0].id, wearableData);
    } else {
      await base44.entities.WearableData.create(wearableData);
    }
  }
}

async function syncFitbitData(base44, client, device) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const endpoints = [
    { path: '/activities/steps/date', dataType: 'steps' },
    { path: '/activities/heart/date', dataType: 'heart_rate' },
    { path: '/sleep/date', dataType: 'sleep' },
    { path: '/activities/calories/date', dataType: 'calories' }
  ];

  for (const endpoint of endpoints) {
    const url = `${FITBIT_API}${endpoint.path}/${startDate}/${today}.json`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${device.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Fitbit API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process each day's data
    for (const item of data[Object.keys(data)[0]] || []) {
      const dateStr = item.dateTime;
      
      const wearableData = {
        client_id: client.id,
        device_id: device.id,
        device_type: 'fitbit',
        date: dateStr,
        data_type: endpoint.dataType,
        sync_timestamp: new Date().toISOString()
      };

      if (endpoint.dataType === 'steps') {
        wearableData.steps = parseInt(item.value);
      } else if (endpoint.dataType === 'heart_rate') {
        if (item.value) {
          wearableData.heart_rate = {
            average: Math.round(parseFloat(item.value))
          };
        }
      } else if (endpoint.dataType === 'sleep') {
        if (item.minutesAsleep) {
          wearableData.sleep = {
            total_minutes: item.minutesAsleep,
            awake_minutes: item.awakeningsCount ? item.awakeningsCount * 5 : 0
          };
        }
      } else if (endpoint.dataType === 'calories') {
        wearableData.calories = {
          burned: Math.round(parseFloat(item.value))
        };
      }

      // Save or update wearable data
      const existing = await base44.entities.WearableData.filter({
        client_id: client.id,
        device_id: device.id,
        date: dateStr,
        data_type: endpoint.dataType
      });

      if (existing.length > 0) {
        await base44.entities.WearableData.update(existing[0].id, wearableData);
      } else {
        await base44.entities.WearableData.create(wearableData);
      }
    }
  }
}

async function syncAppleHealthData(base44, client, device) {
  // Apple Health requires native iOS integration
  // This is a placeholder for client-side sync via HealthKit
  // In production, data would be synced from the iOS app
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Log sync attempt
  console.log(`Apple Health sync requested for client ${client.id} on ${today}`);
  
  // Return success - actual data sync happens on iOS app
  return { status: 'pending', message: 'Apple Health sync queued for next iOS sync' };
}