import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { diseaseRules, bloodMarkerRules, jainRestrictions } from './mealplanData.js';

// Hamwi Formula for Ideal Body Weight
function calculateIBW(height_cm, gender) {
  const height_inches = height_cm / 2.54;
  const inches_over_60 = Math.max(0, height_inches - 60);
  
  if (gender === 'male') {
    return 50 + (2.3 * inches_over_60);
  } else {
    return 45.5 + (2.3 * inches_over_60);
  }
}

// Mifflin-St Jeor BMR Formula
function calculateBMR(weight_kg, height_cm, age_years, gender) {
  const gender_offset = gender === 'male' ? 5 : -161;
  return (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + gender_offset;
}

// Activity multipliers
const activityMultipliers = {
  'sedentary': 1.2,
  'lightly_active': 1.375,
  'moderately_active': 1.55,
  'very_active': 1.725,
  'extremely_active': 1.9
};

// Goal calorie adjustments
const goalAdjustments = {
  'weight_loss': -500,
  'weight_gain': 300,
  'maintenance': 0,
  'muscle_gain': 300,
  'health_improvement': 0,
  'disease_reversal': -200
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id required' }, { status: 400 });
    }

    // Fetch client and user profile data
    const clients = await base44.entities.Client.filter({ id: client_id });
    const client = clients[0];

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const profiles = await base44.entities.UserProfile.filter({ created_by: client.email });
    const profile = profiles[0] || {};

    // === STEP 1: Calculate Nutritional Targets ===
    const height = client.height || profile.height || 165;
    const weight = client.weight || profile.weight || 70;
    const age = client.age || profile.age || 30;
    const gender = client.gender || profile.gender || 'female';
    const activity_level = client.activity_level || profile.activity_level || 'moderately_active';
    const goal = client.goal || profile.goal || 'maintenance';

    const ibw = calculateIBW(height, gender);
    const bmr = calculateBMR(weight, height, age, gender);
    const activity_multiplier = activityMultipliers[activity_level] || 1.55;
    const tdee = bmr * activity_multiplier;
    const goal_adjustment = goalAdjustments[goal] || 0;
    let calorie_target = Math.max(1200, tdee + goal_adjustment);

    // Macro calculations
    const protein_grams = Math.max(ibw * 1.0, (calorie_target * 0.20) / 4);
    const fat_grams = (calorie_target * 0.25) / 9;
    const carb_grams = (calorie_target - (protein_grams * 4) - (fat_grams * 9)) / 4;

    const bmi = weight / ((height / 100) ** 2);

    // === STEP 2: Analyze Health Conditions ===
    const health_conditions = profile.health_conditions || [];
    const allergies = profile.allergies || [];
    const intolerances = profile.intolerances || [];
    const disliked_ingredients = profile.disliked_ingredients || [];
    const food_preference = client.food_preference || profile.food_preference || 'veg';

    const applicable_diseases = health_conditions.filter(hc => diseaseRules[hc]);
    const foods_to_avoid = new Set();
    const foods_to_emphasize = new Set();
    const cooking_rules = [];
    const mpess_recommendations = { mind: [], physical: [], emotional: [], social: [], spiritual: [] };
    const safety_flags = [];
    let medication_interactions = '';

    // Apply disease rules
    for (const disease of applicable_diseases) {
      const rule = diseaseRules[disease];
      if (rule.avoid) rule.avoid.forEach(f => foods_to_avoid.add(f));
      if (rule.emphasize) rule.emphasize.forEach(f => foods_to_emphasize.add(f));
      if (rule.cooking) cooking_rules.push(...rule.cooking);
      if (rule.medication_interaction) medication_interactions = rule.medication_interaction;
      if (rule.mpess) {
        Object.keys(rule.mpess).forEach(key => {
          if (rule.mpess[key].length > 0) {
            mpess_recommendations[key].push(...rule.mpess[key]);
          }
        });
      }
    }

    // Add allergies and intolerances to avoid list
    allergies.forEach(a => foods_to_avoid.add(a));
    intolerances.forEach(i => foods_to_avoid.add(i));
    disliked_ingredients.forEach(d => foods_to_avoid.add(d));

    // Analyze blood markers
    const health_metrics = profile.health_metrics || {};
    const blood_marker_findings = [];

    for (const [marker, value] of Object.entries(health_metrics)) {
      if (value && bloodMarkerRules[marker]) {
        const rule = bloodMarkerRules[marker];
        if (value > rule.flag_range.max || value < rule.flag_range.min) {
          blood_marker_findings.push({
            marker: marker,
            value: value,
            recommendation: rule.recommendation
          });
        }
      }
    }

    // Safety Gates
    if (bmi < 18.5) {
      safety_flags.push('⚠️ Underweight (BMI < 18.5) - clinician guidance recommended');
    }
    if (age > 70) {
      safety_flags.push('⚠️ Age > 70 - calorie needs may differ, recommend consultation');
    }
    if (health_metrics.hba1c && health_metrics.hba1c > 9) {
      safety_flags.push('🚨 Critical: HbA1c > 9% - refer to clinician for glucose management');
    }

    // Apply Jain restrictions if needed
    const jain_applied = food_preference === 'jain';
    if (jain_applied) {
      jainRestrictions.forEach(r => foods_to_avoid.add(r));
    }

    // === DIAGNOSTIC REPORT ===
    const diagnosticReport = {
      client_id,
      client_name: client.full_name,
      timestamp: new Date().toISOString(),
      
      // Nutritional Targets
      nutritional_targets: {
        ibw: Math.round(ibw * 100) / 100,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        calorie_target,
        macros: {
          protein_grams: Math.round(protein_grams),
          carbs_grams: Math.round(carb_grams),
          fat_grams: Math.round(fat_grams),
          protein_percent: 20,
          carbs_percent: 55,
          fat_percent: 25
        }
      },

      // Health Analysis
      health_analysis: {
        bmi: Math.round(bmi * 100) / 100,
        health_conditions: applicable_diseases,
        foods_to_avoid: Array.from(foods_to_avoid),
        foods_to_emphasize: Array.from(foods_to_emphasize),
        cooking_rules: [...new Set(cooking_rules)],
        medication_interactions: medication_interactions,
        mpess_recommendations: mpess_recommendations,
        blood_marker_findings
      },

      // Client Profile Summary
      profile_summary: {
        age,
        gender,
        height_cm: height,
        weight_kg: weight,
        activity_level,
        goal,
        food_preference,
        allergies,
        intolerances,
        disliked_ingredients
      },

      // Safety Flags
      safety_flags,
      jain_restrictions_applied: jain_applied,

      // Nutritionist can modify these
      modifiable_data: {
        calorie_target_override: null,
        protein_override_grams: null,
        carbs_override_grams: null,
        fat_override_grams: null,
        custom_restrictions: [],
        force_include_foods: []
      }
    };

    return Response.json(diagnosticReport);
  } catch (error) {
    console.error('Diagnostic error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});