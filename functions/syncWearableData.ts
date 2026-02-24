import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fitbit API endpoints
async function syncFitbitData(base44, device, clientId) {
  try {
    const headers = {
      'Authorization': `Bearer ${device.access_token}`,
      'Accept': 'application/json'
    };

    const today = new Date().toISOString().split('T')[0];
    
    // Fetch steps
    const stepsResponse = await fetch(
      `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
      { headers }
    );
    const stepsData = await stepsResponse.json();
    
    // Fetch heart rate
    const hrResponse = await fetch(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`,
      { headers }
    );
    const hrData = await hrResponse.json();
    
    // Fetch sleep
    const sleepResponse = await fetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`,
      { headers }
    );
    const sleepData = await sleepResponse.json();

    return {
      steps: stepsData.summary?.steps || 0,
      active_minutes: stepsData.summary?.fairlyActiveMinutes || 0,
      calories: {
        total: stepsData.summary?.caloriesBurned || 0,
        active: stepsData.summary?.activeCalories || 0
      },
      heart_rate: {
        resting: hrData.activities?.[0]?.heartRateZones?.[0]?.min || null,
        average: hrData.activities?.[0]?.value?.heartRateValue || null
      },
      sleep: sleepData.sleep?.[0] ? {
        total_minutes: sleepData.sleep[0].duration / 60000,
        deep_minutes: sleepData.sleep[0].levels?.data?.filter(l => l.level === 'deep').reduce((a,b) => a + (b.seconds/60), 0) || 0,
        light_minutes: sleepData.sleep[0].levels?.data?.filter(l => l.level === 'light').reduce((a,b) => a + (b.seconds/60), 0) || 0,
        rem_minutes: sleepData.sleep[0].levels?.data?.filter(l => l.level === 'rem').reduce((a,b) => a + (b.seconds/60), 0) || 0,
        awake_minutes: sleepData.sleep[0].levels?.data?.filter(l => l.level === 'awake').reduce((a,b) => a + (b.seconds/60), 0) || 0
      } : null
    };
  } catch (error) {
    console.error('Fitbit sync error:', error);
    throw error;
  }
}

// Garmin API endpoints
async function syncGarminData(base44, device, clientId) {
  try {
    const headers = {
      'Authorization': `Bearer ${device.access_token}`,
      'Accept': 'application/json'
    };

    const today = new Date().toISOString().split('T')[0];
    
    // Fetch daily summary
    const summaryResponse = await fetch(
      `https://apis.garmin.com/wellness-api/rest/dailySummaryHeartRate?date=${today}`,
      { headers }
    );
    const summaryData = await summaryResponse.json();

    // Fetch activities
    const activitiesResponse = await fetch(
      `https://apis.garmin.com/wellness-api/rest/dailySummaryActivities?date=${today}`,
      { headers }
    );
    const activitiesData = await activitiesResponse.json();

    return {
      steps: summaryData.stats?.steps || 0,
      active_minutes: activitiesData.stats?.activeMinutes || 0,
      calories: {
        total: activitiesData.stats?.totalCalories || 0,
        active: activitiesData.stats?.activeCalories || 0
      },
      heart_rate: {
        resting: summaryData.stats?.restingHeartRate || null,
        average: summaryData.stats?.avgHeartRate || null,
        max: summaryData.stats?.maxHeartRate || null,
        min: summaryData.stats?.minHeartRate || null
      },
      distance: activitiesData.stats?.totalDistance || 0
    };
  } catch (error) {
    console.error('Garmin sync error:', error);
    throw error;
  }
}

// Apple Health sync (via HealthKit)
async function syncAppleHealthData(base44, device, clientId) {
  try {
    const headers = {
      'Authorization': `Bearer ${device.access_token}`,
      'Accept': 'application/json'
    };

    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(
      `https://health.apple.com/api/v1/user/data?date=${today}`,
      { headers }
    );
    const data = await response.json();

    return {
      steps: data.steps || 0,
      active_minutes: data.exerciseTime || 0,
      calories: {
        active: data.activeEnergy || 0,
        total: data.totalEnergyBurned || 0
      },
      heart_rate: {
        resting: data.restingHeartRate || null,
        average: data.heartRate || null
      },
      distance: data.distanceWalkingRunning || 0,
      blood_oxygen: data.bloodOxygenSaturation || null
    };
  } catch (error) {
    console.error('Apple Health sync error:', error);
    throw error;
  }
}

// Main sync function
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await req.json();

    // Get device
    const devices = await base44.entities.WearableDevice.filter({ id: deviceId });
    if (!devices || devices.length === 0) {
      return Response.json({ error: 'Device not found' }, { status: 404 });
    }

    const device = devices[0];
    
    // Check if token is expired and refresh if needed
    if (device.token_expiry && new Date(device.token_expiry) < new Date()) {
      // Token refresh logic would go here
      return Response.json({ 
        error: 'Token expired. Please reconnect device.',
        status: 'expired'
      }, { status: 401 });
    }

    let wearableData;

    // Route to appropriate sync function
    switch (device.device_type) {
      case 'fitbit':
        wearableData = await syncFitbitData(base44, device, device.client_id);
        break;
      case 'garmin':
        wearableData = await syncGarminData(base44, device, device.client_id);
        break;
      case 'apple_health':
        wearableData = await syncAppleHealthData(base44, device, device.client_id);
        break;
      default:
        return Response.json({ error: 'Unsupported device type' }, { status: 400 });
    }

    // Save synced data
    const today = new Date().toISOString().split('T')[0];
    const existingData = await base44.entities.WearableData.filter({
      device_id: deviceId,
      date: today
    });

    if (existingData && existingData.length > 0) {
      // Update existing
      await base44.entities.WearableData.update(existingData[0].id, {
        ...wearableData,
        synced_at: new Date().toISOString()
      });
    } else {
      // Create new
      await base44.entities.WearableData.create({
        client_id: device.client_id,
        device_id: deviceId,
        device_type: device.device_type,
        date: today,
        ...wearableData,
        synced_at: new Date().toISOString()
      });
    }

    // Update device last sync time
    await base44.entities.WearableDevice.update(deviceId, {
      last_sync_date: new Date().toISOString(),
      is_connected: true,
      connection_status: 'connected',
      error_message: null
    });

    return Response.json({ 
      success: true, 
      message: 'Wearable data synced successfully',
      data: wearableData
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      error: error.message,
      status: 'error'
    }, { status: 500 });
  }
});