import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, clientId } = await req.json();
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
      prompt = `You are an expert clinical dietitian AI. Generate a comprehensive, professional client progress report based on the following data.

${clientContext}

Generate a detailed progress report with:
1. An executive summary (2-3 sentences)
2. Weight & body composition analysis
3. Meal plan adherence analysis
4. Wellness & lifestyle observations
5. Key achievements (list 3-5 specific wins)
6. Areas needing improvement (list 2-4 specific areas)
7. Personalized recommendations for next 30 days (list 4-6 actionable steps)
8. Overall progress rating: excellent/good/fair/needs_attention

Be specific, data-driven, empathetic and professional.`;

      schema = {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          weight_analysis: { type: "string" },
          adherence_analysis: { type: "string" },
          wellness_observations: { type: "string" },
          achievements: { type: "array", items: { type: "string" } },
          areas_for_improvement: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          overall_rating: { type: "string" },
          next_check_in_focus: { type: "string" }
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