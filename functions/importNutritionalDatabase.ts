import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── INGREDIENT DATABASE (from Sheet2 of MEALIEAPPDIETPLANNING4.xlsx) ───
const INGREDIENTS_SHEET2 = [
  { ingredient_name: 'Atta Whole Wheat', kcal_100g: 340, protein_100g: 13, carbs_100g: 72, fat_100g: 2.5, density_g_per_ml: 1.0, notes: 'whole wheat flour' },
  { ingredient_name: 'Water', kcal_100g: 0, protein_100g: 0, carbs_100g: 0, fat_100g: 0, density_g_per_ml: 1.0, notes: 'water' },
  { ingredient_name: 'Ghee', kcal_100g: 900, protein_100g: 0, carbs_100g: 0, fat_100g: 100, density_g_per_ml: 0.91, notes: 'ghee' },
  { ingredient_name: 'Oil', kcal_100g: 900, protein_100g: 0, carbs_100g: 0, fat_100g: 100, density_g_per_ml: 0.92, notes: 'generic cooking oil' },
  { ingredient_name: 'Potato', kcal_100g: 77, protein_100g: 2, carbs_100g: 17, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw potato' },
  { ingredient_name: 'Rice Raw', kcal_100g: 360, protein_100g: 7, carbs_100g: 79, fat_100g: 0.5, density_g_per_ml: 1.0, notes: 'raw rice' },
  { ingredient_name: 'Moong Dal', kcal_100g: 347, protein_100g: 24, carbs_100g: 59, fat_100g: 1.2, density_g_per_ml: 1.0, notes: 'split moong lentil' },
  { ingredient_name: 'Chana Dal', kcal_100g: 360, protein_100g: 20, carbs_100g: 60, fat_100g: 5, density_g_per_ml: 1.0, notes: 'split chickpea' },
  { ingredient_name: 'Arhar Dal', kcal_100g: 343, protein_100g: 22, carbs_100g: 57, fat_100g: 1.7, density_g_per_ml: 1.0, notes: 'toor/pigeon pea dal' },
  { ingredient_name: 'Masoor Dal', kcal_100g: 353, protein_100g: 26, carbs_100g: 60, fat_100g: 0.7, density_g_per_ml: 1.0, notes: 'red lentil' },
  { ingredient_name: 'Rajma', kcal_100g: 333, protein_100g: 22, carbs_100g: 60, fat_100g: 1.5, density_g_per_ml: 1.0, notes: 'kidney beans raw' },
  { ingredient_name: 'Chole / Chickpea', kcal_100g: 364, protein_100g: 19, carbs_100g: 61, fat_100g: 6, density_g_per_ml: 1.0, notes: 'dried chickpeas' },
  { ingredient_name: 'Soyabean', kcal_100g: 446, protein_100g: 36, carbs_100g: 30, fat_100g: 20, density_g_per_ml: 1.0, notes: 'dried soya bean' },
  { ingredient_name: 'Milk Low Fat', kcal_100g: 42, protein_100g: 3.4, carbs_100g: 5, fat_100g: 1, density_g_per_ml: 1.03, notes: 'low fat cow milk' },
  { ingredient_name: 'Paneer Homemade', kcal_100g: 265, protein_100g: 18, carbs_100g: 3, fat_100g: 20, density_g_per_ml: 1.0, notes: 'homemade paneer' },
  { ingredient_name: 'Curd / Yogurt Low Fat', kcal_100g: 60, protein_100g: 3.5, carbs_100g: 4.5, fat_100g: 1.5, density_g_per_ml: 1.0, notes: 'low fat curd' },
  { ingredient_name: 'Besan', kcal_100g: 360, protein_100g: 22, carbs_100g: 58, fat_100g: 5, density_g_per_ml: 1.0, notes: 'gram flour/chickpea flour' },
  { ingredient_name: 'Suji / Semolina', kcal_100g: 360, protein_100g: 12, carbs_100g: 73, fat_100g: 1, density_g_per_ml: 1.0, notes: 'semolina/rava' },
  { ingredient_name: 'Oats', kcal_100g: 389, protein_100g: 17, carbs_100g: 66, fat_100g: 7, density_g_per_ml: 1.0, notes: 'rolled oats' },
  { ingredient_name: 'Ragi / Finger Millet', kcal_100g: 336, protein_100g: 7, carbs_100g: 72, fat_100g: 1.9, density_g_per_ml: 1.0, notes: 'finger millet' },
  { ingredient_name: 'Bajra / Pearl Millet', kcal_100g: 361, protein_100g: 11, carbs_100g: 67, fat_100g: 5, density_g_per_ml: 1.0, notes: 'pearl millet' },
  { ingredient_name: 'Jowar / Sorghum', kcal_100g: 349, protein_100g: 10, carbs_100g: 73, fat_100g: 1.9, density_g_per_ml: 1.0, notes: 'sorghum' },
  { ingredient_name: 'Barley', kcal_100g: 354, protein_100g: 12, carbs_100g: 73, fat_100g: 2.3, density_g_per_ml: 1.0, notes: 'barley grain' },
  { ingredient_name: 'Daliya / Broken Wheat', kcal_100g: 342, protein_100g: 12, carbs_100g: 74, fat_100g: 1.5, density_g_per_ml: 1.0, notes: 'broken wheat' },
  { ingredient_name: 'Poha / Beaten Rice', kcal_100g: 370, protein_100g: 7, carbs_100g: 80, fat_100g: 1, density_g_per_ml: 1.0, notes: 'flattened rice' },
  { ingredient_name: 'Bread Whole Wheat', kcal_100g: 247, protein_100g: 9, carbs_100g: 49, fat_100g: 3, density_g_per_ml: 1.0, notes: 'whole wheat bread slice' },
  { ingredient_name: 'Onion', kcal_100g: 40, protein_100g: 1.1, carbs_100g: 9.3, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw onion' },
  { ingredient_name: 'Tomato', kcal_100g: 18, protein_100g: 0.9, carbs_100g: 3.9, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'raw tomato' },
  { ingredient_name: 'Spinach / Palak', kcal_100g: 23, protein_100g: 2.9, carbs_100g: 3.6, fat_100g: 0.4, density_g_per_ml: 1.0, notes: 'raw spinach' },
  { ingredient_name: 'Lauki / Bottle Gourd', kcal_100g: 15, protein_100g: 0.6, carbs_100g: 3.4, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'bottle gourd' },
  { ingredient_name: 'Bhindi / Okra', kcal_100g: 33, protein_100g: 2, carbs_100g: 7.5, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'lady finger' },
  { ingredient_name: 'Brinjal / Eggplant', kcal_100g: 25, protein_100g: 1, carbs_100g: 5.9, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'eggplant/baingan' },
  { ingredient_name: 'Cauliflower', kcal_100g: 25, protein_100g: 2, carbs_100g: 5, fat_100g: 0.3, density_g_per_ml: 1.0, notes: 'raw cauliflower' },
  { ingredient_name: 'Cabbage', kcal_100g: 25, protein_100g: 1.3, carbs_100g: 5.8, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw cabbage' },
  { ingredient_name: 'Carrot', kcal_100g: 41, protein_100g: 0.9, carbs_100g: 9.6, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'raw carrot' },
  { ingredient_name: 'Peas / Matar', kcal_100g: 81, protein_100g: 5.4, carbs_100g: 14, fat_100g: 0.4, density_g_per_ml: 1.0, notes: 'fresh green peas' },
  { ingredient_name: 'Capsicum / Bell Pepper', kcal_100g: 31, protein_100g: 1, carbs_100g: 7, fat_100g: 0.3, density_g_per_ml: 1.0, notes: 'bell pepper' },
  { ingredient_name: 'Mushroom', kcal_100g: 22, protein_100g: 3.1, carbs_100g: 3.3, fat_100g: 0.3, density_g_per_ml: 1.0, notes: 'button mushroom' },
  { ingredient_name: 'Cucumber', kcal_100g: 15, protein_100g: 0.7, carbs_100g: 3.6, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw cucumber' },
  { ingredient_name: 'Methi / Fenugreek Leaves', kcal_100g: 49, protein_100g: 4.4, carbs_100g: 6, fat_100g: 0.9, density_g_per_ml: 1.0, notes: 'fenugreek leaves' },
  { ingredient_name: 'Radish / Mooli', kcal_100g: 16, protein_100g: 0.7, carbs_100g: 3.4, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw radish' },
  { ingredient_name: 'Green Beans / French Beans', kcal_100g: 31, protein_100g: 1.8, carbs_100g: 7, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'green beans' },
  { ingredient_name: 'Apple', kcal_100g: 52, protein_100g: 0.3, carbs_100g: 14, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'raw apple with skin' },
  { ingredient_name: 'Banana', kcal_100g: 89, protein_100g: 1.1, carbs_100g: 23, fat_100g: 0.3, density_g_per_ml: 1.0, notes: 'ripe banana' },
  { ingredient_name: 'Papaya', kcal_100g: 43, protein_100g: 0.5, carbs_100g: 11, fat_100g: 0.3, density_g_per_ml: 1.0, notes: 'ripe papaya' },
  { ingredient_name: 'Orange', kcal_100g: 47, protein_100g: 0.9, carbs_100g: 12, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw orange' },
  { ingredient_name: 'Pomegranate', kcal_100g: 83, protein_100g: 1.7, carbs_100g: 19, fat_100g: 1.2, density_g_per_ml: 1.0, notes: 'pomegranate arils' },
  { ingredient_name: 'Guava', kcal_100g: 68, protein_100g: 2.6, carbs_100g: 14, fat_100g: 1, density_g_per_ml: 1.0, notes: 'raw guava' },
  { ingredient_name: 'Pear', kcal_100g: 57, protein_100g: 0.4, carbs_100g: 15, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw pear' },
  { ingredient_name: 'Chicken Breast', kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, density_g_per_ml: 1.0, notes: 'raw chicken breast no skin' },
  { ingredient_name: 'Fish', kcal_100g: 130, protein_100g: 22, carbs_100g: 0, fat_100g: 4.5, density_g_per_ml: 1.0, notes: 'generic white fish' },
  { ingredient_name: 'Egg White', kcal_100g: 52, protein_100g: 11, carbs_100g: 0.7, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'egg white only' },
  { ingredient_name: 'Egg Whole', kcal_100g: 155, protein_100g: 13, carbs_100g: 1.1, fat_100g: 11, density_g_per_ml: 1.0, notes: 'whole hen egg' },
  { ingredient_name: 'Peanut Butter', kcal_100g: 588, protein_100g: 25, carbs_100g: 20, fat_100g: 50, density_g_per_ml: 1.0, notes: 'natural peanut butter' },
  { ingredient_name: 'Chia Seeds', kcal_100g: 486, protein_100g: 17, carbs_100g: 42, fat_100g: 31, density_g_per_ml: 1.0, notes: 'dried chia seeds' },
  { ingredient_name: 'Flax Seeds', kcal_100g: 534, protein_100g: 18, carbs_100g: 29, fat_100g: 42, density_g_per_ml: 1.0, notes: 'ground flax seeds' },
  { ingredient_name: 'Roasted Chana', kcal_100g: 400, protein_100g: 22, carbs_100g: 58, fat_100g: 7, density_g_per_ml: 1.0, notes: 'roasted chickpeas' },
  { ingredient_name: 'Makhana / Fox Nuts', kcal_100g: 347, protein_100g: 9.7, carbs_100g: 76, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'lotus seeds roasted' },
  { ingredient_name: 'Lemon Juice', kcal_100g: 29, protein_100g: 1.1, carbs_100g: 9.3, fat_100g: 0.3, density_g_per_ml: 1.01, notes: 'fresh lemon juice' },
  { ingredient_name: 'Ginger', kcal_100g: 80, protein_100g: 1.8, carbs_100g: 18, fat_100g: 0.8, density_g_per_ml: 1.0, notes: 'raw ginger root' },
  { ingredient_name: 'Garlic', kcal_100g: 149, protein_100g: 6.4, carbs_100g: 33, fat_100g: 0.5, density_g_per_ml: 1.0, notes: 'raw garlic' },
  { ingredient_name: 'Green Chilli', kcal_100g: 40, protein_100g: 2, carbs_100g: 9.5, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'raw green chilli' },
  { ingredient_name: 'Coriander Leaves', kcal_100g: 23, protein_100g: 2.1, carbs_100g: 3.7, fat_100g: 0.5, density_g_per_ml: 1.0, notes: 'fresh coriander/cilantro' },
  { ingredient_name: 'Mint Leaves', kcal_100g: 70, protein_100g: 3.7, carbs_100g: 15, fat_100g: 0.9, density_g_per_ml: 1.0, notes: 'fresh mint' },
  { ingredient_name: 'Aloe Vera Juice', kcal_100g: 4, protein_100g: 0, carbs_100g: 0.9, fat_100g: 0, density_g_per_ml: 1.0, notes: 'raw aloe vera juice' },
  { ingredient_name: 'Zeera / Cumin Seeds', kcal_100g: 375, protein_100g: 18, carbs_100g: 44, fat_100g: 22, density_g_per_ml: 1.0, notes: 'cumin seeds' },
  { ingredient_name: 'Saunf / Fennel Seeds', kcal_100g: 345, protein_100g: 15.8, carbs_100g: 52, fat_100g: 15, density_g_per_ml: 1.0, notes: 'fennel seeds' },
  { ingredient_name: 'Methi Seeds', kcal_100g: 323, protein_100g: 23, carbs_100g: 58, fat_100g: 6, density_g_per_ml: 1.0, notes: 'fenugreek seeds' },
  { ingredient_name: 'Haldi / Turmeric', kcal_100g: 354, protein_100g: 8, carbs_100g: 65, fat_100g: 10, density_g_per_ml: 1.0, notes: 'turmeric powder' },
  { ingredient_name: 'Cinnamon', kcal_100g: 247, protein_100g: 4, carbs_100g: 81, fat_100g: 1.2, density_g_per_ml: 1.0, notes: 'cinnamon powder' },
  { ingredient_name: 'Apple Cider Vinegar', kcal_100g: 22, protein_100g: 0, carbs_100g: 0.9, fat_100g: 0, density_g_per_ml: 1.0, notes: 'ACV' },
  { ingredient_name: 'Nutreela / Soya Chunks', kcal_100g: 345, protein_100g: 52, carbs_100g: 33, fat_100g: 0.5, density_g_per_ml: 1.0, notes: 'textured soy protein' },
  { ingredient_name: 'Green Salad Mix', kcal_100g: 20, protein_100g: 1.5, carbs_100g: 3.5, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'mixed leafy greens' },
  { ingredient_name: 'Buttermilk Low Fat', kcal_100g: 40, protein_100g: 3.3, carbs_100g: 4.8, fat_100g: 0.9, density_g_per_ml: 1.03, notes: 'low fat chaas' },
  { ingredient_name: 'Tea Leaves', kcal_100g: 1, protein_100g: 0.1, carbs_100g: 0.3, fat_100g: 0, density_g_per_ml: 1.0, notes: 'brewed tea' },
  { ingredient_name: 'Broccoli', kcal_100g: 34, protein_100g: 2.8, carbs_100g: 7, fat_100g: 0.4, density_g_per_ml: 1.0, notes: 'raw broccoli' },
  { ingredient_name: 'Spring Onion', kcal_100g: 32, protein_100g: 1.8, carbs_100g: 7.3, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'raw spring onion' },
  { ingredient_name: 'Kaddu / Pumpkin', kcal_100g: 26, protein_100g: 1, carbs_100g: 6.5, fat_100g: 0.1, density_g_per_ml: 1.0, notes: 'raw pumpkin' },
  { ingredient_name: 'Tori / Ridge Gourd', kcal_100g: 20, protein_100g: 0.5, carbs_100g: 4.4, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'ridge gourd' },
  { ingredient_name: 'Parwar / Pointed Gourd', kcal_100g: 20, protein_100g: 2, carbs_100g: 2.2, fat_100g: 0.3, density_g_per_ml: 1.0, notes: 'pointed gourd' },
  { ingredient_name: 'Saag Mix', kcal_100g: 25, protein_100g: 2.5, carbs_100g: 4, fat_100g: 0.4, density_g_per_ml: 1.0, notes: 'mixed greens saag' },
  { ingredient_name: 'Lobhia / Black Eyed Peas', kcal_100g: 336, protein_100g: 24, carbs_100g: 60, fat_100g: 1.3, density_g_per_ml: 1.0, notes: 'dried cowpea' },
  { ingredient_name: 'Black Chana', kcal_100g: 364, protein_100g: 19, carbs_100g: 63, fat_100g: 6, density_g_per_ml: 1.0, notes: 'kala chana dried' },
  { ingredient_name: 'Moong Sprouts', kcal_100g: 30, protein_100g: 3, carbs_100g: 5.9, fat_100g: 0.2, density_g_per_ml: 1.0, notes: 'sprouted mung beans' },
  { ingredient_name: 'Soya Sprouts', kcal_100g: 81, protein_100g: 13, carbs_100g: 9.6, fat_100g: 0.5, density_g_per_ml: 1.0, notes: 'sprouted soya beans' }
];

// ─── RECIPE TEMPLATES (from Sheet1 of MEALIEAPPDIETPLANNING4.xlsx) ───
const RECIPE_TEMPLATES = [
  {
    dish_name: 'Roti',
    template_code: 'ROTI_PLAIN',
    portion_label: 'roti_medium',
    default_servings: 1,
    cooking_method: 'tawa_dry',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Atta Whole Wheat', qty: 30, unit: 'g' },
      { ingredient_name: 'Water', qty: 20, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Ghee Roti',
    template_code: 'ROTI_GHEE',
    portion_label: 'roti_medium',
    default_servings: 1,
    cooking_method: 'tawa_ghee',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Atta Whole Wheat', qty: 30, unit: 'g' },
      { ingredient_name: 'Ghee', qty: 2.5, unit: 'ml' },
      { ingredient_name: 'Water', qty: 20, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Plain Paratha',
    template_code: 'PARATHA_TAWA',
    portion_label: 'piece_80g',
    default_servings: 1,
    cooking_method: 'tawa_shallow_fry',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Atta Whole Wheat', qty: 30, unit: 'g' },
      { ingredient_name: 'Oil', qty: 2.5, unit: 'ml' },
      { ingredient_name: 'Water', qty: 25, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Aloo Paratha',
    template_code: 'PARATHA_ALOO',
    portion_label: 'piece_120g',
    default_servings: 1,
    cooking_method: 'stuffed_shallow_fry',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Atta Whole Wheat', qty: 30, unit: 'g' },
      { ingredient_name: 'Potato', qty: 70, unit: 'g' },
      { ingredient_name: 'Oil', qty: 2.5, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Plain Rice',
    template_code: 'RICE_PLAIN',
    portion_label: 'bowl_rice_200g',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Rice Raw', qty: 50, unit: 'g' },
      { ingredient_name: 'Water', qty: 120, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Moong Dal',
    template_code: 'DAL_MOONG',
    portion_label: 'bowl_dal_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Moong Dal', qty: 40, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Arhar Dal',
    template_code: 'DAL_ARHAR',
    portion_label: 'bowl_dal_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Arhar Dal', qty: 40, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 25, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Masoor Dal',
    template_code: 'DAL_MASOOR',
    portion_label: 'bowl_dal_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Masoor Dal', qty: 40, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 25, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Chana Dal',
    template_code: 'DAL_CHANA',
    portion_label: 'bowl_dal_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Chana Dal', qty: 40, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Rajma',
    template_code: 'LEGUME_RAJMA',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Rajma', qty: 45, unit: 'g' },
      { ingredient_name: 'Onion', qty: 30, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 30, unit: 'g' },
      { ingredient_name: 'Oil', qty: 5, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Chole',
    template_code: 'LEGUME_CHOLE',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Chole / Chickpea', qty: 45, unit: 'g' },
      { ingredient_name: 'Onion', qty: 30, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 30, unit: 'g' },
      { ingredient_name: 'Oil', qty: 5, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Vegetable Poha',
    template_code: 'POHA_VEG',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'tawa_dry',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Poha / Beaten Rice', qty: 60, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 15, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' },
      { ingredient_name: 'Peas / Matar', qty: 20, unit: 'g' },
      { ingredient_name: 'Coriander Leaves', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Vegetable Upma',
    template_code: 'UPMA_VEG',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'tawa_sauté',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Suji / Semolina', qty: 50, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 15, unit: 'g' },
      { ingredient_name: 'Oil', qty: 5, unit: 'ml' },
      { ingredient_name: 'Carrot', qty: 15, unit: 'g' },
      { ingredient_name: 'Peas / Matar', qty: 15, unit: 'g' }
    ]
  },
  {
    dish_name: 'Besan Cheela',
    template_code: 'CHEELA_BESAN',
    portion_label: 'piece_80g',
    default_servings: 1,
    cooking_method: 'tawa_dry',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Besan', qty: 40, unit: 'g' },
      { ingredient_name: 'Onion', qty: 15, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 15, unit: 'g' },
      { ingredient_name: 'Green Chilli', qty: 5, unit: 'g' },
      { ingredient_name: 'Coriander Leaves', qty: 5, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Oats Porridge',
    template_code: 'OATS_PORRIDGE',
    portion_label: 'bowl_200g',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Oats', qty: 50, unit: 'g' },
      { ingredient_name: 'Milk Low Fat', qty: 150, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Vegetable Daliya',
    template_code: 'DALIYA_VEG',
    portion_label: 'bowl_200g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Daliya / Broken Wheat', qty: 50, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Carrot', qty: 20, unit: 'g' },
      { ingredient_name: 'Peas / Matar', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Egg White Omelette',
    template_code: 'EGG_WHITE_OMELETTE',
    portion_label: 'piece_large',
    default_servings: 1,
    cooking_method: 'tawa_dry',
    meal_type: 'breakfast',
    food_preference: 'egg',
    ingredients: [
      { ingredient_name: 'Egg White', qty: 120, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Capsicum / Bell Pepper', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Grilled Chicken',
    template_code: 'CHICKEN_GRILLED',
    portion_label: 'piece_100g',
    default_servings: 1,
    cooking_method: 'grilled',
    meal_type: 'dinner',
    food_preference: 'non_veg',
    ingredients: [
      { ingredient_name: 'Chicken Breast', qty: 100, unit: 'g' },
      { ingredient_name: 'Lemon Juice', qty: 10, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Grilled Fish',
    template_code: 'FISH_GRILLED',
    portion_label: 'piece_150g',
    default_servings: 1,
    cooking_method: 'grilled',
    meal_type: 'dinner',
    food_preference: 'non_veg',
    ingredients: [
      { ingredient_name: 'Fish', qty: 150, unit: 'g' },
      { ingredient_name: 'Lemon Juice', qty: 10, unit: 'ml' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Green Salad',
    template_code: 'SALAD_GREEN',
    portion_label: 'full_plate',
    default_servings: 1,
    cooking_method: 'raw',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Cucumber', qty: 50, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 40, unit: 'g' },
      { ingredient_name: 'Carrot', qty: 30, unit: 'g' },
      { ingredient_name: 'Cabbage', qty: 30, unit: 'g' },
      { ingredient_name: 'Coriander Leaves', qty: 5, unit: 'g' },
      { ingredient_name: 'Lemon Juice', qty: 5, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Low Fat Buttermilk',
    template_code: 'BUTTERMILK_LF',
    portion_label: 'glass_200ml',
    default_servings: 1,
    cooking_method: 'mixed',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Buttermilk Low Fat', qty: 200, unit: 'ml' },
      { ingredient_name: 'Zeera / Cumin Seeds', qty: 1, unit: 'g' }
    ]
  },
  {
    dish_name: 'Paneer Bhurji',
    template_code: 'PANEER_BHURJI',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'tawa_sauté',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Paneer Homemade', qty: 80, unit: 'g' },
      { ingredient_name: 'Onion', qty: 25, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 25, unit: 'g' },
      { ingredient_name: 'Capsicum / Bell Pepper', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Spinach Sabzi',
    template_code: 'SABZI_SPINACH',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'tawa_sauté',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Spinach / Palak', qty: 150, unit: 'g' },
      { ingredient_name: 'Onion', qty: 25, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Bhindi Sabzi',
    template_code: 'SABZI_BHINDI',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'tawa_sauté',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Bhindi / Okra', qty: 120, unit: 'g' },
      { ingredient_name: 'Onion', qty: 25, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 4, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Mix Veg Soup',
    template_code: 'SOUP_MIXVEG',
    portion_label: 'bowl_250ml',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'dinner',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Carrot', qty: 40, unit: 'g' },
      { ingredient_name: 'Cabbage', qty: 30, unit: 'g' },
      { ingredient_name: 'Peas / Matar', qty: 20, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 30, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' }
    ]
  },
  {
    dish_name: 'Tomato Soup',
    template_code: 'SOUP_TOMATO',
    portion_label: 'bowl_250ml',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'dinner',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Tomato', qty: 150, unit: 'g' },
      { ingredient_name: 'Onion', qty: 20, unit: 'g' },
      { ingredient_name: 'Oil', qty: 2, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Roasted Makhana',
    template_code: 'SNACK_MAKHANA',
    portion_label: 'bowl_25g',
    default_servings: 1,
    cooking_method: 'dry_roasted',
    meal_type: 'evening_snack',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Makhana / Fox Nuts', qty: 25, unit: 'g' }
    ]
  },
  {
    dish_name: 'Roasted Chana',
    template_code: 'SNACK_CHANA',
    portion_label: 'handful_30g',
    default_servings: 1,
    cooking_method: 'dry_roasted',
    meal_type: 'evening_snack',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Roasted Chana', qty: 30, unit: 'g' }
    ]
  },
  {
    dish_name: 'Moong Sprouts Salad',
    template_code: 'SPROUTS_MOONG',
    portion_label: 'bowl_100g',
    default_servings: 1,
    cooking_method: 'steamed',
    meal_type: 'evening_snack',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Moong Sprouts', qty: 80, unit: 'g' },
      { ingredient_name: 'Cucumber', qty: 30, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 20, unit: 'g' },
      { ingredient_name: 'Lemon Juice', qty: 5, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Lemon Ginger Water',
    template_code: 'DETOX_LEMON_GINGER',
    portion_label: 'glass_300ml',
    default_servings: 1,
    cooking_method: 'mixed',
    meal_type: 'early_morning',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Water', qty: 250, unit: 'ml' },
      { ingredient_name: 'Lemon Juice', qty: 15, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' },
      { ingredient_name: 'Mint Leaves', qty: 3, unit: 'g' }
    ]
  },
  {
    dish_name: 'Methi Water',
    template_code: 'DETOX_METHI',
    portion_label: 'glass_200ml',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'early_morning',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Methi Seeds', qty: 5, unit: 'g' },
      { ingredient_name: 'Water', qty: 200, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Haldi Water',
    template_code: 'DETOX_HALDI',
    portion_label: 'glass_200ml',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'early_morning',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Water', qty: 200, unit: 'ml' },
      { ingredient_name: 'Haldi / Turmeric', qty: 2, unit: 'g' },
      { ingredient_name: 'Ginger', qty: 3, unit: 'g' }
    ]
  },
  {
    dish_name: 'ACV Water',
    template_code: 'DETOX_ACV',
    portion_label: 'glass_220ml',
    default_servings: 1,
    cooking_method: 'mixed',
    meal_type: 'early_morning',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Apple Cider Vinegar', qty: 20, unit: 'ml' },
      { ingredient_name: 'Water', qty: 200, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Saunf Water',
    template_code: 'HERBAL_SAUNF',
    portion_label: 'glass_200ml',
    default_servings: 1,
    cooking_method: 'boiled',
    meal_type: 'early_morning',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Saunf / Fennel Seeds', qty: 5, unit: 'g' },
      { ingredient_name: 'Water', qty: 200, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Chia Seeds Water',
    template_code: 'DETOX_CHIA',
    portion_label: 'glass_250ml',
    default_servings: 1,
    cooking_method: 'soaked',
    meal_type: 'early_morning',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Chia Seeds', qty: 10, unit: 'g' },
      { ingredient_name: 'Water', qty: 250, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Moong Dal Cheela',
    template_code: 'CHEELA_MOONG',
    portion_label: 'piece_80g',
    default_servings: 1,
    cooking_method: 'tawa_dry',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Moong Dal', qty: 40, unit: 'g' },
      { ingredient_name: 'Onion', qty: 15, unit: 'g' },
      { ingredient_name: 'Green Chilli', qty: 5, unit: 'g' },
      { ingredient_name: 'Coriander Leaves', qty: 5, unit: 'g' },
      { ingredient_name: 'Oil', qty: 3, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Fruit Yogurt Bowl',
    template_code: 'YOGURT_FRUIT',
    portion_label: 'bowl_200g',
    default_servings: 1,
    cooking_method: 'mixed',
    meal_type: 'breakfast',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Curd / Yogurt Low Fat', qty: 150, unit: 'g' },
      { ingredient_name: 'Apple', qty: 60, unit: 'g' },
      { ingredient_name: 'Chia Seeds', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Soya Chunk Sabzi',
    template_code: 'SABZI_SOYA',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'tawa_sauté',
    meal_type: 'any',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Nutreela / Soya Chunks', qty: 40, unit: 'g' },
      { ingredient_name: 'Onion', qty: 25, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 30, unit: 'g' },
      { ingredient_name: 'Capsicum / Bell Pepper', qty: 25, unit: 'g' },
      { ingredient_name: 'Oil', qty: 4, unit: 'ml' }
    ]
  },
  {
    dish_name: 'Lobhia',
    template_code: 'LEGUME_LOBHIA',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Lobhia / Black Eyed Peas', qty: 45, unit: 'g' },
      { ingredient_name: 'Onion', qty: 25, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 25, unit: 'g' },
      { ingredient_name: 'Oil', qty: 4, unit: 'ml' },
      { ingredient_name: 'Ginger', qty: 5, unit: 'g' }
    ]
  },
  {
    dish_name: 'Black Chana',
    template_code: 'LEGUME_BLACK_CHANA',
    portion_label: 'bowl_150g',
    default_servings: 1,
    cooking_method: 'pressure_cooked',
    meal_type: 'lunch',
    food_preference: 'veg',
    ingredients: [
      { ingredient_name: 'Black Chana', qty: 45, unit: 'g' },
      { ingredient_name: 'Onion', qty: 25, unit: 'g' },
      { ingredient_name: 'Tomato', qty: 25, unit: 'g' },
      { ingredient_name: 'Oil', qty: 4, unit: 'ml' }
    ]
  }
];

// ─── NUTRITION CALCULATOR ───
function calculateNutrition(ingredients, ingredientDB) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, fibre = 0, sodium = 0, potassium = 0;

  for (const ing of ingredients) {
    const dbEntry = ingredientDB.find(
      d => d.ingredient_name.toLowerCase() === ing.ingredient_name.toLowerCase()
    );
    if (!dbEntry) continue;

    let grams = ing.qty;
    // Convert ml to grams using density
    if (ing.unit === 'ml' && dbEntry.density_g_per_ml) {
      grams = ing.qty * dbEntry.density_g_per_ml;
    }

    const factor = grams / 100;
    kcal     += (dbEntry.kcal_100g || 0) * factor;
    protein  += (dbEntry.protein_100g || 0) * factor;
    carbs    += (dbEntry.carbs_100g || 0) * factor;
    fat      += (dbEntry.fat_100g || 0) * factor;
    fibre    += (dbEntry.fibre_100g || 0) * factor;
    sodium   += (dbEntry.sodium_mg_100g || 0) * factor;
    potassium += (dbEntry.potassium_mg_100g || 0) * factor;
  }

  return {
    kcal: Math.round(kcal * 10) / 10,
    protein_g: Math.round(protein * 10) / 10,
    carbs_g: Math.round(carbs * 10) / 10,
    fat_g: Math.round(fat * 10) / 10,
    fibre_g: Math.round(fibre * 10) / 10,
    sodium_mg: Math.round(sodium * 10) / 10,
    potassium_mg: Math.round(potassium * 10) / 10,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'ingredients'; // 'ingredients' | 'recipes' | 'all'

    const results = { ingredients: 0, recipes: 0, errors: [] };

    // ─── STEP 1: Import Ingredients ───
    if (mode === 'ingredients' || mode === 'all') {
      for (const ing of INGREDIENTS_SHEET2) {
        try {
          // Check if already exists
          const existing = await base44.asServiceRole.entities.NutritionalIngredient.filter({
            ingredient_name: ing.ingredient_name
          });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.NutritionalIngredient.update(existing[0].id, ing);
          } else {
            await base44.asServiceRole.entities.NutritionalIngredient.create(ing);
          }
          results.ingredients++;
        } catch (e) {
          results.errors.push(`Ingredient ${ing.ingredient_name}: ${e.message}`);
        }
      }
    }

    // ─── STEP 2: Import Recipes with calculated nutrition ───
    if (mode === 'recipes' || mode === 'all') {
      for (const recipe of RECIPE_TEMPLATES) {
        try {
          const nutrition = calculateNutrition(recipe.ingredients, INGREDIENTS_SHEET2);
          const recipeWithNutrition = {
            ...recipe,
            calculated_nutrition_per_serving: nutrition,
            is_active: true,
          };

          const existing = await base44.asServiceRole.entities.RecipeTemplate.filter({
            template_code: recipe.template_code
          });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.RecipeTemplate.update(existing[0].id, recipeWithNutrition);
          } else {
            await base44.asServiceRole.entities.RecipeTemplate.create(recipeWithNutrition);
          }
          results.recipes++;
        } catch (e) {
          results.errors.push(`Recipe ${recipe.dish_name}: ${e.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Import complete. Ingredients: ${results.ingredients}, Recipes: ${results.recipes}`,
      results,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});