// Master Data for Meal Planning Engine
// All rule-based, no external APIs

export const dishes = [
  // BREAKFAST DISHES
  { id: 'OATS_001', name: 'Oatmeal with Berries', templateCode: 'BREAKFAST_GRAIN', meal_type: 'breakfast', food_preference: 'veg', cal: 280, protein: 8, carbs: 45, fats: 6, ingredients: ['oats', 'milk', 'blueberries', 'honey'], cooking_time: 15 },
  { id: 'IDLI_001', name: 'Idli with Sambar', templateCode: 'BREAKFAST_GRAIN', meal_type: 'breakfast', food_preference: 'veg', cal: 220, protein: 6, carbs: 42, fats: 2, ingredients: ['rice', 'urad', 'salt'], cooking_time: 20 },
  { id: 'DOSA_001', name: 'Plain Dosa', templateCode: 'BREAKFAST_GRAIN', meal_type: 'breakfast', food_preference: 'veg', cal: 250, protein: 5, carbs: 48, fats: 3, ingredients: ['rice', 'urad', 'salt'], cooking_time: 15 },
  { id: 'PARATHA_001', name: 'Wheat Paratha', templateCode: 'BREAKFAST_GRAIN', meal_type: 'breakfast', food_preference: 'veg', cal: 260, protein: 7, carbs: 40, fats: 8, ingredients: ['wheat', 'ghee', 'salt'], cooking_time: 20 },
  { id: 'UPMA_001', name: 'Semolina Upma', templateCode: 'BREAKFAST_GRAIN', meal_type: 'breakfast', food_preference: 'veg', cal: 240, protein: 6, carbs: 40, fats: 5, ingredients: ['semolina', 'carrot', 'onion', 'oil'], cooking_time: 15 },
  
  // LUNCH DISHES - GRAINS
  { id: 'ROTI_001', name: 'Wheat Roti', templateCode: 'ROTI_PLAIN', meal_type: 'lunch', food_preference: 'veg', cal: 100, protein: 3, carbs: 20, fats: 1, ingredients: ['wheat', 'salt', 'water'], cooking_time: 5 },
  { id: 'RICE_001', name: 'Plain Basmati Rice', templateCode: 'RICE_PLAIN', meal_type: 'lunch', food_preference: 'veg', cal: 130, protein: 3, carbs: 28, fats: 0.3, ingredients: ['basmati rice', 'salt', 'water'], cooking_time: 20 },
  { id: 'KHICHDI_001', name: 'Moong Khichdi', templateCode: 'KHICHDI_BASIC', meal_type: 'lunch', food_preference: 'veg', cal: 220, protein: 8, carbs: 35, fats: 3, ingredients: ['rice', 'moong dal', 'turmeric', 'oil'], cooking_time: 25 },
  
  // LUNCH DISHES - DAL/PROTEIN
  { id: 'DAL_001', name: 'Toor Dal Fry', templateCode: 'DAL_SIMPLE', meal_type: 'lunch', food_preference: 'veg', cal: 180, protein: 12, carbs: 22, fats: 3, ingredients: ['toor dal', 'turmeric', 'cumin', 'oil'], cooking_time: 30 },
  { id: 'CURRY_001', name: 'Paneer Tikka Masala', templateCode: 'CURRY_PANEER', meal_type: 'lunch', food_preference: 'veg', cal: 240, protein: 16, carbs: 8, fats: 16, ingredients: ['paneer', 'tomato', 'cream', 'spices'], cooking_time: 25 },
  { id: 'SAMBAR_001', name: 'Mixed Vegetable Sambar', templateCode: 'SAMBAR_VEG', meal_type: 'lunch', food_preference: 'veg', cal: 160, protein: 8, carbs: 24, fats: 3, ingredients: ['toor dal', 'carrot', 'cabbage', 'tamarind'], cooking_time: 30 },
  
  // LUNCH DISHES - SABZI
  { id: 'SABZI_001', name: 'Bhindi Fry', templateCode: 'SABZI_OKRA', meal_type: 'lunch', food_preference: 'veg', cal: 120, protein: 3, carbs: 18, fats: 4, ingredients: ['okra', 'onion', 'oil', 'spices'], cooking_time: 15 },
  { id: 'SABZI_002', name: 'Cauliflower Fry', templateCode: 'SABZI_GOBI', meal_type: 'lunch', food_preference: 'veg', cal: 140, protein: 4, carbs: 20, fats: 5, ingredients: ['cauliflower', 'onion', 'oil', 'spices'], cooking_time: 15 },
  { id: 'SABZI_003', name: 'Spinach & Cottage Cheese', templateCode: 'SABZI_PALAK', meal_type: 'lunch', food_preference: 'veg', cal: 160, protein: 14, carbs: 8, fats: 8, ingredients: ['spinach', 'paneer', 'cream', 'oil'], cooking_time: 20 },
  
  // DINNER DISHES - GRAINS
  { id: 'ROTI_DINNER_001', name: 'Multigrain Roti', templateCode: 'ROTI_MULTI', meal_type: 'dinner', food_preference: 'veg', cal: 120, protein: 4, carbs: 22, fats: 2, ingredients: ['wheat', 'oats', 'bajra', 'oil'], cooking_time: 8 },
  { id: 'RICE_DINNER_001', name: 'Brown Rice', templateCode: 'RICE_BROWN', meal_type: 'dinner', food_preference: 'veg', cal: 140, protein: 3, carbs: 30, fats: 1, ingredients: ['brown rice', 'salt', 'water'], cooking_time: 25 },
  
  // DINNER DISHES - DAL/PROTEIN
  { id: 'DAL_DINNER_001', name: 'Masoor Dal', templateCode: 'DAL_MASOOR', meal_type: 'dinner', food_preference: 'veg', cal: 170, protein: 13, carbs: 20, fats: 2, ingredients: ['red lentils', 'turmeric', 'oil', 'cumin'], cooking_time: 30 },
  { id: 'CURRY_DINNER_001', name: 'Chickpea Curry', templateCode: 'CURRY_CHANA', meal_type: 'dinner', food_preference: 'veg', cal: 200, protein: 11, carbs: 28, fats: 5, ingredients: ['chickpeas', 'tomato', 'onion', 'spices'], cooking_time: 25 },
  { id: 'KADHI_001', name: 'Gram Flour Kadhi', templateCode: 'KADHI_BESAN', meal_type: 'dinner', food_preference: 'veg', cal: 180, protein: 8, carbs: 20, fats: 8, ingredients: ['gram flour', 'yogurt', 'oil', 'spices'], cooking_time: 20 },
  
  // SNACK DISHES
  { id: 'SNACK_001', name: 'Roasted Chickpeas', templateCode: 'SNACK_LEGUME', meal_type: 'snack', food_preference: 'veg', cal: 160, protein: 8, carbs: 20, fats: 4, ingredients: ['chickpeas', 'spices', 'oil'], cooking_time: 30 },
  { id: 'SNACK_002', name: 'Mixed Nuts & Seeds', templateCode: 'SNACK_NUTS', meal_type: 'snack', food_preference: 'veg', cal: 200, protein: 6, carbs: 15, fats: 14, ingredients: ['almonds', 'walnuts', 'sesame', 'pumpkin seeds'], cooking_time: 0 },
  { id: 'SNACK_003', name: 'Fruit Salad', templateCode: 'SNACK_FRUIT', meal_type: 'snack', food_preference: 'veg', cal: 120, protein: 2, carbs: 30, fats: 0.5, ingredients: ['apple', 'orange', 'banana'], cooking_time: 5 },
];

