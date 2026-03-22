import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'student_coach', 'team_member'].includes(user.user_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all recipes without image_url
    const allRecipes = await base44.asServiceRole.entities.Recipe.list();
    const recipesWithoutImages = allRecipes.filter(r => !r.image_url);

    if (recipesWithoutImages.length === 0) {
      return Response.json({ message: 'All recipes already have images!', updated: 0 });
    }

    let updated = 0;

    for (const recipe of recipesWithoutImages) {
      // Use Unsplash Source (no API key needed) with recipe name as query
      const query = encodeURIComponent(recipe.name || recipe.meal_type || 'indian food');
      // Use picsum as fallback or unsplash source URL
      const imageUrl = `https://source.unsplash.com/800x600/?${query},food,indian`;

      await base44.asServiceRole.entities.Recipe.update(recipe.id, {
        image_url: imageUrl
      });
      updated++;
    }

    return Response.json({ 
      message: `Successfully added images to ${updated} recipes!`, 
      updated 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});