import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clinicalIntakeId } = await req.json();
    if (!clinicalIntakeId) return Response.json({ error: 'clinicalIntakeId is required' }, { status: 400 });

    // 1. Fetch the clinical intake record
    const intakes = await base44.asServiceRole.entities.ClinicalIntake.filter({ id: clinicalIntakeId });
    const intake = intakes[0];
    if (!intake) return Response.json({ error: 'Clinical intake not found' }, { status: 404 });

    const conditions = (intake.health_conditions || []).map(c => c.toLowerCase());

    // 2. Fetch ONLY the required Healthyfy Knowledge Base files (Blood Analysis + Body Type)
    const allKBEntries = await base44.asServiceRole.entities.HealthyfyKnowledgeBase.filter({ is_active: true });
    
    const bloodAnalysisEntry = allKBEntries.find(e =>
      e.name?.toLowerCase().includes('blood analysis') ||
      e.description?.toLowerCase().includes('blood analysis') ||
      e.category === 'Clinical Guidelines'
    );

    const bodyTypeEntry = allKBEntries.find(e =>
      e.name?.toLowerCase().includes('body type') ||
      e.description?.toLowerCase().includes('body type') ||
      e.description?.toLowerCase().includes('holistic')
    );

    // 3. Fetch ONLY the disease-specific clinical knowledge base entries matching the client's conditions
    const allClinicalKB = await base44.asServiceRole.entities.ClinicalKnowledgeBase.filter({ is_active: true });

    // Map condition names from intake to matching ClinicalKnowledgeBase entries
    const CONDITION_MAP = {
      'diabetes': ['diabetes', 'diabetic', 'blood sugar', 'hba1c', 'insulin'],
      'thyroid': ['thyroid', 'hypothyroid', 'hyperthyroid', 'hashimoto', 'tsh'],
      'liver': ['liver', 'fatty liver', 'hepatic', 'nafld', 'sgot', 'sgpt'],
      'kidney': ['kidney', 'renal', 'ckd', 'creatinine', 'nephro'],
      'heart': ['heart', 'cardiac', 'cardiovascular', 'cholesterol', 'lipid'],
      'hormonal': ['hormonal', 'hormone', 'pcos', 'pcod', 'adrenal', 'estrogen', 'testosterone', 'menopause', 'menstrual'],
      'hypertension': ['hypertension', 'blood pressure', 'bp', 'hyper'],
      'others': [],
    };

    const matchedDiseaseKBEntries = [];
    for (const condition of conditions) {
      const keywords = CONDITION_MAP[condition] || [condition];
      const matchedEntries = allClinicalKB.filter(kb => {
        const name = (kb.condition_name || '').toLowerCase();
        return keywords.some(kw => name.includes(kw));
      });
      matchedDiseaseKBEntries.push(...matchedEntries);
    }

    // Deduplicate
    const uniqueDiseaseEntries = matchedDiseaseKBEntries.filter((entry, idx, arr) =>
      arr.findIndex(e => e.id === entry.id) === idx
    );

    // 4. Build the diagnostic object purely from stored KB data (NO AI generation)
    const bi = intake.basic_info || {};
    const labs = intake.lab_values || {};
    const lda = intake.likes_dislikes_allergies || {};
    const meds = intake.current_medications || [];

    // --- Section 1: Client Summary ---
    const clientSummary = {
      age: bi.age,
      gender: bi.gender,
      height: bi.height,
      weight: bi.weight,
      bmi: bi.bmi,
      activity_level: bi.activity_level,
      diet_type: intake.diet_type,
      health_conditions: intake.health_conditions,
      stage_severity: intake.stage_severity,
      goals: intake.goal,
      allergies: lda.allergies || [],
      no_go_foods: lda.no_go_foods || [],
      dislikes: lda.dislikes || [],
      medications: meds,
    };

    // --- Section 2: Blood Analysis Summary (from HealthyfyKnowledgeBase blood entry) ---
    const bloodAnalysisSummary = buildBloodAnalysisSummary(labs, bloodAnalysisEntry);

    // --- Section 3: Body Type / Holistic Summary (from HealthyfyKnowledgeBase body type entry) ---
    const bodyTypeSummary = buildBodyTypeSummary(intake, bodyTypeEntry, uniqueDiseaseEntries);

    // --- Section 4: Disease-Specific Clinical Considerations ---
    const diseaseConsiderations = uniqueDiseaseEntries.map(entry => ({
      condition: entry.condition_name,
      sub_type: entry.sub_type || null,
      foods_to_avoid: entry.foods_to_avoid || [],
      foods_to_include: entry.foods_to_include || [],
      meal_timing_guidelines: entry.meal_timing_guidelines || '',
      calorie_guidelines: entry.calorie_guidelines || '',
      macro_guidelines: entry.macro_guidelines || {},
      micronutrient_focus: entry.micronutrient_focus || [],
      supplements_recommended: entry.supplements_recommended || [],
      lifestyle_recommendations: entry.lifestyle_recommendations || [],
      exercise_guidelines: entry.exercise_guidelines || '',
      medication_interactions: entry.medication_interactions || [],
      herbal_remedies: entry.herbal_remedies || [],
      conflict_rules: entry.conflict_rules || '',
      mpess_recommendations: entry.mpess_recommendations || {},
      source: entry.source_document || null,
    }));

    // --- Section 5: Combined Diagnostic Summary ---
    const combinedSummary = buildCombinedSummary(clientSummary, bloodAnalysisSummary, diseaseConsiderations);

    // --- Metadata ---
    const diagnosticData = {
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      intake_id: clinicalIntakeId,
      kb_sources_used: {
        blood_analysis: bloodAnalysisEntry ? { id: bloodAnalysisEntry.id, name: bloodAnalysisEntry.name } : null,
        body_type: bodyTypeEntry ? { id: bodyTypeEntry.id, name: bodyTypeEntry.name } : null,
        disease_specific: uniqueDiseaseEntries.map(e => ({ id: e.id, condition: e.condition_name })),
      },
      client_summary: clientSummary,
      blood_analysis_summary: bloodAnalysisSummary,
      body_type_summary: bodyTypeSummary,
      disease_considerations: diseaseConsiderations,
      combined_summary: combinedSummary,
      additional_rules: intake.dietitian_remarks ? [{ rule: intake.dietitian_remarks, added_by: 'system', added_at: new Date().toISOString() }] : [],
    };

    // 5. Save back to the ClinicalIntake record
    // Normalize goal to array in case old records stored it as a string
    const goalValue = Array.isArray(intake.goal) ? intake.goal : (intake.goal ? [intake.goal] : []);
    await base44.asServiceRole.entities.ClinicalIntake.update(clinicalIntakeId, {
      diagnostic_notes: JSON.stringify(diagnosticData),
      goal: goalValue,
    });

    return Response.json({ success: true, diagnostic: diagnosticData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildBloodAnalysisSummary(labs, kbEntry) {
  const markers = [];
  const nutritionalImplications = [];
  const restrictions = [];
  const focusNutrients = [];

  // Interpret key lab values using known clinical ranges
  if (labs.tsh !== undefined && labs.tsh !== '') {
    const v = parseFloat(labs.tsh);
    if (!isNaN(v)) {
      if (v < 0.4) markers.push({ marker: 'TSH', value: v, unit: 'mIU/L', status: 'Low', interpretation: 'Possible hyperthyroidism. Monitor iodine intake.' });
      else if (v > 4.0) markers.push({ marker: 'TSH', value: v, unit: 'mIU/L', status: 'High', interpretation: 'Possible hypothyroidism. Avoid goitrogenic foods raw. Ensure selenium & zinc.' });
      else markers.push({ marker: 'TSH', value: v, unit: 'mIU/L', status: 'Normal', interpretation: 'Thyroid function within range.' });
    }
  }
  if (labs.hba1c !== undefined && labs.hba1c !== '') {
    const v = parseFloat(labs.hba1c);
    if (!isNaN(v)) {
      if (v < 5.7) markers.push({ marker: 'HbA1c', value: v, unit: '%', status: 'Normal', interpretation: 'Normal glycemic control.' });
      else if (v < 6.5) markers.push({ marker: 'HbA1c', value: v, unit: '%', status: 'Pre-Diabetic', interpretation: 'Pre-diabetic range. Restrict refined carbs, increase fiber, manage GI of meals.' });
      else markers.push({ marker: 'HbA1c', value: v, unit: '%', status: 'Diabetic', interpretation: 'Diabetic range. Strict carb management, low GI foods, no added sugar.' });
    }
  }
  if (labs.total_cholesterol !== undefined && labs.total_cholesterol !== '') {
    const v = parseFloat(labs.total_cholesterol);
    if (!isNaN(v)) {
      if (v >= 200) {
        markers.push({ marker: 'Total Cholesterol', value: v, unit: 'mg/dL', status: v >= 240 ? 'High' : 'Borderline', interpretation: 'Reduce saturated fats. Increase soluble fiber, omega-3 foods.' });
        restrictions.push('Limit saturated fats, trans fats, full-fat dairy, red meat');
        focusNutrients.push('Soluble fibre (oats, psyllium)', 'Omega-3 fatty acids');
      } else {
        markers.push({ marker: 'Total Cholesterol', value: v, unit: 'mg/dL', status: 'Normal', interpretation: 'Cholesterol within acceptable range.' });
      }
    }
  }
  if (labs.ldl !== undefined && labs.ldl !== '') {
    const v = parseFloat(labs.ldl);
    if (!isNaN(v) && v >= 100) {
      markers.push({ marker: 'LDL', value: v, unit: 'mg/dL', status: v >= 130 ? 'High' : 'Borderline', interpretation: 'Elevated LDL. Avoid trans fats. Emphasise plant sterols, fibre.' });
    }
  }
  if (labs.hdl !== undefined && labs.hdl !== '') {
    const v = parseFloat(labs.hdl);
    if (!isNaN(v)) {
      if (v < 40) {
        markers.push({ marker: 'HDL', value: v, unit: 'mg/dL', status: 'Low', interpretation: 'Low HDL. Increase physical activity, healthy fats (nuts, avocado, olive oil).' });
        focusNutrients.push('Healthy unsaturated fats', 'Regular physical activity');
      } else {
        markers.push({ marker: 'HDL', value: v, unit: 'mg/dL', status: 'Normal', interpretation: 'HDL within acceptable range.' });
      }
    }
  }
  if (labs.triglycerides !== undefined && labs.triglycerides !== '') {
    const v = parseFloat(labs.triglycerides);
    if (!isNaN(v) && v >= 150) {
      markers.push({ marker: 'Triglycerides', value: v, unit: 'mg/dL', status: v >= 200 ? 'High' : 'Borderline', interpretation: 'Elevated triglycerides. Restrict simple sugars, refined carbs, alcohol.' });
      restrictions.push('Restrict refined carbohydrates, added sugars, fruit juices');
    }
  }
  if (labs.sgot !== undefined && labs.sgot !== '' && parseFloat(labs.sgot) > 40) {
    markers.push({ marker: 'SGOT', value: parseFloat(labs.sgot), unit: 'U/L', status: 'High', interpretation: 'Elevated liver enzyme. Avoid hepatotoxic foods. Limit processed foods & alcohol.' });
    restrictions.push('Avoid alcohol, processed & fried foods (elevated liver enzymes)');
    focusNutrients.push('Antioxidants (Vitamin C, E)', 'Turmeric, milk thistle');
  }
  if (labs.sgpt !== undefined && labs.sgpt !== '' && parseFloat(labs.sgpt) > 56) {
    markers.push({ marker: 'SGPT', value: parseFloat(labs.sgpt), unit: 'U/L', status: 'High', interpretation: 'Elevated liver enzyme. Liver-supportive diet required.' });
    restrictions.push('Avoid fatty, fried, processed foods (elevated SGPT)');
  }
  if (labs.creatinine !== undefined && labs.creatinine !== '' && parseFloat(labs.creatinine) > 1.2) {
    markers.push({ marker: 'Creatinine', value: parseFloat(labs.creatinine), unit: 'mg/dL', status: 'High', interpretation: 'Elevated creatinine. Protein restriction may be needed. Limit high-potassium foods if GFR is low.' });
    restrictions.push('Moderate protein intake, limit high-potassium & high-phosphorus foods');
    focusNutrients.push('Adequate hydration');
  }
  if (labs.vitamin_d !== undefined && labs.vitamin_d !== '' && parseFloat(labs.vitamin_d) < 30) {
    markers.push({ marker: 'Vitamin D', value: parseFloat(labs.vitamin_d), unit: 'ng/mL', status: 'Deficient', interpretation: 'Vitamin D deficient. Emphasise sunlight exposure, dietary sources (eggs, fortified foods).' });
    focusNutrients.push('Vitamin D (eggs, fortified foods, sunlight)', 'Calcium absorption support');
    nutritionalImplications.push('Vitamin D deficiency — impacts bone health, immunity, and hormonal balance');
  }
  if (labs.vitamin_b12 !== undefined && labs.vitamin_b12 !== '' && parseFloat(labs.vitamin_b12) < 200) {
    markers.push({ marker: 'Vitamin B12', value: parseFloat(labs.vitamin_b12), unit: 'pg/mL', status: 'Deficient', interpretation: 'B12 deficiency. Critical for vegetarians. Include dairy, eggs; consider supplementation.' });
    focusNutrients.push('Vitamin B12 (dairy, eggs, fortified foods or supplementation)');
    nutritionalImplications.push('B12 deficiency — impacts nerve function, energy, RBC production');
  }
  if (labs.uric_acid !== undefined && labs.uric_acid !== '') {
    const v = parseFloat(labs.uric_acid);
    if (!isNaN(v) && v > 7.2) {
      markers.push({ marker: 'Uric Acid', value: v, unit: 'mg/dL', status: 'High', interpretation: 'Elevated uric acid. Avoid high-purine foods, fructose, alcohol.' });
      restrictions.push('Avoid red meat, organ meats, shellfish, beer, high-fructose foods (high uric acid)');
    }
  }
  if (labs.sodium !== undefined && labs.sodium !== '') {
    const v = parseFloat(labs.sodium);
    if (!isNaN(v)) {
      if (v < 135) markers.push({ marker: 'Sodium', value: v, unit: 'mEq/L', status: 'Low', interpretation: 'Hyponatremia. Ensure adequate sodium intake, avoid excessive water.' });
      else if (v > 145) markers.push({ marker: 'Sodium', value: v, unit: 'mEq/L', status: 'High', interpretation: 'Hypernatremia. Restrict sodium intake.' });
    }
  }

  return {
    kb_source: kbEntry ? kbEntry.name : 'Blood Analysis Guidelines (built-in ranges)',
    markers,
    nutritional_implications: nutritionalImplications,
    restrictions,
    focus_nutrients: [...new Set(focusNutrients)],
  };
}

function buildBodyTypeSummary(intake, kbEntry, diseaseEntries) {
  const bodyTypeConnections = [...new Set(
    diseaseEntries
      .filter(e => e.body_type_connection && e.body_type_connection !== 'none')
      .map(e => e.body_type_connection)
  )];

  const holisticConsiderations = [];
  diseaseEntries.forEach(entry => {
    if (entry.mpess_recommendations) {
      const mpess = entry.mpess_recommendations;
      if (mpess.mind?.length) holisticConsiderations.push(...mpess.mind.map(r => `[Mind] ${r}`));
      if (mpess.physical?.length) holisticConsiderations.push(...mpess.physical.map(r => `[Physical] ${r}`));
      if (mpess.emotional?.length) holisticConsiderations.push(...mpess.emotional.map(r => `[Emotional] ${r}`));
      if (mpess.spiritual?.length) holisticConsiderations.push(...mpess.spiritual.map(r => `[Spiritual] ${r}`));
    }
    if (entry.therapies?.length) {
      holisticConsiderations.push(...entry.therapies.map(t => `[Therapy] ${t}`));
    }
  });

  return {
    kb_source: kbEntry ? kbEntry.name : 'Body Type Holistic Guide (built-in)',
    body_type_connections: bodyTypeConnections,
    holistic_considerations: [...new Set(holisticConsiderations)].slice(0, 20),
  };
}

function buildCombinedSummary(clientSummary, bloodAnalysis, diseaseConsiderations) {
  // Final restrictions: union of all blood + disease restrictions
  const allRestrictions = [
    ...bloodAnalysis.restrictions,
    ...(clientSummary.allergies || []).map(a => `Allergy: avoid ${a}`),
    ...(clientSummary.no_go_foods || []).map(f => `No-go (personal/religious): ${f}`),
  ];
  diseaseConsiderations.forEach(d => {
    if (d.foods_to_avoid?.length) {
      allRestrictions.push(...d.foods_to_avoid.map(f => `[${d.condition}] Avoid: ${f}`));
    }
  });

  // Final priorities: union of all disease foods to include
  const allPriorities = [];
  diseaseConsiderations.forEach(d => {
    if (d.foods_to_include?.length) {
      allPriorities.push(...d.foods_to_include.map(f => `[${d.condition}] Include: ${f}`));
    }
  });

  // Major nutrition focus
  const majorFocus = [...new Set([
    ...bloodAnalysis.focus_nutrients,
    ...diseaseConsiderations.flatMap(d => d.micronutrient_focus || []),
  ])];

  // Practical notes
  const practicalNotes = [];
  diseaseConsiderations.forEach(d => {
    if (d.meal_timing_guidelines) practicalNotes.push(`[${d.condition}] ${d.meal_timing_guidelines}`);
    if (d.calorie_guidelines) practicalNotes.push(`[${d.condition}] Calories: ${d.calorie_guidelines}`);
    if (d.exercise_guidelines) practicalNotes.push(`[${d.condition}] Exercise: ${d.exercise_guidelines}`);
    if (d.conflict_rules) practicalNotes.push(`⚠️ Conflict rule: ${d.conflict_rules}`);
  });

  // Medication-food interactions
  const medFoodInteractions = [];
  diseaseConsiderations.forEach(d => {
    if (d.medication_interactions?.length) {
      medFoodInteractions.push(...d.medication_interactions.map(m => `[${d.condition}] ${m}`));
    }
  });

  return {
    final_restrictions: [...new Set(allRestrictions)],
    final_priorities: [...new Set(allPriorities)],
    major_nutrition_focus: majorFocus,
    practical_notes: practicalNotes,
    medication_food_interactions: medFoodInteractions,
    disease_count: diseaseConsiderations.length,
    conditions_covered: diseaseConsiderations.map(d => d.condition),
  };
}