export const diseaseRules = {
  'pcos': {
    avoid: ['refined_sugar', 'white_bread', 'pastries', 'sugary_drinks', 'processed_foods', 'excess_dairy'],
    emphasize: ['leafy_greens', 'whole_grains', 'lean_protein', 'nuts', 'seeds', 'omega3_fish'],
    cooking: ['minimize_oil', 'grill_bake'],
    mpess: { mind: ['stress_management'], physical: ['30min_walk_daily'], emotional: ['mood_tracking'], social: ['group_activities'], spiritual: ['meditation_10min'] }
  },
  'hypertension': {
    avoid: ['salt', 'processed_meat', 'canned_foods', 'fried_foods', 'butter', 'trans_fats'],
    emphasize: ['potassium_rich', 'low_sodium', 'leafy_greens', 'whole_grains', 'garlic'],
    cooking: ['no_salt', 'herbs_spices_instead'],
    mpess: { mind: ['breathing_exercises'], physical: ['cardio_30min'], emotional: ['stress_relief'], social: [], spiritual: ['yoga'] }
  },
  'liver_disease': {
    avoid: ['fried_foods', 'excess_oil', 'high_fat', 'alcohol', 'processed_foods', 'red_meat'],
    emphasize: ['lean_protein', 'whole_grains', 'vegetables', 'fruits', 'olive_oil'],
    cooking: ['no_deep_frying', 'boil_steam_grill'],
    mpess: { mind: [], physical: ['light_walking'], emotional: ['stress_management'], social: [], spiritual: ['meditation'] }
  },
  'hypothyroid': {
    avoid: ['goitrogenic_foods', 'cruciferous_raw', 'soy', 'excess_fiber_at_meals', 'iron_blockers'],
    emphasize: ['iodine_rich', 'selenium', 'zinc', 'whole_grains', 'lean_meat'],
    medication_interaction: 'Take levothyroxine 30-60 min before food',
    mpess: { mind: ['stress_reduction'], physical: ['regular_exercise'], emotional: [], social: [], spiritual: ['yoga'] }
  },
  'diabetes_type2': {
    avoid: ['simple_carbs', 'sugary_foods', 'fruit_juice', 'white_rice', 'refined_flour'],
    emphasize: ['whole_grains', 'high_fiber', 'lean_protein', 'low_gi_foods'],
    cooking: ['minimize_sugar_salt'],
    mpess: { mind: [], physical: ['45min_exercise_5days'], emotional: ['mood_tracking'], social: [], spiritual: [] }
  }
};

