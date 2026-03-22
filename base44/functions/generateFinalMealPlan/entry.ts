import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { dishes, mealTemplates } from './mealplanData.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      client_id, 
      diagnostics, 
      meal_count = 4,
      duration_days = 7,
      previousPlanDishNames = []
    } = await req.json();

    if (!client_id || !diagnostics) {
      return Response.json({ error: 'client_id and diagnostics required' }, { status: 400 });
    }

    const calorie_target = diagnostics.modifiable_data?.calorie_target_override || 
                           diagnostics.nutritional_targets.calorie_target;
    const foods_to_avoid = new Set([
      ...diagnostics.health_analysis.foods_to_avoid,
      ...diagnostics.modifiable_data.custom_restrictions
    ]);
    const force_include = diagnostics.modifiable_data.force_include_foods || [];
    const food_preference = diagnostics.profile_summary.food_preference;
    const allergies = new Set(diagnostics.profile_summary.allergies || []);

    // Get meal template
    const meal_key = `${meal_count}_meals`;
    const meal_template = mealTemplates[meal_key] || mealTemplates['4_meals'];
    const meal_slots = Object.keys(meal_template).sort();

    // === STEP 3: Filter Available Dishes ===
    function filterDishes(slot, calorie_target_for_slot) {
      return dishes.filter(dish => {
        // Slot match
        if (dish.meal_type !== slot && slot !== 'snack') return false;
        
        // Diet type match
        if (food_preference === 'jain' && ['onion', 'garlic', 'potato'].some(i => 
          dish.ingredients.map(ing => ing.toLowerCase()).includes(i.toLowerCase()))) {
          return false;
        }
        if (food_preference === 'veg' && dish.food_preference === 'non_veg') return false;
        
        // Allergy check
        for (const allergen of allergies) {
          if (dish.ingredients.some(i => i.toLowerCase().includes(allergen.toLowerCase()))) {
            return false;
          }
        }
        
        // Avoid foods check
        for (const avoid of foods_to_avoid) {
          if (dish.name.toLowerCase().includes(avoid.toLowerCase()) ||
              dish.ingredients.some(i => i.toLowerCase().includes(avoid.toLowerCase()))) {
            return false;
          }
        }
        
        return true;
      });
    }

    // === STEP 4: Score & Select Dishes ===
    function scoreDish(dish, target_cal, dayIndex, dishesUsedSoFar) {
      const calorie_fit = 100 - Math.abs(dish.cal - target_cal);
      const protein_bonus = dish.protein * 5;
      const repeat_penalty = dayIndex > 2 && dishesUsedSoFar.includes(dish.id) ? -200 : 0;
      const variety_penalty = previousPlanDishNames.includes(dish.id) ? -1000 : 0;
      const jitter = Math.random() * 80;

      return calorie_fit + protein_bonus + repeat_penalty + variety_penalty + jitter;
    }

    // === BUILD MEAL PLAN ===
    const mealPlan = [];
    const dishesUsedInPlan = new Set();

    for (let day = 1; day <= duration_days; day++) {
      const dayMeals = [];

      for (const slot of meal_slots) {
        const calorie_allocation = meal_template[slot] * calorie_target;
        const availableDishes = filterDishes(slot, calorie_allocation);

        if (availableDishes.length === 0) {
          dayMeals.push({
            day,
            meal_type: slot,
            meal_name: 'No suitable dish found',
            items: [],
            portion_sizes: [],
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0
          });
          continue;
        }

        // Score and select best dish
        let bestScore = -Infinity;
        let bestDish = availableDishes[0];

        for (const dish of availableDishes) {
          const score = scoreDish(dish, calorie_allocation, day, Array.from(dishesUsedInPlan));
          if (score > bestScore) {
            bestScore = score;
            bestDish = dish;
          }
        }

        dishesUsedInPlan.add(bestDish.id);

        dayMeals.push({
          day,
          meal_type: slot,
          meal_name: bestDish.name,
          items: bestDish.ingredients,
          portion_sizes: ['1 serving'],
          calories: bestDish.cal,
          protein: bestDish.protein,
          carbs: bestDish.carbs,
          fats: bestDish.fats,
          cooking_time: bestDish.cooking_time,
          nutritional_tip: `Rich in ${bestDish.protein > 12 ? 'protein' : bestDish.carbs > 40 ? 'carbohydrates' : 'healthy fats'}`,
          disease_rationale: 'Aligned with health conditions and dietary preferences'
        });
      }

      mealPlan.push(...dayMeals);
    }

    // Calculate audit snapshot
    const totalCalories = mealPlan.reduce((sum, m) => sum + m.calories, 0);
    const totalProtein = mealPlan.reduce((sum, m) => sum + m.protein, 0);
    const totalCarbs = mealPlan.reduce((sum, m) => sum + m.carbs, 0);
    const totalFats = mealPlan.reduce((sum, m) => sum + m.fats, 0);

    const avgCalories = totalCalories / duration_days;
    const macroTotal = totalProtein * 4 + totalCarbs * 4 + totalFats * 9;

    const generatedPlan = {
      client_id,
      name: `Meal Plan - ${new Date().toLocaleDateString()}`,
      plan_tier: diagnostics.health_analysis.health_conditions.length > 0 ? 'advanced' : 'basic',
      duration: duration_days,
      meal_pattern: meal_count === 6 ? '3-3-4' : 'daily',
      target_calories: calorie_target,
      disease_focus: diagnostics.health_analysis.health_conditions,
      meals: mealPlan,
      food_preference,
      regional_preference: 'all',
      active: true,
      audit_snapshot: {
        avg_calories_per_day: Math.round(avgCalories),
        calorie_range: `${Math.round(avgCalories * 0.9)} - ${Math.round(avgCalories * 1.1)}`,
        macro_percentages: {
          protein: Math.round((totalProtein * 4 / macroTotal) * 100),
          carbs: Math.round((totalCarbs * 4 / macroTotal) * 100),
          fats: Math.round((totalFats * 9 / macroTotal) * 100)
        },
        variety_check: dishesUsedInPlan.size >= (duration_days * 0.6),
        mpess_integrated: diagnostics.health_analysis.mpess_recommendations.physical.length > 0
      },
      decision_rules_applied: [
        'Calorie target calculation',
        'Health condition filtering',
        'Allergy & intolerance avoidance',
        'Dietary preference compliance',
        'Variety & repetition scoring'
      ]
    };

    return Response.json(generatedPlan);
  } catch (error) {
    console.error('Generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});