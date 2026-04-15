import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * modifyMealPlan
 * Continues the Claude conversation from plan generation to apply modifications.
 * Uses the original prompt + assistant response as history so Claude retains full
 * context of the dish catalog and rules.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { originalPrompt, originalResponse, modificationRequest, currentMeals, clientId, clientName, clientEmail } = body;

    if (!originalPrompt || !originalResponse || !modificationRequest) {
      return Response.json({ error: 'originalPrompt, originalResponse, and modificationRequest are required' }, { status: 400 });
    }

    const callStartTime = Date.now();

    // If currentMeals is provided, build the modification from the actual meal plan
    // rather than just continuing the template conversation
    const currentMealsSummary = currentMeals && currentMeals.length > 0
      ? `\n\nCURRENT BUILT MEAL PLAN (${currentMeals.length} entries):\n${JSON.stringify(currentMeals, null, 2)}`
      : '';

    // Build the modification instruction as a follow-up turn
    const modificationPrompt = `The nutritionist wants to modify the meal plan. Apply the following changes and return the COMPLETE updated meal plan (all days, all slots — not just the changed ones).

MODIFICATION REQUEST: "${modificationRequest}"
${currentMealsSummary}

RULES (same as before):
- Only use dishes from the AVAILABLE DISHES list provided in the original prompt above.
- Do NOT introduce any new dishes not in that list.
- Maintain calorie targets, slot distribution, and all dietary/disease rules.
- CRITICAL: Strictly follow the modification request. If the coach says "eggs only at evening_snack", move ALL egg dishes to evening_snack slot only and remove eggs from breakfast or any other slot.
- Return ONLY raw JSON in the same format as before.
- Start with { and end with }.
- Do NOT wrap in markdown or code fences.

Return the full updated plan: {"meals": [...all meals with day, meal_type, meal_name, items, portion_sizes, calories, protein, carbs, fats...], "mpess": [...]}`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("CLAUDE"),
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 16000,
        messages: [
          { role: "user", content: originalPrompt },
          { role: "assistant", content: originalResponse },
          { role: "user", content: modificationPrompt }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const callDurationMs = Date.now() - callStartTime;

    if (aiData.error) {
      await base44.asServiceRole.entities.AICallLog.create({
        function_name: 'modifyMealPlan',
        model: 'claude-sonnet-4-5',
        status: 'error',
        client_id: clientId || '',
        client_name: clientName || '',
        client_email: clientEmail || '',
        triggered_by: user.email || '',
        duration_ms: callDurationMs,
        error_message: aiData.error.message,
        prompt_summary: modificationRequest.slice(0, 500),
        context_metadata: { modification_request: modificationRequest },
      }).catch(() => {});
      throw new Error("Claude API: " + aiData.error.message);
    }

    const aiResult = aiData.content?.[0]?.text || "";
    const promptTokens = aiData.usage?.input_tokens || 0;
    const completionTokens = aiData.usage?.output_tokens || 0;
    const estimatedCost = (promptTokens * 3 + completionTokens * 15) / 1_000_000;
    console.log("✅ Modification response length:", aiResult.length);

    const cleanResult = aiResult.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let mealData = {};
    try {
      mealData = JSON.parse(cleanResult);
    } catch (parseErr) {
      throw new Error(`Failed to parse modification response as JSON: ${parseErr.message}`);
    }

    const meals = mealData.meals || [];
    if (meals.length === 0) throw new Error('Modification returned 0 meals.');

    await base44.asServiceRole.entities.AICallLog.create({
      function_name: 'modifyMealPlan',
      model: 'claude-sonnet-4-5',
      status: 'success',
      client_id: clientId || '',
      client_name: clientName || '',
      client_email: clientEmail || '',
      triggered_by: user.email || '',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      estimated_cost_usd: Math.round(estimatedCost * 100000) / 100000,
      duration_ms: callDurationMs,
      prompt_summary: modificationRequest.slice(0, 500),
      response_summary: aiResult.slice(0, 500),
      full_response: aiResult,
      context_metadata: { modification_request: modificationRequest },
    }).catch(e => console.warn('AICallLog write failed:', e.message));

    return Response.json({
      success: true,
      meals,
      mpess: mealData.mpess || [],
      // Return updated assistant response for chaining further modifications
      updatedAssistantResponse: aiResult,
    });

  } catch (err) {
    console.error('💥 modifyMealPlan error:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});