import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { recipe_name, ingredients } = await req.json();

    if (!recipe_name) {
      return Response.json({ error: 'Recipe name is required' }, { status: 400 });
    }

    const ingredientList = ingredients?.length > 0 
      ? ingredients.slice(0, 5).map(ing => ing.item || ing).join(', ')
      : '';

    const prompt = `Generate a high-quality, appetizing food photo of "${recipe_name}".${ingredientList ? ` Key ingredients: ${ingredientList}.` : ''} Professional food photography style, well-lit, vibrant colors, garnished beautifully. The dish should be the main focus, presented on a nice plate or bowl.`;

    const response = await base44.integrations.Core.GenerateImage({
      prompt,
    });

    return Response.json({ url: response.url });
  } catch (error) {
    console.error('Image generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});