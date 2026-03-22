import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all active clients with reminders enabled
    const clients = await base44.asServiceRole.entities.Client.filter({ 
      status: 'active'
    });

    const today = new Date().toISOString().split('T')[0];
    const sent = [];
    const failed = [];

    for (const client of clients) {
      try {
        // Fetch client preferences
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
          created_by: client.email 
        });
        const profile = profiles[0];

        if (!profile?.preferences?.notify_meal_reminders) {
          continue; // Skip if reminders disabled
        }

        // Fetch today's meal logs
        const foodLogs = await base44.asServiceRole.entities.FoodLog.filter({ 
          client_id: client.id,
          date: today
        });

        // Determine which meals are missing
        const loggedMeals = foodLogs.map(log => log.meal_type);
        const allMeals = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'post_dinner'];
        const missingMeals = allMeals.filter(meal => !loggedMeals.includes(meal));

        if (missingMeals.length > 0) {
          const mealNames = {
            breakfast: '🌅 Breakfast',
            mid_morning: '☕ Mid-Morning Snack',
            lunch: '🍽️ Lunch',
            evening_snack: '🍴 Evening Snack',
            dinner: '🌙 Dinner',
            post_dinner: '🌃 Post-Dinner',
          };

          const missing = missingMeals.map(m => mealNames[m]).join(', ');

          // Send notification
          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            userId: client.email,
            title: '📋 Log Your Meals',
            body: `Don't forget to log: ${missing}`,
            data: {
              url: '/foodlog',
              type: 'meal_reminder',
              clientId: client.id,
              date: today,
            },
            tag: 'meal-reminder',
          });

          sent.push(client.email);
        }
      } catch (error) {
        console.error(`Failed to send reminder to ${client.email}:`, error);
        failed.push(client.email);
      }
    }

    return Response.json({ 
      message: 'Meal reminders processed',
      sent: sent.length,
      failed: failed.length,
    });
  } catch (error) {
    console.error('Error sending meal reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});