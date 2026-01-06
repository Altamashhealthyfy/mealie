import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, sendEmail = true } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Fetch client details
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const results = {
      clientId: client.id,
      clientName: client.full_name,
      steps: []
    };

    // Step 1: Send welcome email
    if (sendEmail && client.email) {
      try {
        const coachName = user.full_name || 'Your Health Coach';
        const emailBody = `
Dear ${client.full_name},

Welcome to your personalized health and wellness journey! 🎉

I'm ${coachName}, and I'm thrilled to be your health coach. Together, we'll work towards achieving your health goals and creating sustainable, positive changes in your lifestyle.

Here's what you can expect:

✅ Personalized Meal Plans tailored to your preferences and goals
✅ Progress Tracking to monitor your transformation
✅ Regular Communication and support throughout your journey
✅ Assessment and Goal Setting to track your success

Your Next Steps:
1. Complete your initial health assessment (we've set this up for you)
2. Log your first progress entry with your current weight and measurements
3. Review your personalized meal plan
4. Feel free to message me anytime with questions or concerns

I'm here to support you every step of the way. Let's make this journey amazing!

To your health and success,
${coachName}

---
This is an automated welcome message. Please reply if you have any questions!
        `;

        await base44.asServiceRole.functions.invoke('sendGoogleWorkspaceEmail', {
          to: client.email,
          subject: `Welcome to Your Health Journey! 🌟`,
          body: emailBody
        });

        results.steps.push({ step: 'welcome_email', status: 'success', message: 'Welcome email sent' });
      } catch (error) {
        results.steps.push({ step: 'welcome_email', status: 'failed', error: error.message });
      }
    }

    // Step 2: Create initial assessment based on client type
    try {
      // Get default assessment template or create standard one
      const templates = await base44.asServiceRole.entities.AssessmentTemplate.filter({ is_default: true });
      const defaultTemplate = templates[0];

      const assessmentData = {
        client_id: client.id,
        client_name: client.full_name,
        assigned_by: user.email,
        status: 'pending',
        template_id: defaultTemplate?.id || null,
        medical_history: {},
        lifestyle_habits: {},
        dietary_preferences: {},
        fitness_level: {},
        health_goals: {
          primary_goal: client.goal || 'health_improvement',
          target_weight: client.target_weight || null,
          timeline: '3_months',
          motivation_level: 'high'
        }
      };

      const assessment = await base44.asServiceRole.entities.ClientAssessment.create(assessmentData);
      results.steps.push({ 
        step: 'create_assessment', 
        status: 'success', 
        message: 'Initial assessment created',
        assessmentId: assessment.id 
      });
    } catch (error) {
      results.steps.push({ step: 'create_assessment', status: 'failed', error: error.message });
    }

    // Step 3: Create initial progress log entry (if weight is available)
    if (client.weight) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const progressData = {
          client_id: client.id,
          date: today,
          weight: client.weight,
          measurements: {},
          wellness_metrics: {},
          notes: 'Initial baseline measurement',
          meal_adherence: 100
        };

        const progressLog = await base44.asServiceRole.entities.ProgressLog.create(progressData);
        results.steps.push({ 
          step: 'create_progress_log', 
          status: 'success', 
          message: 'Initial progress log created',
          progressLogId: progressLog.id 
        });
      } catch (error) {
        results.steps.push({ step: 'create_progress_log', status: 'failed', error: error.message });
      }
    }

    // Step 4: Set default goals based on client profile
    try {
      const goals = [];

      // Weight goal (if applicable)
      if (client.target_weight && client.weight) {
        goals.push({
          client_id: client.id,
          goal_type: 'weight',
          title: client.goal === 'weight_loss' ? 'Reach Target Weight' : 'Achieve Desired Weight',
          description: `${client.goal === 'weight_loss' ? 'Lose' : 'Gain'} weight to reach target`,
          target_value: client.target_weight,
          current_value: client.weight,
          start_value: client.weight,
          unit: 'kg',
          target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
          status: 'active',
          priority: 'high'
        });
      }

      // Wellness goal
      goals.push({
        client_id: client.id,
        goal_type: 'wellness',
        title: 'Improve Overall Wellness',
        description: 'Maintain consistent energy, sleep, and stress management',
        target_value: 8,
        current_value: 5,
        start_value: 5,
        unit: 'rating',
        target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days
        status: 'active',
        priority: 'medium'
      });

      // Create all goals
      for (const goalData of goals) {
        await base44.asServiceRole.entities.ProgressGoal.create(goalData);
      }

      results.steps.push({ 
        step: 'create_goals', 
        status: 'success', 
        message: `${goals.length} initial goals created` 
      });
    } catch (error) {
      results.steps.push({ step: 'create_goals', status: 'failed', error: error.message });
    }

    // Step 5: Send assessment reminder email
    if (sendEmail && client.email) {
      try {
        const coachName = user.full_name || 'Your Health Coach';
        const reminderBody = `
Hi ${client.full_name},

Quick reminder to complete your initial health assessment! 📋

This assessment helps me understand your current health status, lifestyle, and goals so I can create the most effective personalized plan for you.

It only takes 10-15 minutes and covers:
- Medical history and current health conditions
- Lifestyle habits and daily routine
- Dietary preferences and restrictions
- Fitness level and activity
- Your health goals and motivations

Please log in to your portal to complete the assessment at your earliest convenience.

Looking forward to working with you!

Best regards,
${coachName}
        `;

        await base44.asServiceRole.functions.invoke('sendGoogleWorkspaceEmail', {
          to: client.email,
          subject: `Action Required: Complete Your Health Assessment`,
          body: reminderBody
        });

        results.steps.push({ step: 'assessment_reminder_email', status: 'success', message: 'Assessment reminder sent' });
      } catch (error) {
        results.steps.push({ step: 'assessment_reminder_email', status: 'failed', error: error.message });
      }
    }

    // Calculate success rate
    const successCount = results.steps.filter(s => s.status === 'success').length;
    const totalSteps = results.steps.length;

    return Response.json({
      success: true,
      message: `Client onboarding completed: ${successCount}/${totalSteps} steps successful`,
      results
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});