export const bloodMarkerRules = {
  'hba1c': { normal: { min: 0, max: 5.6 }, flag_range: { min: 9, max: 100 }, recommendation: 'Refer to clinician - poor glucose control' },
  'fasting_glucose': { normal: { min: 70, max: 100 }, flag_range: { min: 126, max: 300 }, recommendation: 'High blood sugar - reduce refined carbs' },
  'ldl': { normal: { min: 0, max: 100 }, flag_range: { min: 160, max: 500 }, recommendation: 'High LDL - emphasize soluble fiber, limit saturated fat' },
  'triglycerides': { normal: { min: 0, max: 150 }, flag_range: { min: 200, max: 500 }, recommendation: 'High triglycerides - reduce refined carbs and sugar' },
  'sodium': { normal: { min: 135, max: 145 }, flag_range: { min: 150, max: 200 }, recommendation: 'Reduce sodium intake' }
};

export const mealTemplates = {
  '4_meals': {
    breakfast: 0.20,
    lunch: 0.35,
    snack: 0.15,
    dinner: 0.30
  },
  '5_meals': {
    breakfast: 0.18,
    mid_morning: 0.12,
    lunch: 0.35,
    snack: 0.12,
    dinner: 0.23
  },
  '6_meals': {
    breakfast: 0.15,
    mid_morning: 0.10,
    lunch: 0.30,
    evening_snack: 0.10,
    dinner: 0.25,
    post_dinner: 0.10
  }
};

export const jainRestrictions = ['onion', 'garlic', 'potato', 'mushroom', 'carrot', 'beetroot', 'sweet_potato'];