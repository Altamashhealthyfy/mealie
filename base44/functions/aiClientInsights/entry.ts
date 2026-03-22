import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, clientId, period: bodyPeriod = 'monthly' } = body;
    if (!clientId || !type) return Response.json({ error: 'Missing params' }, { status: 400 });

    // Fetch all client data
    const [clientArr, progressLogs, foodLogs, mealPlans, mpessLogs, clinicalArr] = await Promise.all([
      base44.entities.Client.filter({ id: clientId }),
      base44.entities.ProgressLog.filter({ client_id: clientId }),
      base44.entities.FoodLog.filter({ client_id: clientId }),
      base44.entities.MealPlan.filter({ client_id: clientId }),
      base44.entities.MPESSTracker.filter({ client_id: clientId }),
      base44.entities.ClinicalIntake.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    // Sort logs by date
    const sortedLogs = [...progressLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentLogs = sortedLogs.slice(0, 30);
    const clinical = clinicalArr[0];
    const activePlan = mealPlans.find(p => p.active) || mealPlans[0];

    // Build shared context
    const clientContext = `
Client: ${client.full_name}, Age: ${client.age || 'N/A'}, Gender: ${client.gender || 'N/A'}
Goal: ${client.goal?.replace(/_/g, ' ') || 'N/A'}
Height: ${client.height || 'N/A'} cm, Current Weight: ${client.weight || 'N/A'} kg, Target: ${client.target_weight || 'N/A'} kg
Food Preference: ${client.food_preference || 'N/A'}, Activity: ${client.activity_level?.replace(/_/g, ' ') || 'N/A'}
Conditions: ${clinical?.medical_conditions?.join(', ') || 'None reported'}
Medications: ${clinical?.current_medications?.join(', ') || 'None reported'}
Allergies: ${client.dietary_restrictions?.join(', ') || 'None'}
Active Meal Plan: ${activePlan?.name || 'None'}
Total Progress Logs: ${progressLogs.length}, Food Logs: ${foodLogs.length}
Recent Weight Logs: ${recentLogs.slice(0,5).map(l => `${l.date}: ${l.weight || 'N/A'}kg, adherence: ${l.meal_adherence || 'N/A'}%`).join(' | ')}
Avg Adherence (last 10): ${recentLogs.slice(0,10).filter(l=>l.meal_adherence!=null).length > 0 ? (recentLogs.slice(0,10).filter(l=>l.meal_adherence!=null).reduce((s,l)=>s+l.meal_adherence,0)/recentLogs.slice(0,10).filter(l=>l.meal_adherence!=null).length).toFixed(1) : 'N/A'}%
    `.trim();

    let prompt = '';
    let schema = {};

    if (type === 'progress_report') {
      const period = bodyPeriod;
      const periodDays = period === 'weekly' ? 7 : 30;
      const periodLabel = period === 'weekly' ? 'last 7 days' : 'last 30 days';
      const nextPeriodLabel = period === 'weekly' ? 'next week' : 'next month';

      // Filter logs to period
      const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
      const periodLogs = sortedLogs.filter(l => new Date(l.date) >= cutoff);
      const prevLogs = sortedLogs.filter(l => new Date(l.date) < cutoff).slice(0, periodDays);

      const periodFoodLogs = foodLogs.filter(l => new Date(l.date) >= cutoff);
      const periodGoals = await base44.asServiceRole.entities.ProgressGoal.filter({ client_id: clientId });

      // Build detailed period stats
      const weightValues = periodLogs.filter(l => l.weight).map(l => ({ date: l.date, w: l.weight }));
      const prevWeightValues = prevLogs.filter(l => l.weight).map(l => ({ date: l.date, w: l.weight }));
      const weightChange = weightValues.length >= 2
        ? (weightValues[0].w - weightValues[weightValues.length - 1].w).toFixed(1)
        : null;
      const prevWeightChange = prevWeightValues.length >= 2
        ? (prevWeightValues[0].w - prevWeightValues[prevWeightValues.length - 1].w).toFixed(1)
        : null;

      const adherenceVals = periodLogs.filter(l => l.meal_adherence != null).map(l => l.meal_adherence);
      const avgAdherence = adherenceVals.length ? (adherenceVals.reduce((s, v) => s + v, 0) / adherenceVals.length).toFixed(1) : null;

      const symptomsRaw = periodLogs.flatMap(l => l.symptoms || []);
      const symptomFreq = symptomsRaw.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
      const topSymptoms = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${s} (${c}x)`);

      const energyVals = periodLogs.filter(l => l.wellness_metrics?.energy_level).map(l => l.wellness_metrics.energy_level);
      const avgEnergy = energyVals.length ? (energyVals.reduce((s, v) => s + v, 0) / energyVals.length).toFixed(1) : null;
      const sleepVals = periodLogs.filter(l => l.wellness_metrics?.sleep_quality).map(l => l.wellness_metrics.sleep_quality);
      const avgSleep = sleepVals.length ? (sleepVals.reduce((s, v) => s + v, 0) / sleepVals.length).toFixed(1) : null;
      const stressVals = periodLogs.filter(l => l.wellness_metrics?.stress_level).map(l => l.wellness_metrics.stress_level);
      const avgStress = stressVals.length ? (stressVals.reduce((s, v) => s + v, 0) / stressVals.length).toFixed(1) : null;
      const exerciseMins = periodLogs.reduce((s, l) => s + (l.wellness_metrics?.exercise_minutes || 0), 0);

      const activeGoals = periodGoals.filter(g => g.status === 'active');
      const completedGoals = periodGoals.filter(g => g.status === 'completed');

      const periodContext = `
REPORT PERIOD: ${periodLabel.toUpperCase()}
Period: ${cutoff.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}
${client.full_name} — ${client.goal?.replace(/_/g, ' ')} | Target Weight: ${client.target_weight || 'N/A'} kg

WEIGHT DATA:
- Logs in period: ${weightValues.length}
- Weight entries: ${weightValues.slice(0, 8).map(v => `${v.date}: ${v.w}kg`).join(' → ')}
- Weight change this period: ${weightChange !== null ? (weightChange > 0 ? '+' : '') + weightChange + ' kg' : 'insufficient data'}
- Previous period change: ${prevWeightChange !== null ? (prevWeightChange > 0 ? '+' : '') + prevWeightChange + ' kg' : 'N/A'}
- Current weight: ${client.weight || 'N/A'} kg | Starting: ${client.initial_weight || 'N/A'} kg | Target: ${client.target_weight || 'N/A'} kg

MEAL ADHERENCE:
- Average adherence: ${avgAdherence !== null ? avgAdherence + '%' : 'N/A'}
- Adherence by day: ${periodLogs.slice(0, 10).map(l => `${l.date}: ${l.meal_adherence ?? 'N/A'}%`).join(', ')}
- Food logs recorded: ${periodFoodLogs.length}

WELLNESS METRICS (period averages):
- Energy level: ${avgEnergy !== null ? avgEnergy + '/10' : 'N/A'}
- Sleep quality: ${avgSleep !== null ? avgSleep + '/10' : 'N/A'}
- Stress level: ${avgStress !== null ? avgStress + '/10' : 'N/A'}
- Total exercise minutes: ${exerciseMins}

SYMPTOMS REPORTED: ${topSymptoms.length ? topSymptoms.join(', ') : 'None'}

GOALS:
- Active goals: ${activeGoals.map(g => `${g.title} (${g.current_value || 0}/${g.target_value} ${g.unit || ''})`).join(', ') || 'None'}
- Completed this period: ${completedGoals.map(g => g.title).join(', ') || 'None'}

MPESS SUBMISSIONS: ${mpessLogs.filter(l => new Date(l.submission_date) >= cutoff).length} in period
`.trim();

      const prompt2 = `You are an expert clinical dietitian AI. Generate a detailed ${period} progress report for a client.

CLIENT PROFILE:
${clientContext}

PERIOD DATA:
${periodContext}

Write a comprehensive, empathetic, data-driven ${period} progress report. Be specific about numbers and trends.
For the coach version: be clinical and actionable.
For the client message: be warm, encouraging, motivating, and easy to understand.`;

      prompt = prompt2;
      schema = {
        type: "object",
        properties: {
          report_period: { type: "string" },
          executive_summary: { type: "string" },
          weight_analysis: {
            type: "object",
            properties: {
              summary: { type: "string" },
              trend: { type: "string", description: "improving/stable/declining/insufficient_data" },
              key_insight: { type: "string" }
            }
          },
          adherence_analysis: {
            type: "object",
            properties: {
              summary: { type: "string" },
              trend: { type: "string", description: "improving/stable/declining/insufficient_data" },
              key_insight: { type: "string" }
            }
          },
          activity_analysis: { type: "string" },
          wellness_observations: {
            type: "object",
            properties: {
              energy: { type: "string" },
              sleep: { type: "string" },
              stress: { type: "string" },
              symptoms_noted: { type: "string" }
            }
          },
          goal_progress: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                status: { type: "string" },
                comment: { type: "string" }
              }
            }
          },
          achievements: { type: "array", items: { type: "string" } },
          areas_for_improvement: { type: "array", items: { type: "string" } },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                reason: { type: "string" },
                priority: { type: "string", description: "high/medium/low" }
              }
            }
          },
          focus_for_next_period: { type: "string" },
          client_message: { type: "string", description: "A warm, encouraging message to share directly with the client (2-4 sentences)" },
          overall_rating: { type: "string", description: "excellent/good/fair/needs_attention" }
        }
      };

    } else if (type === 'risk_assessment') {
      prompt = `You are an expert clinical dietitian AI. Perform a comprehensive health risk assessment for this client.

${clientContext}

Identify and analyze potential health risks across these categories:
1. Micronutrient deficiency risks (based on diet preference, medical conditions, food logs)
2. Adherence & compliance risks
3. Medical/clinical risks (interactions, contraindications)
4. Metabolic risks
5. Lifestyle risks (sleep, stress, activity)

For each identified risk, provide:
- Risk level: high/medium/low
- Description of the risk
- Specific warning signs to watch
- Recommended interventions

Also provide an overall risk score (1-10) and a priority action list.`;

      schema = {
        type: "object",
        properties: {
          overall_risk_score: { type: "number" },
          overall_risk_level: { type: "string" },
          summary: { type: "string" },
          risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                risk_level: { type: "string" },
                description: { type: "string" },
                warning_signs: { type: "array", items: { type: "string" } },
                interventions: { type: "array", items: { type: "string" } }
              }
            }
          },
          priority_actions: { type: "array", items: { type: "string" } },
          follow_up_timeline: { type: "string" }
        }
      };

    } else if (type === 'education_material') {
      const conditions = clinical?.medical_conditions?.join(', ') || client.goal?.replace(/_/g, ' ') || 'general health';
      prompt = `You are an expert clinical dietitian creating personalized patient education materials.

Client context:
${clientContext}

Create comprehensive, easy-to-understand educational content tailored to this client covering:
1. Their primary health conditions/goals: ${conditions}
2. Key nutrients they need to focus on based on their diet (${client.food_preference}) and conditions
3. Foods to include and why
4. Foods to avoid and why
5. Practical meal timing tips
6. Lifestyle factors that affect their condition
7. Common myths vs facts about their condition/goal
8. Motivational message personalized to their journey

Write in a warm, encouraging tone that a patient can easily understand (avoid heavy jargon). Use bullet points where helpful.`;

      schema = {
        type: "object",
        properties: {
          title: { type: "string" },
          introduction: { type: "string" },
          key_nutrients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nutrient: { type: "string" },
                why_important: { type: "string" },
                food_sources: { type: "array", items: { type: "string" } },
                daily_target: { type: "string" }
              }
            }
          },
          foods_to_include: { type: "array", items: { type: "string" } },
          foods_to_avoid: { type: "array", items: { type: "string" } },
          meal_timing_tips: { type: "array", items: { type: "string" } },
          lifestyle_factors: { type: "array", items: { type: "string" } },
          myths_vs_facts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                myth: { type: "string" },
                fact: { type: "string" }
              }
            }
          },
          motivational_message: { type: "string" }
        }
      };
    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return Response.json({ success: true, data: result, type });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});