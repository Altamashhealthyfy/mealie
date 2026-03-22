import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { resourceId, resourceType, title, content, summary } = body;

    if (!resourceId) {
      return Response.json({ error: 'Resource ID required' }, { status: 400 });
    }

    // Prepare content for analysis
    const textToAnalyze = `
Title: ${title || ''}
Type: ${resourceType || ''}
Summary: ${summary || ''}
Content: ${content ? content.substring(0, 2000) : ''}
    `.trim();

    const analysisPrompt = `Analyze this resource and suggest relevant tags across 4 categories:

RESOURCE CONTENT:
${textToAnalyze}

TAGGING INSTRUCTIONS:
Analyze the resource and return tags in EXACTLY this JSON format:
{
  "health_conditions": ["comma", "separated", "tag", "names"],
  "wellness_goals": ["comma", "separated", "tag", "names"],
  "dietary_approaches": ["comma", "separated", "tag", "names"],
  "resource_categories": ["comma", "separated", "tag", "names"]
}

CATEGORY GUIDELINES:

1. HEALTH CONDITIONS (if applicable):
   - diabetes, prediabetes, hyperlipidemia, hypertension, heart_disease, pcos, thyroid_disorder, kidney_disease, liver_disease, obesity, underweight, osteoporosis, arthritis, asthma, copd, ibs, celiac_disease, food_allergies

2. WELLNESS GOALS (if applicable):
   - weight_loss, weight_gain, muscle_gain, muscle_toning, flexibility, strength_building, endurance, stress_management, sleep_improvement, energy_boost, immune_support, longevity, athletic_performance, injury_recovery, metabolism_boost

3. DIETARY APPROACHES (if applicable):
   - high_protein, low_carb, low_fat, low_sodium, low_sugar, low_glycemic, anti_inflammatory, mediterranean, dash_diet, plant_based, vegetarian, vegan, keto, paleo, intermittent_fasting, detox, high_fiber, clean_eating

4. RESOURCE CATEGORIES:
   - article, recipe, workout_routine, meal_plan, educational_guide, motivational, quick_tips, scientific_research, personal_story, video_guide, infographic

IMPORTANT:
- Only include tags that are CLEARLY relevant to the resource content
- Do not include tags that are just loosely related
- If a category doesn't apply, return empty array []
- Be specific and precise with tag names
- Return ONLY valid JSON, no other text`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          health_conditions: {
            type: 'array',
            items: { type: 'string' }
          },
          wellness_goals: {
            type: 'array',
            items: { type: 'string' }
          },
          dietary_approaches: {
            type: 'array',
            items: { type: 'string' }
          },
          resource_categories: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Combine all tags
    const allTags = [
      ...(aiResponse.health_conditions || []),
      ...(aiResponse.wellness_goals || []),
      ...(aiResponse.dietary_approaches || []),
      ...(aiResponse.resource_categories || [])
    ].filter(tag => tag && tag.trim().length > 0);

    // Update the resource with tags
    if (resourceId.startsWith('ai_')) {
      // AIGeneratedResource
      await base44.asServiceRole.entities.AIGeneratedResource.update(
        resourceId.replace('ai_', ''),
        { tags: allTags }
      );
    } else {
      // Regular Resource entity
      await base44.asServiceRole.entities.Resource.update(
        resourceId,
        { tags: allTags }
      );
    }

    return Response.json({
      success: true,
      resourceId,
      tags: allTags,
      categorized_tags: {
        health_conditions: aiResponse.health_conditions || [],
        wellness_goals: aiResponse.wellness_goals || [],
        dietary_approaches: aiResponse.dietary_approaches || [],
        resource_categories: aiResponse.resource_categories || []
      }
    });

  } catch (error) {
    console.error('Tagging error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});