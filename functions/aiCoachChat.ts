import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, message, history = [] } = await req.json();
    if (!message) return Response.json({ error: 'Message required' }, { status: 400 });

    let clientContext = "No specific client selected. Answer general coaching/nutrition questions.";

    if (clientId) {
      const [clientArr, progressArr, mealPlansArr, foodLogsArr, goalsArr, clinicalArr] = await Promise.all([
        base44.asServiceRole.entities.Client.filter({ id: clientId }),
        base44.asServiceRole.entities.ProgressLog.filter({ client_id: clientId }),
        base44.asServiceRole.entities.MealPlan.filter({ client_id: clientId }),
        base44.asServiceRole.entities.FoodLog.filter({ client_id: clientId }),
        base44.asServiceRole.entities.ProgressGoal.filter({ client_id: clientId }),
        base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
      ]);

      const client = clientArr[0];
      if (client) {
        const clinical = clinicalArr[0];
        const recentLogs = [...progressArr].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        const activePlan = mealPlansArr.find(p => p.active) || mealPlansArr[0];
        const activeGoals = goalsArr.filter(g => g.status === 'active');
        const recentFood = [...foodLogsArr].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

        const avgAdherence = recentLogs.filter(l => l.meal_adherence != null).length > 0
          ? (recentLogs.filter(l => l.meal_adherence != null).reduce((s, l) => s + l.meal_adherence, 0) / recentLogs.filter(l => l.meal_adherence != null).length).toFixed(1)
          : 'N/A';

        const weightTrend = recentLogs.length >= 2
          ? (recentLogs[0].weight - recentLogs[recentLogs.length - 1].weight).toFixed(1)
          : null;

        clientContext = `
CLIENT: ${client.full_name} | Age: ${client.age || 'N/A'} | ${client.gender || ''}
Weight: ${client.weight || 'N/A'} kg → Target: ${client.target_weight || 'N/A'} kg${weightTrend ? ` | Trend: ${weightTrend > 0 ? '+' : ''}${weightTrend} kg` : ''}
Goal: ${client.goal?.replace(/_/g, ' ') || 'N/A'} | Activity: ${client.activity_level?.replace(/_/g, ' ') || 'N/A'}
Diet: ${client.food_preference || 'mixed'} | Region: ${client.regional_preference || 'all'}
Targets: ${client.target_calories || 'N/A'} kcal | P:${client.target_protein || 'N/A'}g | C:${client.target_carbs || 'N/A'}g | F:${client.target_fats || 'N/A'}g

MEDICAL: ${clinical?.medical_conditions?.join(', ') || 'None'} | Meds: ${clinical?.current_medications?.join(', ') || 'None'} | Allergies: ${clinical?.allergies?.join(', ') || 'None'}

PROGRESS (last ${recentLogs.length} logs):
${recentLogs.slice(0, 5).map(l => `  ${l.date}: ${l.weight || '?'}kg | adherence:${l.meal_adherence || '?'}% | mood:${l.wellness_metrics?.mood || '?'} | energy:${l.wellness_metrics?.energy_level || '?'}/10 | symptoms:${l.symptoms?.join(',') || 'none'}`).join('\n')}
Avg Adherence: ${avgAdherence}%

ACTIVE MEAL PLAN: ${activePlan ? `"${activePlan.name}" (${activePlan.duration} days, ${activePlan.target_calories || 'N/A'} kcal)` : 'None'}

ACTIVE GOALS (${activeGoals.length}): ${activeGoals.map(g => `${g.title} [${g.current_value || '?'} → ${g.target_value} ${g.unit || ''}]`).join(' | ') || 'None set'}

RECENT FOOD LOGS: ${recentFood.map(f => `${f.meal_type}:${f.meal_name || f.items?.join(',')||'logged'}`).join(' | ') || 'None'}
        `.trim();
      }
    }

    // Build conversation history for context
    const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'Coach' : 'AI'}: ${m.content}`).join('\n');

    const prompt = `You are an expert AI assistant for a health coach/dietitian platform. You have deep knowledge of clinical nutrition, dietetics, behaviour change, and health coaching.

Your job is to help the coach with client-specific queries, suggest clinical actions, and provide evidence-based guidance.

${clientId ? `═══ ACTIVE CLIENT DATA ═══\n${clientContext}\n` : ''}
${history.length > 0 ? `═══ CONVERSATION HISTORY ═══\n${historyText}\n` : ''}

═══ COACH'S QUESTION ═══
${message}

═══ INSTRUCTIONS ═══
1. Answer the coach's question directly and concisely based on the client data above.
2. Be specific — reference the client's actual numbers, conditions, and trends when relevant.
3. If you identify a concern (low adherence, weight plateau, missed logs, symptom patterns), flag it clearly.
4. Suggest 2-3 concrete actionable steps the coach can take right now.
5. If the question requires medical escalation (e.g. severe symptoms, drug interactions, clinical red flags), say so explicitly.
6. Format your response with clear sections: Answer, Key Observations (if applicable), Suggested Actions, and Escalation Flag (only if needed).
7. Keep your response practical and coach-focused, not overly academic.
8. If no client is selected, answer as a general nutrition/coaching expert.`;

    const aiReply = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          key_observations: { type: "array", items: { type: "string" } },
          suggested_actions: { type: "array", items: { type: "string" } },
          escalation_required: { type: "boolean" },
          escalation_reason: { type: "string" },
          confidence: { type: "string" }
        }
      }
    });

    return Response.json({ success: true, reply: aiReply });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});