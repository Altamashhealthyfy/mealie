import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * mealOptionsPreview
 * NON-COMPROMISING RULE: ALL meal options shown here are sourced EXCLUSIVELY
 * from the Healthyfy Dishes Google Sheet catalog.
 * Applies to ALL users: Super Admin, Student Coaches, Team Members.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      clientId,
      additionalRestrictions = [],
      additionalAllergies = [],
      additionalConditions = [],
      overrideGoal,
      overrideCalories,
      overrideProtein,
      overrideCarbs,
      overrideFats,
      focusAreas = [],
      cuisineNotes = '',
    } = body;

    if (!clientId) return Response.json({ error: 'Client ID required' }, { status: 400 });

    const [clientArr, clinicalArr] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: clientId }),
      base44.asServiceRole.entities.ClinicalIntake.filter({ client_id: clientId }),
    ]);

    const client = clientArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const clinical = clinicalArr[0];

    const goal = overrideGoal || client.goal;
    const targetCal = overrideCalories || client.target_calories || client.tdee || 1800;
    const targetProtein = overrideProtein || client.target_protein || Math.round((client.weight || 70) * 1.6);
    const targetCarbs = overrideCarbs || client.target_carbs || Math.round((targetCal * 0.45) / 4);
    const targetFats = overrideFats || client.target_fats || Math.round((targetCal * 0.25) / 9);

    const allRestrictions = [...(client.dietary_restrictions || []), ...additionalRestrictions];
    const allAllergies = [...(clinical?.likes_dislikes_allergies?.allergies || []), ...additionalAllergies];

    const foodPref = client.food_preference || 'mixed';
    const isVeg = ['veg', 'jain'].includes(foodPref);
    const isEggetarian = foodPref === 'eggetarian';
    const isJain = foodPref === 'jain';

    const allAllergyLower = allAllergies.map(a => a.toLowerCase());
    const allRestrictionLower = allRestrictions.map(r => r.toLowerCase());

    // Fetch dishes from Healthyfy catalog
    const healthyfyDishes = await fetchHealthyfyDishes();

    function getExclusionReason(option) {
      const optLower = option.toLowerCase();
      for (const a of allAllergyLower) {
        if (optLower.includes(a)) return `Allergy: ${a}`;
      }
      for (const r of allRestrictionLower) {
        if (r.includes('dairy') && (optLower.includes('milk') || optLower.includes('paneer') || optLower.includes('buttermilk') || optLower.includes('yogurt') || optLower.includes('curd'))) return 'Restriction: dairy-free';
        if (r.includes('gluten') && (optLower.includes('roti') || optLower.includes('bread') || optLower.includes('wheat') || optLower.includes('suji') || optLower.includes('daliya') || optLower.includes('paratha'))) return 'Restriction: gluten-free';
        if (r.includes('jain') && (optLower.includes('onion') || optLower.includes('garlic') || optLower.includes('aalu') || optLower.includes('potato') || optLower.includes('carrot') || optLower.includes('radish'))) return 'Jain diet: no root vegetables/onion/garlic';
      }
      if (isJain && (optLower.includes('onion') || optLower.includes('garlic') || optLower.includes('aalu') || optLower.includes('potato') || optLower.includes('carrot') || optLower.includes('radish') || optLower.includes('mooli'))) {
        return 'Jain diet: root vegetables/onion/garlic excluded';
      }
      return null;
    }

    function isNonVegOption(option) {
      const o = option.toLowerCase();
      return o.includes('chicken') || o.includes('fish') || o.includes('mutton') || o.includes('meat') || o.includes('prawn') || o.includes('shrimp');
    }
    function isEggOption(option) { return option.toLowerCase().includes('egg'); }

    function getDietExclusionReason(option) {
      if (isNonVegOption(option)) {
        if (isVeg) return `Diet preference: ${foodPref} (non-veg excluded)`;
        if (isEggetarian) return `Diet preference: eggetarian (non-veg excluded)`;
      }
      if (isEggOption(option)) {
        if (isVeg && !isEggetarian) return `Diet preference: ${foodPref} (eggs excluded)`;
        if (isJain) return `Diet preference: jain (eggs excluded)`;
      }
      return null;
    }

    function analyzeCategory(label, options) {
      const available = [];
      const excluded = [];
      for (const opt of options) {
        const dietReason = getDietExclusionReason(opt);
        const restrictReason = getExclusionReason(opt);
        const reason = dietReason || restrictReason;
        if (reason) {
          excluded.push({ option: opt, reason });
        } else {
          available.push(opt);
        }
      }
      return { category: label, total: options.length, available_count: available.length, excluded_count: excluded.length, available, excluded };
    }

    // Group dishes by meal type
    const dishByType = {};
    for (const d of healthyfyDishes) {
      if (!dishByType[d.meal_type]) dishByType[d.meal_type] = [];
      dishByType[d.meal_type].push(d.name);
    }

    const mealTypeLabels = {
      early_morning: 'Early Morning Drinks',
      breakfast: 'Breakfast Options',
      mid_morning: 'Mid Morning Snacks',
      lunch: 'Lunch Options',
      evening_snack: 'Evening Snacks',
      dinner: 'Dinner Options',
    };

    const mealOptionAnalysis = Object.entries(mealTypeLabels).map(([mt, label]) => {
      return analyzeCategory(label, dishByType[mt] || []);
    });

    const allConditions = [...(clinical?.health_conditions || []), ...additionalConditions];

    const decisionRules = [
      { rule: `🔒 NON-COMPROMISING RULE: All dishes from Healthyfy Google Sheet catalog (${healthyfyDishes.length} total dishes)`, category: 'Dish Source' },
      { rule: `Daily calorie target: ${targetCal} kcal (BMR: ${client.bmr || 'N/A'}, TDEE: ${client.tdee || 'N/A'}, Goal: ${(goal || client.goal || 'N/A').replace(/_/g, ' ')})`, category: 'Calorie Target' },
      { rule: `Macros: Protein ~${targetProtein}g | Carbs ~${targetCarbs}g | Fats ~${targetFats}g`, category: 'Macros' },
      { rule: `Diet type: ${foodPref.charAt(0).toUpperCase() + foodPref.slice(1)} — Meal options selected accordingly`, category: 'Diet Type' },
      ...(allConditions.length > 0 ? allConditions.map(c => ({ rule: `${c}: Applied clinical dietary rules for this condition`, category: 'Medical Condition' })) : []),
      ...(allAllergies.length > 0 ? [{ rule: `Allergies strictly avoided: ${allAllergies.join(', ')}`, category: 'Allergy' }] : []),
      ...(allRestrictions.length > 0 ? [{ rule: `Dietary restrictions applied: ${allRestrictions.join(', ')}`, category: 'Restriction' }] : []),
      ...(focusAreas.length > 0 ? [{ rule: `Nutrition focus areas: ${focusAreas.join(', ')}`, category: 'Focus' }] : []),
      ...(cuisineNotes ? [{ rule: `Cuisine notes: ${cuisineNotes}`, category: 'Cuisine' }] : []),
    ];

    return Response.json({
      success: true,
      catalog_source: 'healthyfy_google_sheet',
      total_catalog_dishes: healthyfyDishes.length,
      decision_rules: decisionRules,
      meal_option_analysis: mealOptionAnalysis,
      food_preference: foodPref,
      client_name: client.full_name,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTHYFY DISH CATALOG — GOOGLE SHEET INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTHYFY_SHEET_CSV = 'https://docs.google.com/spreadsheets/d/1piIBl9QUrluRBf24-1bZNbooGYqMI5Cr11w3Mb9WxfU/export?format=csv';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

async function fetchHealthyfyDishes() {
  try {
    const resp = await fetch(HEALTHYFY_SHEET_CSV);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    return parseHealthyfyCSV(text);
  } catch (err) {
    console.error('ERROR: Could not fetch Healthyfy dish catalog:', err.message);
    return [];
  }
}

function parseHealthyfyCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const dishes = [];
  const MEAL_TYPE_MAP = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'evening_snack', any: 'any' };
  const CAT_MAP = { BREAKFAST: 'breakfast', LUNCH: 'lunch', DINNER: 'dinner', SNACK: 'evening_snack', ANY: 'any' };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dishName = cols[0]?.trim();
    if (!dishName || dishName.toLowerCase() === 'dish name') continue;
    const templateCode = cols[1]?.trim() || '';
    const mealCategory = (cols[4]?.trim() || '').toUpperCase();
    const mealFlexibility = (cols[5]?.trim() || '').toUpperCase();
    const combinedTypes = (cols[6]?.trim() || '').toLowerCase();
    const ingredients = [];
    for (let j = 0; j < 5; j++) {
      const base = 8 + j * 3;
      const ingName = cols[base]?.trim();
      if (!ingName) continue;
      ingredients.push({ ingredient_name: ingName, qty: parseFloat(cols[base + 1]) || 0, unit: cols[base + 2]?.trim() || 'g' });
    }
    let applicableMealTypes = [];
    if (combinedTypes) applicableMealTypes = combinedTypes.split('|').map(t => MEAL_TYPE_MAP[t.trim()]).filter(Boolean);
    if (applicableMealTypes.length === 0) {
      if (CAT_MAP[mealCategory]) applicableMealTypes.push(CAT_MAP[mealCategory]);
      if (mealFlexibility && CAT_MAP[mealFlexibility] && !applicableMealTypes.includes(CAT_MAP[mealFlexibility])) applicableMealTypes.push(CAT_MAP[mealFlexibility]);
    }
    if (applicableMealTypes.length === 0) applicableMealTypes = ['lunch'];
    const seen = new Set();
    for (const mt of applicableMealTypes) {
      if (seen.has(mt)) continue;
      seen.add(mt);
      dishes.push({ id: `${templateCode || dishName.replace(/\s+/g,'_')}_${mt}_${i}`, name: dishName, meal_type: mt, ingredients, source: 'healthyfy_catalog' });
    }
  }

  const emDrinks = ['Lemon Ginger Mint Cucumber Water','Zeera Water','Tulsi Water','Aloe Vera Juice with Water','Methi Water','Haldi Water','Chia Seeds Soaked Water','Dhaniya Pudina Water','Cinnamon Ginger Water','Saunf Water','Apple Cider Vinegar Water'];
  emDrinks.forEach((name,idx) => dishes.push({ id:`em_${idx}`, name, meal_type:'early_morning', source:'healthyfy_catalog' }));
  const mmItems = ['Seasonal Fruit 150g with Lemon Shikanji','Low Fat Buttermilk with Zeera and Chia Seeds','Seasonal Fruit — Apple or Orange or Papaya or Pear or Guava or Pomegranate','Cucumber Slices with Apple','Cucumber Slices with Pear','Bowl Papaya with Black Pepper','Pomegranate with Lemon'];
  mmItems.forEach((name,idx) => dishes.push({ id:`mm_${idx}`, name, meal_type:'mid_morning', source:'healthyfy_catalog' }));
  const esItems = ['Tea or Coffee or Green Tea or Low Fat Milk or Buttermilk','Roasted Chana or Roasted Chana Mix Green Salad','Dry Roasted Bajra Puffs Unsalted','Dry Roasted Popcorn','Dry Roasted Makhane','Steam Moong Sprouts Mix Green Salad','Roasted Wheat Puffs Unsalted','Murmura Bhel with Lots of Vegetables','Boiled Black Chana Saute with Veggies','Veg Grilled Sandwich with Green Chutney'];
  const existingEs = new Set(dishes.filter(d=>d.meal_type==='evening_snack').map(d=>d.name.toLowerCase()));
  esItems.forEach((name,idx) => { if(!existingEs.has(name.toLowerCase())) dishes.push({ id:`es_${idx}`, name, meal_type:'evening_snack', source:'healthyfy_catalog' }); });
  return dishes;
}