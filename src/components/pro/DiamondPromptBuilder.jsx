// Helper function to construct Diamond GPT prompt
export function constructDiamondPrompt(client, intake, numberOfDays, mealPattern, preferences, reportData = null) {
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  };

  // Use intake.basic_info values (more detailed clinical data) with fallback to client entity
  const gender = intake.basic_info?.gender || client.gender || 'female';
  const weight = parseFloat(intake.basic_info?.weight || client.weight) || 60;
  const height = parseFloat(intake.basic_info?.height || client.height) || 160;
  const age = parseFloat(intake.basic_info?.age || client.age) || 30;
  const activityLevel = intake.basic_info?.activity_level || client.activity_level || 'sedentary';

  const bmr = gender === 'male'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);

  // ===== CALORIE TARGET CALCULATION (ROOT FIX FOR DISCREPANCY) =====
  // Calculate target calories based on client goal — THIS is the binding number sent to AI
  const goals = Array.isArray(intake.goal) ? intake.goal : (intake.goal ? [intake.goal] : []);
  let targetCalories;
  if (goals.includes('weight_loss')) {
    targetCalories = Math.round(tdee - 400); // caloric deficit for weight loss
  } else if (goals.includes('muscle_gain') || goals.includes('weight_gain')) {
    targetCalories = Math.round(tdee + 300); // caloric surplus for muscle/weight gain
  } else {
    targetCalories = Math.round(tdee); // maintenance / disease reversal / energy / symptom relief
  }
  // Sensible clinical bounds: never below 1200, never above 2800
  targetCalories = Math.max(1200, Math.min(2800, targetCalories));
  const calorieRangeMin = targetCalories - 50;
  const calorieRangeMax = targetCalories + 50;

  // Format medications safely without nested template literals
  const medsText = (intake.current_medications || [])
    .map(m => m.name + ' (' + m.dosage + ')')
    .join(', ') || 'None';

  const labValuesText = Object.entries(intake.lab_values || {})
    .filter(([, val]) => val !== '' && val !== null && val !== undefined)
    .map(([key, val]) => '- ' + key + ': ' + val)
    .join('\n') || 'No lab values provided';

  // Format food preferences
  const recommendedFoodsText = preferences?.recommendedFoods?.join(', ') || 'Not specified';
  const likedFoodsText = preferences?.likedFoods?.join(', ') || 'Not specified';
  const dislikedFoodsText = preferences?.dislikedFoods?.join(', ') || 'Not specified';

  // Build report data section if available
  const reportSection = reportData ? `
## UPLOADED MEDICAL REPORT DATA (USE THIS TO SUPPLEMENT CLINICAL INTAKE):
${reportData.health_conditions?.length ? `Additional Conditions from Report: ${reportData.health_conditions.join(', ')}` : ''}
${reportData.stage_severity ? `Stage/Severity from Report: ${reportData.stage_severity}` : ''}
${reportData.current_medications?.length ? `Medications from Report: ${reportData.current_medications.map(m => m.name + ' ' + (m.dosage || '')).join(', ')}` : ''}
${reportData.lab_values && Object.keys(reportData.lab_values).length > 0 ? `Lab Values from Report:\n${Object.entries(reportData.lab_values).map(([k, v]) => '- ' + k + ': ' + v).join('\n')}` : ''}
${reportData.additional_notes ? `Clinical Notes from Report: ${reportData.additional_notes}` : ''}
IMPORTANT: Cross-reference these report values with clinical intake data above. Prioritize specific lab values from the report when generating meal plan rules.
` : '';

  return `# Diamond Clinical Meal Plan GPT

Generate a **disease-specific holistic ${numberOfDays}-day meal plan** with ${mealPattern} rotation pattern.

## CLIENT INTAKE DATA:
Name: ${client.full_name}
Age: ${age}
Gender: ${gender}
Height: ${height} cm
Weight: ${weight} kg
BMI: ${intake.basic_info?.bmi || (weight / ((height/100)**2)).toFixed(1)}
Activity Level: ${activityLevel}

Health Conditions: ${intake.health_conditions.join(', ')}
Stage/Severity: ${intake.stage_severity || 'Not specified'}
Current Medications: ${medsText}

Lab Values:
${labValuesText}

Diet Type: ${intake.diet_type || 'Not specified'}
Likes: ${(intake.likes_dislikes_allergies?.likes || []).join(', ') || 'None'}
Dislikes: ${(intake.likes_dislikes_allergies?.dislikes || []).join(', ') || 'None'}
Allergies: ${(intake.likes_dislikes_allergies?.allergies || []).join(', ') || 'None'}
No-Go Foods: ${(intake.likes_dislikes_allergies?.no_go_foods || []).join(', ') || 'None'}

## CLIENT FOOD PREFERENCES (FROM FORM):
Recommended Foods (Health-promoting): ${recommendedFoodsText}
Foods They Like: ${likedFoodsText}
Foods They Dislike: ${dislikedFoodsText}

Daily Routine:
- Breakfast: ${intake.daily_routine?.breakfast_time || 'Not specified'}
- Lunch: ${intake.daily_routine?.lunch_time || 'Not specified'}
- Dinner: ${intake.daily_routine?.dinner_time || 'Not specified'}

Goal: ${goals.join(', ') || 'Not specified'}
Symptom Goals: ${(intake.symptom_goals || []).join(', ') || 'None'}

BMR: ${Math.round(bmr)} kcal
TDEE: ${Math.round(tdee)} kcal
${reportSection}
---

## ⚠️ MANDATORY CALORIE TARGET — DO NOT DEVIATE:
Daily Calorie Target: **${targetCalories} kcal** (calculated from TDEE based on client goal: ${goals.join(', ') || 'maintenance'})
Acceptable Range: ${calorieRangeMin} – ${calorieRangeMax} kcal per day (±50 kcal ONLY)

This is a HARD REQUIREMENT. Every day's total calories (all meals combined) MUST fall within ${calorieRangeMin}–${calorieRangeMax} kcal.
The AI MUST NOT default to 1200 kcal or any other generic number. Use ${targetCalories} kcal as the binding target.
Adjust portion sizes upward or downward to hit this exact range. If a day's meals are underestimating, ADD more food (e.g., larger roti, extra dal, more salad with oil dressing) until the total reaches ${calorieRangeMin}–${calorieRangeMax} kcal.

---

## REQUIREMENTS:

1. **PERSONALIZE WITH FOOD PREFERENCES:**
   - Incorporate client's RECOMMENDED FOODS whenever possible in the meal plan (these support their health condition)
   - Include client's LIKED FOODS to make the plan enjoyable and sustainable
   - AVOID all DISLIKED FOODS completely - never include them in any meal
   - Balance health requirements with client preferences

2. Apply disease-specific rules for: ${intake.health_conditions.join(', ')}

3. **MANDATORY - DO NOT SKIP ANY DAYS**: 
   - You MUST generate ALL ${numberOfDays} days of meal plans
   - Generate day 1, day 2, day 3, day 4, day 5, day 6, day 7, day 8, day 9, day 10
   - Continue until you reach day ${numberOfDays}
   - DO NOT stop at day 3 or any day before ${numberOfDays}
   - Each meal object must have a "day" field from 1 to ${numberOfDays}

4. Pattern: ${mealPattern}${mealPattern === '3-3-4' ? ' (Plan A: days 1-3, Plan B: days 4-6, Plan C: days 7-' + numberOfDays + ')' : ''}

5. Each day MUST have 7 meal sections in EXACT sequence: Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner, Post Dinner (herbal drink only — SAME drink for all ${numberOfDays} days, NO bedtime meal)

6. For each meal provide: day (1 to ${numberOfDays}), meal_type, meal_name, items, portion_sizes (Indian units), calories, protein, carbs, fats, sodium, potassium, disease_rationale

7. Include MPESS practices SPECIFICALLY for client needs:
   - **Affirmations**: Based on their health goals and mental wellbeing needs
   - **Journaling**: Daily reflection prompts for emotional awareness
   - **Breathing Exercises**: Specific techniques for stress/anxiety management  
   - **Physical Activity**: Exercises suitable for their health conditions
   - **Forgiveness**: Practices for emotional release and healing
   
   Assign these practices according to: ${Object.entries(intake.mpess_preferences || {}).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'all'}

   8. Provide audit snapshot with compliance tracking

   9. List decision rules applied

   10. Handle conflicts with hierarchy: Kidney > Diabetes > Heart > Thyroid

## APPROVED MEAL OPTIONS (USE ONLY THESE - FROM COMPREHENSIVE LIST):

**EARLY MORNING (Choose 1):**
- 1Liter water + 2 small lemon slices + 1 inch ginger grated + 10-12 mint leaves + 1 small cucumber slice
- 1Glass zeera water [1spoon zeera seeds overnight soaked in 1glass boiled water, consume luke warm]
- 1Glass tulsi water [10-12 tulsi leaves boiled in 1 glass water, may add lemon for taste]
- 30ml aloe Vera juice with 70 ml water
- 1Glass methi water [1spoon methi seeds + 2glasses of water boiled till 1glass, consume luke warm]
- 1Glass Haldi water [½ Teaspoon haldi powder + ½ inch grated ginger + 1Glass Luke warm water]
- 1Tablespoon chia seeds overnight soaked in 1glass water, consume next morning
- 1Glass dhaniya pudina water [1tea spoon dhaniya seeds + 10-12 mint leaves, boiled, consume luke warm]
- 1Glass cinnamon ginger water [pinch of cinnamon + 1Glass Luke warm water] [NOT for low BP & hyperglycaemic]
- 1Glass saunf water [1spoon saunf seeds + 2glasses of water boiled till 1glass, consume luke warm]
- 1Glass A.C.V. [20ml apple cider vinegar + 1glass water]

**BREAKFAST (Choose 1 category):**
CEREALS: 3 Table spoons muesli without nuts with milk | 3 tablespoon wheat flakes with milk without sugar | Oats with milk | Wheat daliya with milk
POHA: 1Small bowl vegetable poha mix 1ice cube size paneer homemade + veggies | 1Small bowl vegetable poha mix 2 spoons of steam sprouts | 1Small bowl vegetable poha mix nutreela | 1medium bowl vegetable bread Poha (3:1) + green chutney
NON VEG: 3 Eggs white mix veggies omelette or scrambled with 1whole wheat toast | 2-3 boiled egg white with veggies | Chicken salami sandwich with g. chutney
DALIYA: 1bowl veg oats [3:1] with green chutney | 1bowl vegetable wheat daliya [3:1]+ g. chutney | 1bowl vegetable ragi daliya [3:1] + g. chutney | 1bowl vegetable bajra daliya [3:1] + g. chutney | 1bowl vegetable barley daliya [3:1] + g. chutney | 1bowl vegetable upma[3:1]+ g.chutney
SANDWICHES: 1-2 Aata bread veg sandwich with green chutney | 1-2 Paneer sandwiches with green chutney | 1Spoon Peanut butter with chia seeds sandwich [2spoon peanut butter spread on 2slices of whole wheat bread, add strawberries/banana/apple slices + sprinkle 1spoon chia seeds] | 1-2 Soya veg sandwich with g. chutney | 1-2 Aalu veg sandwich with g. chutney
STUFFED ROTI: 1-2 Veg stuffed roti [lauki + green chilli + coriander leaves] | 1-2 Veg stuffed roti [Spinach/methi + green chilli + onion] | 1-2 Veg stuffed roti [onion + green chilli + coriander leaves] | 1-2 Veg stuffed roti [Paneer + onion + green chilli + coriander leaves] | 1-2 Veg stuffed roti [Radish + coriander leaves] | 1-2 Veg stuffed roti [soya bean/nutreela + onion + green chilli + coriander leaves] | 1-2 Veg stuffed roti [carrot + onion + green chilli + coriander leaves]
CHEELA: 1-2 besan cheela veg mix with g. chutney | 1-2 Suji cheela veg mix with g. chutney | 1-2 Veg uttapam with g. chutney | 1-2 Ragi cheela veg mix with g. chutney | 1-2 Moong dal cheela veg mix with g. chutney | 1-2 Chana dal cheela veg mix with g. chutney
CHHOLES: 1bowl steam moong sprouts mix green salad | 1Bowl soya bean sprouts with green salad | 1Bowl boiled black chana saute with lots of veggies | 1Bowl lobhia saute with lots of veggies
SMOOTHIES: 1 bowl fruit yogurt [yogurt + apple + 1spoon chia seeds] | 1 bowl of plain yogurt with fruit [no mango] banana once a week add 1 spoon roasted flax seeds | 1Bowl smoothies [1Glass milk + 2spoon oats+ 1table spoon chia seeds + ½ apple Or ½ banana > grind] | 1 glass APPLE shake /BANANA shake [Once a week]
IDLIS: 2-3Rava idli veg stuffed with g. chutney | 2-3Moong dal idli veg stuffed with g. chutney | 2-3Besan idli veg stuffed with g. chutney | 2-3Oats mix rava mix veggies idli with g. chutney | 2-3 Fermented idli veg stuffed with g. chutney

**MID-MORNING (Choose 1):**
- 1 Seasonal fruit allow [150gm] > AFTER 1HOUR > 1 glass lemon shikanji
- 1 Glass low fat buttermilk mix roasted zeera powder + 1 spoon roasted chia / flax seeds
- 1SEASONAL FRUIT [1Apple /1Orange / Mausambi /1Bowl papaya /1pear/ 1guava/ 1 pomegranate with 2-3 drops of lemon]
- 2 slices cucumber + 1 apple
- 2 slices cucumber + 1 pear
- 1 bowl papaya [2 slices of papaya with black pepper]
- 1Pomegranate with 2-3 drops of lemon

**LUNCH - DAILY BASE (MANDATORY):**
1Full plate/bowl green salad (steamed / Grated Raw) + 1medium bowl of low fat buttermilk
CHOOSE 1 OPTION FROM BELOW:

ROTI + VEGETABLES:
1-2 roti bran mix / jawar + 1bowl: lauki veg | tori veg | parwar veg | bhindi veg | kaddu veg | Spinach veg | brinjal bharta | capsicum potato veg | beans potato veg | nutreela capsicum veg | Methi aalu veg | cauliflower aalu veg | matter mushroom veg | saag veg | paneer veg bhurji[homemade paneer] | spring onion aalu veg | beans yellow moong dal veg | carrot peas veg | mix veg | mooli bhurji | Capsicum paneer veg | brinjal potato veg | cabbage peas veg

ROTI + DAL:
1-2 Roti bran mix / jawar + 1bowl: yellow moong dal | arher dal | masoor dal | chana dal | gatte veg without fried

RICE + LEGUMES (MAXIMUM 4-5 DAYS IN 10-DAY PLAN - LIMIT TO 4-5 DAYS ONLY):
1-2 Roti bran mix / jawar / small bowl steam rice + 1bowl: chhole | black chana | rajhma | lobhia | soyabean | kadhi without pakrori

NON VEG OPTIONS (2-3 days/week max):
1medium bowl chicken biryani [no leg pieces] homemade with low fat buttermilk | 1bowl fish curry with steam rice | 4-5 pieces of fish[steam/grilled]with grilled veggies /1-2 roti wheat /tandoori roti /buttermilk | 2Pieces of grilled chicken [100gm][no leg pieces] with g. chutney + buttermilk | 2Egg white curry with steam rice /1-2 roti bran mix

**EVENING SNACK (Choose 1):**
- 1Cup tea /1Cup black coffee/ Black tea /Green tea /1Cup low fat milk /1cup low fat buttermilk
[Optional snack with tea]:
- One handful of Roasted chana or roasted chana mix green salad [twice-thrice a week]
- Dry roasted bajra puffs unsalted [twice a week]
- Dry roasted popcorn [twice-thrice a week]
- Dry roasted makhane [twice-thrice a week]
- 1Smal bowl steam moong sprouts mix green salad [once -twice a week]
- Roasted wheat puffs unsalted [twice-thrice a week]
- 1Small bowl murmura bhel with lots of vegetables [once a week]
- 1Small bowl boiled black chana saute with veggies [once -twice a week]
- 1Veg grilled sandwich with g. chutney [once a week]

**DINNER - MANDATORY BASE:**
1BOWL SOUP[250ml] + Full bowl of green salad chopped or grated[raw/steam]
SOUP OPTIONS: 1Bowl mix veg soup | Tomato soup[250ml] | Cabbage soup | Mushroom soup | French beans tomato soup | Broccoli peas soup | Spinach soup | Chicken soup/ chicken broth

THEN CHOOSE 1 SAME OPTION FROM LUNCH (ROTI+VEG, ROTI+DAL, OR NON-VEG - SAME AS LUNCH OPTIONS)

**POST DINNER - HERBAL DRINK (SAME FOR ALL ${numberOfDays} DAYS - CHOOSE 1 ONLY):**
Select ONE herbal drink and use it for ALL ${numberOfDays} days consistently (NO rotation, NO variation):
- Saunf Water [1spoon saunf seeds + 2glasses of water > boiled till 1glass, consume luke warm]
- Ajwain Water [1 teaspoon ajwain seeds + hot water, consume luke warm]
- Turmeric Water [½ Teaspoon haldi powder + pinch of black pepper + ½ inch ginger + 1Glass water boiled, consume luke warm]
- Hing Water [½ pinch hing + 1Glass warm water]
- Ginger Tea [Adrak Ki Chai — NO milk, fresh ginger + hot water, consume warm]
- Chamomile Tea [NO milk, brew chamomile in hot water, consume warm]

## STRICT MEAL RULES (NEVER VIOLATE):
RULE A - MEAL SEQUENCE (MANDATORY): Present meals in this EXACT sequence EVERY day:
  1. Early Morning → 2. Breakfast → 3. Mid Morning → 4. Lunch → 5. Evening Snack → 6. Dinner → 7. Post Dinner

RULE B - POST DINNER — HERBAL DRINK ONLY (NO ROTATION): Pick ONE herbal drink and use IDENTICAL for ALL ${numberOfDays} days.

RULE C - NO BEDTIME MEAL: Day ends with Post Dinner herbal drink. Nothing after.

RULE D - NO FRUITS AT NIGHT: Fruits ONLY at breakfast, mid-morning, or evening snack. NEVER in dinner or post-dinner.

RULE E - WEIGHT LOSS DIET MODIFICATIONS (IF goal includes weight_loss):
  a) PRE-MEAL WATER: Add in BOTH lunch AND dinner: "Drink 1 glass plain water 30 minutes before this meal"
  b) NO MILK AT NIGHT: No milk, yogurt, curd, or dairy after 7 PM
  c) NO PALAK PANEER for weight loss clients
  d) Light dinners ONLY: Prefer grilled chicken, grilled fish, egg white curry, or light vegetable dinners

RULE F - INDIAN MEALS ONLY: All meals MUST be authentic Indian cuisine.

RULE G - NON-VEG OPTIONS (APPLY ONLY IF diet_type is non_veg or eggetarian):
  - DINNER (2-3 days/week MAX): Grilled or baked chicken with vegetables (NO fried, NO heavy gravies)
  - LUNCH (2-3 days/week): Chicken breast curry or grilled fish with roti/rice
  - EGG WHITE RULE: If client has Diabetes OR High Cholesterol → ONLY egg whites (no whole eggs)

RULE H - CALORIE COMPLIANCE (CRITICAL): 
  EVERY day's total calories MUST be between ${calorieRangeMin} and ${calorieRangeMax} kcal.
  The target is ${targetCalories} kcal/day based on this client's TDEE (${Math.round(tdee)} kcal) and goal (${goals.join(', ') || 'maintenance'}).
  DO NOT use 1200 kcal as a default. If any day falls below ${calorieRangeMin} kcal, increase portion sizes.
  Adjust: larger roti portions, more dal/sabzi, bigger smoothie, extra snack item until target is reached.

RULE I - RICE LIMITATION: Rice meals on EXACTLY 4-5 days ONLY in a 10-day plan.

****CRITICAL VALIDATION**: 
- The meal_plan array must contain EXACTLY ${numberOfDays * 7} meals total (${numberOfDays} days × 7 meals)
- Verify EVERY day from day 1 to day ${numberOfDays} is present
- Daily calorie total MUST be ${calorieRangeMin}–${calorieRangeMax} kcal (NOT 1200, NOT arbitrary)
- Post dinner herbal drink MUST be IDENTICAL for all ${numberOfDays} days
- For weight loss: Include pre-meal water reminder in lunch AND dinner rationale

Return structured JSON with decision_rules, calculations (include target_calories: ${targetCalories}), meal_plan array (ALL ${numberOfDays} days), mpess_integration, and audit_snapshot.`;
}