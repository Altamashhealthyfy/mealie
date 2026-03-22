import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const mealOptions = {
  earlyMorning: [
    "Warm lemon water with honey",
    "Warm turmeric with ginger",
    "Herbal tea (green tea or black tea)",
    "Coconut water",
    "Fresh fruit (papaya, orange, or apple)"
  ],
  breakfast: [
    "Oats upma with vegetables",
    "Vegetable dosa with sambar",
    "Multigrain toast with cottage cheese",
    "Poha with vegetables and peanuts",
    "Vegetable idli with sambar",
    "Whole wheat roti with dal",
    "Egg white omelette with vegetables (diabetes/hyperlipidemia)",
    "Boiled eggs with whole wheat toast (non-veg option)"
  ],
  midMorning: [
    "Greek yogurt with berries",
    "Mixed nuts (almonds, walnuts)",
    "Fresh seasonal fruit",
    "Vegetable juice (carrot, beetroot, cucumber)",
    "Cucumber slices with lemon and salt",
    "Sprouts salad",
    "Roasted chickpeas"
  ],
  lunch: [
    "Dal rice with steamed vegetables",
    "Rajma rice with cucumber salad",
    "Chhole rice with onions and lemon",
    "Vegetable khichdi",
    "Kadhi with rice",
    "Veg mixed paneer pulao",
    "Roti with dal and seasonal vegetables",
    "Grilled chicken breast curry with brown rice (non-veg option)",
    "Chicken breast biryani (non-veg option)",
    "Grilled chicken with roasted vegetables (non-veg option)"
  ],
  eveningSnacks: [
    "Roasted makhana with minimal salt",
    "Vegetable soup (clear broth)",
    "Mixed vegetable snack (boiled corn, carrots, beans)",
    "Homemade vegetable chikhalwali",
    "Sprouts with lemon",
    "Mixed dry fruits (limited portion)",
    "Vegetable bhel (minimal oil)",
    "Boiled chickpeas with lemon (non-veg friendly)"
  ],
  dinner: [
    "Grilled fish with steamed broccoli and carrots",
    "Baked fish with herbs and lemon",
    "Grilled chicken with roasted vegetables",
    "Grilled chicken breast with mixed vegetables",
    "Vegetable dal with roti",
    "Paneer tikka with brown rice",
    "Moong dal khichdi with ghee",
    "Vegetable curry with whole wheat roti",
    "Chicken breast grilled with salad (non-veg option)",
    "Egg white curry with brown rice (non-veg/diabetes option)"
  ],
  postDinner: [
    "Saunf water",
    "Ajwain water",
    "Turmeric water",
    "Hing water",
    "Ginger water",
    "Chamomile tea"
  ]
};

const generate10DayPlan = (clientGoal, foodPreference, hasHealthCondition = false) => {
  const days = [];
  const riceCount = 5; // Use on 5 days
  const fishCount = 3; // Include grilled fish 2-3 times
  const mealPlan = [];
  
  // Track which days will have rice
  const riceDays = new Set();
  const riceIndices = [1, 3, 5, 7, 9]; // Days 2, 4, 6, 8, 10 (0-indexed)
  riceIndices.slice(0, riceCount).forEach(i => riceDays.add(i));
  
  // Track which days will have fish
  const fishDays = new Set();
  const fishIndices = [2, 5, 8]; // Days 3, 6, 9
  fishIndices.forEach(i => fishDays.add(i));
  
  const postDinnerOptions = mealOptions.postDinner;
  const selectedPostDinner = postDinnerOptions[Math.floor(Math.random() * postDinnerOptions.length)];
  
  for (let day = 0; day < 10; day++) {
    const dayMeals = {
      day: day + 1,
      earlyMorning: mealOptions.earlyMorning[day % mealOptions.earlyMorning.length],
      breakfast: "",
      midMorning: mealOptions.midMorning[day % mealOptions.midMorning.length],
      lunch: "",
      eveningSnack: mealOptions.eveningSnacks[day % mealOptions.eveningSnacks.length],
      dinner: "",
      postDinner: selectedPostDinner
    };
    
    // Breakfast logic
    if (hasHealthCondition && foodPreference === "non_veg") {
      dayMeals.breakfast = ["Egg white omelette with vegetables", "Boiled eggs with whole wheat toast"][day % 2];
    } else if (foodPreference === "non_veg" && day % 3 === 0) {
      dayMeals.breakfast = "Boiled eggs with whole wheat toast";
    } else {
      dayMeals.breakfast = mealOptions.breakfast[day % (mealOptions.breakfast.length - 2)];
    }
    
    // Lunch logic
    if (riceDays.has(day)) {
      const riceDishes = [
        "Dal rice with steamed vegetables",
        "Rajma rice with cucumber salad",
        "Chhole rice with onions and lemon",
        "Kadhi with rice",
        "Veg mixed paneer pulao"
      ];
      
      if (foodPreference === "non_veg" && day % 2 === 0) {
        dayMeals.lunch = "Chicken breast biryani";
      } else {
        dayMeals.lunch = riceDishes[day % riceDishes.length];
      }
    } else {
      if (foodPreference === "non_veg" && day % 2 === 0) {
        dayMeals.lunch = "Grilled chicken with roasted vegetables";
      } else {
        dayMeals.lunch = "Vegetable khichdi";
      }
    }
    
    // Dinner logic - No palak paneer
    if (fishDays.has(day) && foodPreference === "non_veg") {
      dayMeals.dinner = ["Grilled fish with steamed broccoli and carrots", "Baked fish with herbs and lemon"][day % 2];
    } else if (foodPreference === "non_veg") {
      if (hasHealthCondition) {
        dayMeals.dinner = "Egg white curry with brown rice";
      } else {
        dayMeals.dinner = ["Grilled chicken with roasted vegetables", "Grilled chicken breast with mixed vegetables"][day % 2];
      }
    } else {
      const vegDinners = [
        "Vegetable dal with roti",
        "Paneer tikka with brown rice",
        "Moong dal khichdi with ghee",
        "Vegetable curry with whole wheat roti"
      ];
      dayMeals.dinner = vegDinners[day % vegDinners.length];
    }
    
    // Exclude night milk for weight-loss clients
    if (clientGoal !== "weight_loss") {
      dayMeals.postDinner = selectedPostDinner;
    }
    
    mealPlan.push(dayMeals);
  }
  
  return mealPlan;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { clientGoal = "weight_loss", foodPreference = "veg", hasHealthCondition = false } = await req.json();
    
    const mealPlan = generate10DayPlan(clientGoal, foodPreference, hasHealthCondition);
    
    return Response.json({
      success: true,
      mealPlan,
      metadata: {
        duration: "10 days",
        goal: clientGoal,
        preference: foodPreference,
        hasHealthCondition,
        postDinnerOption: mealPlan[0].postDinner
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});