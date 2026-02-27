import { toast } from "sonner";

export const handleTemplateFileUpload = async (e, base44, user, saveTemplateMutation, setUploadingTemplate) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploadingTemplate(true);
  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          duration: { type: "number" },
          target_calories: { type: "number" },
          food_preference: { type: "string" },
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                meal_type: { type: "string" },
                meal_name: { type: "string" },
                items: { type: "array", items: { type: "string" } },
                portion_sizes: { type: "array", items: { type: "string" } },
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" },
                disease_rationale: { type: "string" }
              }
            }
          },
          tags: { type: "array", items: { type: "string" } }
        }
      }
    });
    if (result.status !== 'success' || !result.output) {
      throw new Error(result.details || 'Failed to extract template data');
    }
    const extracted = Array.isArray(result.output) ? result.output[0] : result.output;
    await saveTemplateMutation.mutateAsync({
      ...extracted,
      is_public: false,
      times_used: 0,
      created_by: user?.email
    });
    toast.success('✅ Template uploaded and saved successfully!');
  } catch (err) {
    toast.error('Failed to upload template: ' + (err.message || 'Unknown error'));
  }
  setUploadingTemplate(false);
  e.target.value = '';
};

export const downloadSampleTemplate = () => {
  const sample = {
    name: "Sample Diabetes 3-Day Plan",
    description: "Disease-specific template for Diabetes Type 2",
    category: "diabetes",
    duration: 3,
    target_calories: 1500,
    food_preference: "veg",
    tags: ["diabetes", "pro", "disease-specific"],
    meals: [
      { day: 1, meal_type: "early_morning", meal_name: "Methi Water", items: ["Methi water"], portion_sizes: ["1 glass"], calories: 5, protein: 0, carbs: 1, fats: 0, disease_rationale: "Fenugreek seeds help lower blood glucose levels" },
      { day: 1, meal_type: "breakfast", meal_name: "Moong Dal Cheela", items: ["Moong dal cheela", "Green chutney"], portion_sizes: ["2 medium", "2 tbsp"], calories: 280, protein: 14, carbs: 38, fats: 6, disease_rationale: "High protein breakfast stabilizes blood sugar" },
      { day: 1, meal_type: "mid_morning", meal_name: "Apple", items: ["Apple"], portion_sizes: ["1 medium (150g)"], calories: 80, protein: 0, carbs: 20, fats: 0, disease_rationale: "Low GI fruit, fiber helps slow glucose absorption" },
      { day: 1, meal_type: "lunch", meal_name: "Roti + Bhindi Veg + Salad", items: ["Bran roti", "Bhindi veg (no oil)", "Green salad", "Low fat buttermilk"], portion_sizes: ["2 medium", "1 bowl", "1 plate", "1 glass"], calories: 420, protein: 14, carbs: 58, fats: 10, disease_rationale: "Okra has anti-diabetic properties, high fiber meal" },
      { day: 1, meal_type: "evening_snack", meal_name: "Green Tea + Roasted Chana", items: ["Green tea", "Roasted chana"], portion_sizes: ["1 cup", "1 handful"], calories: 120, protein: 6, carbs: 16, fats: 3, disease_rationale: "Low glycemic snack with chromium for insulin sensitivity" },
      { day: 1, meal_type: "dinner", meal_name: "Soup + Roti + Lauki Veg", items: ["Mix veg soup", "Bran roti", "Lauki veg", "Green salad"], portion_sizes: ["1 bowl (250ml)", "1-2 medium", "1 bowl", "1 bowl"], calories: 380, protein: 12, carbs: 52, fats: 8, disease_rationale: "Light dinner with high water content vegetable" },
      { day: 1, meal_type: "post_dinner", meal_name: "Saunf Water", items: ["Saunf water"], portion_sizes: ["1 glass luke warm"], calories: 2, protein: 0, carbs: 0, fats: 0, disease_rationale: "Aids digestion, same every night" },
      { day: 2, meal_type: "early_morning", meal_name: "Jeera Water", items: ["Jeera water"], portion_sizes: ["1 glass"], calories: 3, protein: 0, carbs: 0.5, fats: 0, disease_rationale: "Cumin aids digestion and insulin secretion" },
      { day: 2, meal_type: "breakfast", meal_name: "Besan Cheela", items: ["Besan cheela", "Green chutney"], portion_sizes: ["2 medium", "2 tbsp"], calories: 270, protein: 12, carbs: 35, fats: 8, disease_rationale: "Chickpea flour is low GI and high protein" },
      { day: 2, meal_type: "mid_morning", meal_name: "Orange", items: ["Orange"], portion_sizes: ["1 medium (150g)"], calories: 75, protein: 1, carbs: 19, fats: 0, disease_rationale: "Low GI citrus, vitamin C for immunity" },
      { day: 2, meal_type: "lunch", meal_name: "Roti + Spinach Veg + Salad", items: ["Bran roti", "Spinach aalu veg", "Green salad", "Low fat buttermilk"], portion_sizes: ["2 medium", "1 bowl", "1 plate", "1 glass"], calories: 410, protein: 13, carbs: 56, fats: 9, disease_rationale: "Iron-rich spinach supports healthy metabolism" },
      { day: 2, meal_type: "evening_snack", meal_name: "Black Tea + Roasted Chana", items: ["Black tea", "Roasted chana"], portion_sizes: ["1 cup", "1 handful"], calories: 125, protein: 6, carbs: 16, fats: 3, disease_rationale: "Unsweetened tea with low glycemic snack" },
      { day: 2, meal_type: "dinner", meal_name: "Soup + Roti + Tori Veg", items: ["Mix veg soup", "Bran roti", "Tori veg", "Green salad"], portion_sizes: ["1 bowl (250ml)", "1-2 medium", "1 bowl", "1 bowl"], calories: 375, protein: 11, carbs: 51, fats: 8, disease_rationale: "Ridge gourd is low calorie and aids glucose control" },
      { day: 2, meal_type: "post_dinner", meal_name: "Saunf Water", items: ["Saunf water"], portion_sizes: ["1 glass luke warm"], calories: 2, protein: 0, carbs: 0, fats: 0, disease_rationale: "Aids digestion, same every night" },
      { day: 3, meal_type: "early_morning", meal_name: "Lemon Water", items: ["Lemon water"], portion_sizes: ["1 glass"], calories: 8, protein: 0, carbs: 2, fats: 0, disease_rationale: "Alkalizing, helps improve insulin sensitivity" },
      { day: 3, meal_type: "breakfast", meal_name: "Ragi Cheela", items: ["Ragi cheela", "Green chutney"], portion_sizes: ["2 medium", "2 tbsp"], calories: 260, protein: 11, carbs: 36, fats: 7, disease_rationale: "Finger millet is high in fiber and minerals" },
      { day: 3, meal_type: "mid_morning", meal_name: "Pear", items: ["Pear"], portion_sizes: ["1 medium (150g)"], calories: 85, protein: 0.5, carbs: 21, fats: 0, disease_rationale: "Low GI fruit with excellent fiber content" },
      { day: 3, meal_type: "lunch", meal_name: "Roti + Moong Dal + Salad", items: ["Bran roti", "Moong dal", "Green salad", "Low fat buttermilk"], portion_sizes: ["2 medium", "1 bowl", "1 plate", "1 glass"], calories: 405, protein: 16, carbs: 54, fats: 8, disease_rationale: "Moong dal is easily digestible and balances glucose" },
      { day: 3, meal_type: "evening_snack", meal_name: "Green Tea + Roasted Chana", items: ["Green tea", "Roasted chana"], portion_sizes: ["1 cup", "1 handful"], calories: 120, protein: 6, carbs: 16, fats: 3, disease_rationale: "EGCG in green tea improves insulin sensitivity" },
      { day: 3, meal_type: "dinner", meal_name: "Soup + Roti + Brinjal Bharta", items: ["Tomato soup", "Bran roti", "Brinjal bharta", "Green salad"], portion_sizes: ["1 bowl (250ml)", "1-2 medium", "1 bowl", "1 bowl"], calories: 370, protein: 10, carbs: 50, fats: 8, disease_rationale: "Eggplant contains compounds that regulate glucose metabolism" },
      { day: 3, meal_type: "post_dinner", meal_name: "Saunf Water", items: ["Saunf water"], portion_sizes: ["1 glass luke warm"], calories: 2, protein: 0, carbs: 0, fats: 0, disease_rationale: "Aids digestion, same every night" }
    ]
  };
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_pro_template.json';
  a.click();
  URL.revokeObjectURL(url);
};