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
    const { originalPrompt, originalResponse, modificationRequest, currentMeals } = body;

    if (!originalPrompt || !originalResponse || !modificationRequest) {
      return Response.json({ error: 'originalPrompt, originalResponse, and modificationRequest are required' }, { status: 400 });
    }

    // Build the modification instruction as a follow-up turn
    const modificationPrompt = `The nutritionist wants to modify the meal plan. Apply the following changes and return the COMPLETE updated meal plan (all days, all slots — not just the changed ones).

MODIFICATION REQUEST: "${modificationRequest}"

RULES (same as before):
- Only use dishes from the AVAILABLE DISHES list provided in the original prompt above.
- Do NOT introduce any new dishes not in that list.
- Maintain calorie targets, slot distribution, and all dietary/disease rules.
- Return ONLY raw JSON in the same format as before.
- Start with { and end with }.
- Do NOT wrap in markdown or code fences.

Return the full updated plan: {"meals": [...all meals...], "mpess": [...]}`;

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
    if (aiData.error) throw new Error("Claude API: " + aiData.error.message);

    const aiResult = aiData.content?.[0]?.text || "";
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