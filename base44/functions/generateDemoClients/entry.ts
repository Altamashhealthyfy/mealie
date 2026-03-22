import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const results = {
      clients: [],
      progress_logs: [],
      mpess_records: [],
      meal_plans: [],
      food_logs: [],
      assessments: [],
      health_reports: [],
      clinical_intakes: []
    };

    // Demo clients data
    const demoClients = [
      {
        full_name: "Aajad Kumar",
        email: `aajad.demo.${Date.now()}@example.com`,
        phone: "+91 98765 43210",
        age: 32,
        gender: "male",
        height: 175,
        weight: 85,
        initial_weight: 92,
        target_weight: 75,
        activity_level: "moderately_active",
        goal: "weight_loss",
        food_preference: "non_veg",
        regional_preference: "north",
        status: "active",
        months_ago: 1,
        target_calories: 1800,
        target_protein: 120,
        target_carbs: 180,
        target_fats: 60
      },
      {
        full_name: "Prakash Sharma",
        email: `prakash.demo.${Date.now()}@example.com`,
        phone: "+91 98765 43211",
        age: 45,
        gender: "male",
        height: 168,
        weight: 78,
        initial_weight: 88,
        target_weight: 72,
        activity_level: "lightly_active",
        goal: "disease_reversal",
        food_preference: "veg",
        regional_preference: "west",
        status: "active",
        months_ago: 2,
        target_calories: 1600,
        target_protein: 100,
        target_carbs: 160,
        target_fats: 55
      },
      {
        full_name: "Sunita Devi",
        email: `sunita.demo.${Date.now()}@example.com`,
        phone: "+91 98765 43212",
        age: 38,
        gender: "female",
        height: 162,
        weight: 68,
        initial_weight: 80,
        target_weight: 60,
        activity_level: "very_active",
        goal: "weight_loss",
        food_preference: "veg",
        regional_preference: "south",
        status: "active",
        months_ago: 3,
        target_calories: 1700,
        target_protein: 110,
        target_carbs: 170,
        target_fats: 58
      }
    ];

    for (const clientData of demoClients) {
      const monthsAgo = clientData.months_ago;
      delete clientData.months_ago;

      // Set join date
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - monthsAgo);
      clientData.join_date = joinDate.toISOString().split('T')[0];

      // Create client
      const client = await base44.asServiceRole.entities.Client.create(clientData);
      results.clients.push(client);

      // Create Clinical Intake (for Pro Plans)
      const clinicalIntake = await base44.asServiceRole.entities.ClinicalIntake.create({
        client_id: client.id,
        medical_history: {
          conditions: clientData.goal === 'disease_reversal' 
            ? ["Type 2 Diabetes", "Hypertension", "High Cholesterol"]
            : ["None"],
          medications: clientData.goal === 'disease_reversal'
            ? ["Metformin 500mg", "Amlodipine 5mg"]
            : [],
          allergies: ["None"],
          family_history: "Diabetes in family"
        },
        current_symptoms: clientData.goal === 'disease_reversal'
          ? ["Fatigue", "Frequent urination", "Increased thirst"]
          : ["None"],
        lifestyle_habits: {
          smoking: false,
          alcohol: "occasional",
          exercise: clientData.activity_level,
          sleep_hours: 7
        },
        dietary_habits: {
          meal_frequency: 3,
          water_intake: 8,
          favorite_foods: ["Rice", "Dal", "Vegetables"],
          disliked_foods: ["Bitter gourd"]
        }
      });
      results.clinical_intakes.push(clinicalIntake);

      // Create Health Reports
      if (clientData.goal === 'disease_reversal') {
        const reportDate = new Date(joinDate);
        reportDate.setDate(reportDate.getDate() + 7);
        
        const healthReport = await base44.asServiceRole.entities.HealthReport.create({
          client_id: client.id,
          report_type: "blood_test",
          report_name: "Complete Blood Panel & HbA1c",
          report_date: reportDate.toISOString().split('T')[0],
          file_url: "https://example.com/demo-report.pdf",
          file_type: "application/pdf",
          ai_analysis: {
            summary: "Elevated blood glucose and HbA1c levels indicating diabetes. Blood pressure slightly elevated.",
            key_findings: [
              {
                parameter: "HbA1c",
                value: "7.8%",
                normal_range: "4.0-5.6%",
                status: "high",
                interpretation: "Indicates poor blood sugar control over past 3 months"
              },
              {
                parameter: "Fasting Glucose",
                value: "145 mg/dL",
                normal_range: "70-100 mg/dL",
                status: "high",
                interpretation: "Elevated fasting blood sugar"
              },
              {
                parameter: "Total Cholesterol",
                value: "220 mg/dL",
                normal_range: "<200 mg/dL",
                status: "high",
                interpretation: "Borderline high cholesterol"
              }
            ],
            recommendations: [
              "Reduce refined carbohydrates and sugar intake",
              "Increase fiber-rich foods",
              "Regular physical activity 30 min daily",
              "Monitor blood sugar regularly",
              "Follow prescribed meal plan strictly"
            ],
            red_flags: ["HbA1c above 7%", "Fasting glucose elevated"]
          },
          coach_notes: "Starting diabetes reversal meal plan. Focus on low GI foods.",
          analyzed_by: user.email
        });
        results.health_reports.push(healthReport);
      }

      // Create Assessment
      const assessmentDate = new Date(joinDate);
      assessmentDate.setDate(assessmentDate.getDate() + 3);
      
      const assessment = await base44.asServiceRole.entities.ClientAssessment.create({
        client_id: client.id,
        client_name: client.full_name,
        template_name: "Initial Health Assessment",
        assigned_by: user.email,
        status: "completed",
        responses: {
          "Current Weight": `${client.initial_weight} kg`,
          "Target Weight": `${client.target_weight} kg`,
          "Daily Activity": clientData.activity_level,
          "Sleep Quality": "Good - 7-8 hours",
          "Stress Level": "Moderate",
          "Energy Level": "Good throughout day",
          "Digestive Health": "Normal",
          "Water Intake": "6-8 glasses daily"
        },
        score: 85,
        feedback: "Excellent baseline assessment. Client is motivated and ready to follow the plan.",
        completed_date: assessmentDate.toISOString()
      });
      results.assessments.push(assessment);

      // Create Meal Plan
      const mealPlanDate = new Date(joinDate);
      mealPlanDate.setDate(mealPlanDate.getDate() + 5);
      
      const mealPlan = await base44.asServiceRole.entities.MealPlan.create({
        client_id: client.id,
        plan_name: clientData.goal === 'disease_reversal' 
          ? "Diabetes Reversal Meal Plan"
          : "Weight Loss Meal Plan",
        goal: clientData.goal,
        start_date: mealPlanDate.toISOString().split('T')[0],
        daily_calorie_target: client.target_calories,
        daily_protein_target: client.target_protein,
        daily_carbs_target: client.target_carbs,
        daily_fats_target: client.target_fats,
        meals: [
          {
            meal_type: "breakfast",
            name: "Oatmeal with fruits and nuts",
            ingredients: ["Oats 50g", "Banana 1", "Almonds 10", "Milk 200ml"],
            calories: 350,
            protein: 15,
            carbs: 50,
            fats: 12
          },
          {
            meal_type: "lunch",
            name: "Brown rice with dal and vegetables",
            ingredients: ["Brown rice 100g", "Dal 100g", "Mixed vegetables 150g"],
            calories: 450,
            protein: 20,
            carbs: 65,
            fats: 8
          },
          {
            meal_type: "snack",
            name: "Greek yogurt with berries",
            ingredients: ["Greek yogurt 150g", "Mixed berries 50g"],
            calories: 150,
            protein: 15,
            carbs: 18,
            fats: 3
          },
          {
            meal_type: "dinner",
            name: "Grilled chicken with quinoa and salad",
            ingredients: ["Chicken breast 150g", "Quinoa 80g", "Salad 100g"],
            calories: 400,
            protein: 40,
            carbs: 35,
            fats: 10
          }
        ],
        active: true,
        notes: "Follow this plan consistently. Track your meals daily."
      });
      results.meal_plans.push(mealPlan);

      // Generate Progress Logs (weekly)
      const totalWeeks = monthsAgo * 4;
      const initialWeight = client.initial_weight;
      const currentWeight = client.weight;
      const weightLossPerWeek = (initialWeight - currentWeight) / totalWeeks;

      for (let week = 0; week <= totalWeeks; week++) {
        const progressDate = new Date(joinDate);
        progressDate.setDate(progressDate.getDate() + (week * 7));
        
        const weekWeight = initialWeight - (weightLossPerWeek * week);
        const adherence = 85 + Math.floor(Math.random() * 10); // 85-95% adherence
        
        const progressLog = await base44.asServiceRole.entities.ProgressLog.create({
          client_id: client.id,
          date: progressDate.toISOString().split('T')[0],
          weight: parseFloat(weekWeight.toFixed(1)),
          measurements: {
            waist: Math.floor(90 - (week * 0.5)),
            chest: Math.floor(100 - (week * 0.3)),
            hips: Math.floor(95 - (week * 0.4))
          },
          energy_level: 4,
          meal_adherence: adherence,
          exercise_adherence: adherence - 5,
          notes: week % 4 === 0 
            ? `Month ${Math.floor(week/4) + 1} check-in: Excellent progress! Keep it up.`
            : "Following plan well. Feeling energetic.",
          photos: []
        });
        results.progress_logs.push(progressLog);
      }

      // Generate MPESS Wellness Tracking (3x per week)
      const totalDays = monthsAgo * 30;
      const mpessDays = Math.floor(totalDays * 0.4); // Track ~40% of days
      
      for (let i = 0; i < mpessDays; i++) {
        const mpessDate = new Date(joinDate);
        mpessDate.setDate(mpessDate.getDate() + (i * 2)); // Every 2 days
        
        const mpessRecord = await base44.asServiceRole.entities.MPESSTracker.create({
          created_by: client.email,
          date: mpessDate.toISOString().split('T')[0],
          mind_practices: {
            affirmations_completed: true,
            stress_relief_done: Math.random() > 0.3,
            mindfulness_minutes: 10 + Math.floor(Math.random() * 20)
          },
          physical_practices: {
            movement_done: true,
            hydration_met: true,
            water_intake: 8 + Math.floor(Math.random() * 4)
          },
          emotional_practices: {
            journaling_done: Math.random() > 0.4,
            breathwork_done: true
          },
          social_practices: {
            bonding_activity_done: Math.random() > 0.5,
            connection_made: true
          },
          spiritual_practices: {
            meditation_done: true,
            gratitude_journaling_done: Math.random() > 0.3
          },
          overall_rating: 4,
          mood: "positive",
          notes: "Feeling great! Following wellness routine consistently."
        });
        results.mpess_records.push(mpessRecord);
      }

      // Generate Food Logs (daily for last 2 weeks)
      for (let day = 0; day < 14; day++) {
        const foodDate = new Date();
        foodDate.setDate(foodDate.getDate() - day);
        
        const foodLog = await base44.asServiceRole.entities.FoodLog.create({
          client_id: client.id,
          date: foodDate.toISOString().split('T')[0],
          meal_type: "breakfast",
          food_item: "Oatmeal with fruits",
          quantity: "1 bowl",
          calories: 350,
          protein: 15,
          carbs: 50,
          fats: 12,
          notes: "As per meal plan"
        });
        results.food_logs.push(foodLog);

        const lunchLog = await base44.asServiceRole.entities.FoodLog.create({
          client_id: client.id,
          date: foodDate.toISOString().split('T')[0],
          meal_type: "lunch",
          food_item: "Brown rice with dal and vegetables",
          quantity: "1 plate",
          calories: 450,
          protein: 20,
          carbs: 65,
          fats: 8,
          notes: "Following plan"
        });
        results.food_logs.push(lunchLog);

        const dinnerLog = await base44.asServiceRole.entities.FoodLog.create({
          client_id: client.id,
          date: foodDate.toISOString().split('T')[0],
          meal_type: "dinner",
          food_item: "Grilled protein with quinoa and salad",
          quantity: "1 serving",
          calories: 400,
          protein: 40,
          carbs: 35,
          fats: 10,
          notes: "Great adherence"
        });
        results.food_logs.push(dinnerLog);
      }
    }

    return Response.json({
      success: true,
      message: "Demo clients created successfully with comprehensive data",
      summary: {
        clients_created: results.clients.length,
        progress_logs: results.progress_logs.length,
        mpess_records: results.mpess_records.length,
        meal_plans: results.meal_plans.length,
        food_logs: results.food_logs.length,
        assessments: results.assessments.length,
        health_reports: results.health_reports.length,
        clinical_intakes: results.clinical_intakes.length
      },
      clients: results.clients.map(c => ({
        id: c.id,
        name: c.full_name,
        email: c.email
      }))
    });

  } catch (error) {
    console.error('Error generating demo clients:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});