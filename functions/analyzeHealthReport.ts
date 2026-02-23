import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const HEALTH_BENCHMARKS = {
  hemoglobin_male: { min: 13.5, max: 17.5, unit: 'g/dL' },
  hemoglobin_female: { min: 12.0, max: 15.5, unit: 'g/dL' },
  hematocrit_male: { min: 41, max: 53, unit: '%' },
  hematocrit_female: { min: 36, max: 46, unit: '%' },
  wbc: { min: 4.5, max: 11.0, unit: 'K/μL' },
  platelets: { min: 150, max: 400, unit: 'K/μL' },
  glucose_fasting: { min: 70, max: 100, unit: 'mg/dL' },
  glucose_random: { min: 0, max: 140, unit: 'mg/dL' },
  total_cholesterol: { min: 0, max: 200, unit: 'mg/dL', note: 'Desirable' },
  ldl: { min: 0, max: 100, unit: 'mg/dL', note: 'Optimal' },
  hdl_male: { min: 40, max: 300, unit: 'mg/dL' },
  hdl_female: { min: 50, max: 300, unit: 'mg/dL' },
  triglycerides: { min: 0, max: 150, unit: 'mg/dL' },
  creatinine: { min: 0.7, max: 1.3, unit: 'mg/dL' },
  bun: { min: 7, max: 20, unit: 'mg/dL' },
  sodium: { min: 135, max: 145, unit: 'mEq/L' },
  potassium: { min: 3.5, max: 5.0, unit: 'mEq/L' },
  calcium: { min: 8.5, max: 10.2, unit: 'mg/dL' },
  magnesium: { min: 1.7, max: 2.2, unit: 'mg/dL' },
  alt: { min: 7, max: 56, unit: 'U/L' },
  ast: { min: 10, max: 40, unit: 'U/L' },
  alkaline_phosphatase: { min: 44, max: 147, unit: 'U/L' },
  bilirubin_total: { min: 0.1, max: 1.2, unit: 'mg/dL' },
  albumin: { min: 3.5, max: 5.0, unit: 'g/dL' },
  tsh: { min: 0.4, max: 4.0, unit: 'mIU/L' },
  t3: { min: 80, max: 200, unit: 'ng/dL' },
  t4: { min: 4.5, max: 12.0, unit: 'μg/dL' },
  uric_acid_male: { min: 3.5, max: 7.2, unit: 'mg/dL' },
  uric_acid_female: { min: 2.6, max: 6.0, unit: 'mg/dL' },
  vitamin_d: { min: 30, max: 100, unit: 'ng/mL' },
  vitamin_b12: { min: 200, max: 900, unit: 'pg/mL' },
  iron: { min: 60, max: 170, unit: 'μg/dL' },
  ferritin_male: { min: 30, max: 300, unit: 'ng/mL' },
  ferritin_female: { min: 15, max: 200, unit: 'ng/mL' }
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, client_id, client_name, report_type } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Step 1: Extract data from health report using LLM vision
    const extractionResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a medical data extraction expert. Analyze this ${report_type || 'blood work'} report image and extract ALL health indicators and their values.

For each indicator found, provide:
- indicator_name (e.g., "Hemoglobin", "Total Cholesterol")
- value (numeric)
- unit (e.g., "g/dL", "mg/dL")
- reference_range (if visible)
- flag_status (if marked as High/Low/Normal)

Format as a JSON array.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                indicator_name: { type: "string" },
                value: { type: "number" },
                unit: { type: "string" },
                reference_range: { type: "string" },
                flag_status: { type: "string" }
              }
            }
          },
          test_date: { type: "string" },
          lab_name: { type: "string" },
          notes: { type: "string" }
        }
      }
    });

    // Step 2: Compare against benchmarks and identify concerns/trends
    const indicators = extractionResponse.indicators || [];
    const analysis = {
      normal_indicators: [],
      concerning_indicators: [],
      positive_trends: [],
      missing_key_indicators: [],
      risk_factors: []
    };

    // Map indicator names to benchmark keys
    const indicatorMap = {
      'hemoglobin': 'hemoglobin_male',
      'hematocrit': 'hematocrit_male',
      'wbc': 'wbc',
      'white blood cells': 'wbc',
      'platelets': 'platelets',
      'glucose': 'glucose_fasting',
      'fasting glucose': 'glucose_fasting',
      'total cholesterol': 'total_cholesterol',
      'ldl': 'ldl',
      'hdl': 'hdl_male',
      'triglycerides': 'triglycerides',
      'creatinine': 'creatinine',
      'bun': 'bun',
      'sodium': 'sodium',
      'potassium': 'potassium',
      'calcium': 'calcium',
      'alt': 'alt',
      'ast': 'ast',
      'alkaline phosphatase': 'alkaline_phosphatase',
      'bilirubin': 'bilirubin_total',
      'albumin': 'albumin',
      'tsh': 'tsh',
      't3': 't3',
      't4': 't4',
      'uric acid': 'uric_acid_male',
      'vitamin d': 'vitamin_d',
      'b12': 'vitamin_b12',
      'iron': 'iron',
      'ferritin': 'ferritin_male'
    };

    // Analyze each indicator
    indicators.forEach(indicator => {
      const keyLower = indicator.indicator_name.toLowerCase();
      let benchmarkKey = indicatorMap[keyLower];
      
      if (!benchmarkKey) {
        for (const [key, val] of Object.entries(indicatorMap)) {
          if (keyLower.includes(key) || key.includes(keyLower)) {
            benchmarkKey = val;
            break;
          }
        }
      }

      if (benchmarkKey && HEALTH_BENCHMARKS[benchmarkKey]) {
        const benchmark = HEALTH_BENCHMARKS[benchmarkKey];
        const value = indicator.value;

        if (value >= benchmark.min && value <= benchmark.max) {
          analysis.normal_indicators.push({
            name: indicator.indicator_name,
            value: value,
            unit: indicator.unit,
            status: 'Normal',
            range: `${benchmark.min}-${benchmark.max}`
          });
        } else if (value < benchmark.min) {
          analysis.concerning_indicators.push({
            name: indicator.indicator_name,
            value: value,
            unit: indicator.unit,
            status: 'Low',
            range: `${benchmark.min}-${benchmark.max}`,
            recommendation: `${indicator.indicator_name} is below normal. May indicate deficiency or health concern.`
          });
        } else if (value > benchmark.max) {
          analysis.concerning_indicators.push({
            name: indicator.indicator_name,
            value: value,
            unit: indicator.unit,
            status: 'High',
            range: `${benchmark.min}-${benchmark.max}`,
            recommendation: `${indicator.indicator_name} is elevated. May require dietary changes or medical intervention.`
          });
        }
      }
    });

    // Check for key missing indicators
    const measuredIndicators = indicators.map(i => i.indicator_name.toLowerCase());
    const criticalIndicators = ['hemoglobin', 'glucose', 'cholesterol', 'creatinine'];
    criticalIndicators.forEach(indicator => {
      if (!measuredIndicators.some(m => m.includes(indicator))) {
        analysis.missing_key_indicators.push(indicator);
      }
    });

    // Step 3: Generate comprehensive report
    const reportResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this health report analysis, create a concise clinical summary for a health coach:

Indicators Analyzed:
${JSON.stringify(indicators, null, 2)}

Analysis Results:
- Normal indicators (${analysis.normal_indicators.length}): ${analysis.normal_indicators.map(i => i.name).join(', ') || 'None'}
- Concerning indicators (${analysis.concerning_indicators.length}): ${analysis.concerning_indicators.map(i => i.name + ' (' + i.status + ')').join(', ') || 'None'}
- Missing key indicators: ${analysis.missing_key_indicators.join(', ') || 'None'}

Please provide:
1. A one-paragraph clinical summary (2-3 sentences)
2. Top 3 areas of concern (if any)
3. Top 3 positive observations
4. Coaching recommendations (3-5 bullet points)
5. Follow-up tests recommended

Format as JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          clinical_summary: { type: "string" },
          concerns: { type: "array", items: { type: "string" } },
          positive_observations: { type: "array", items: { type: "string" } },
          coaching_recommendations: { type: "array", items: { type: "string" } },
          follow_up_tests: { type: "array", items: { type: "string" } },
          overall_health_score: { type: "number" }
        }
      }
    });

    // Combine all findings
    const report = {
      client_id,
      client_name,
      report_type: report_type || 'Blood Work',
      analysis_date: new Date().toISOString(),
      test_date: extractionResponse.test_date,
      lab_name: extractionResponse.lab_name,
      
      // Quantitative analysis
      indicators_measured: indicators.length,
      normal_count: analysis.normal_indicators.length,
      concerning_count: analysis.concerning_indicators.length,
      
      // Detailed findings
      detailed_analysis: {
        normal_indicators: analysis.normal_indicators,
        concerning_indicators: analysis.concerning_indicators,
        missing_indicators: analysis.missing_key_indicators
      },
      
      // Clinical insights
      clinical_insights: reportResponse,
      
      // Quick reference
      summary: {
        status: analysis.concerning_indicators.length === 0 ? 'Healthy' : analysis.concerning_indicators.length <= 2 ? 'Monitor' : 'Attention Needed',
        health_score: Math.round(reportResponse.overall_health_score || 75),
        key_findings: reportResponse.concerns.slice(0, 2),
        next_steps: reportResponse.coaching_recommendations.slice(0, 3)
      }
    };

    // Save report to database
    if (client_id) {
      const reportTypeMap = {
        'Blood Work': 'blood_test',
        'Thyroid Panel': 'thyroid_panel',
        'Lipid Panel': 'lipid_panel',
        'Liver Function': 'liver_function',
        'Kidney Function': 'kidney_function',
        'Glucose Testing': 'hba1c'
      };

      await base44.asServiceRole.entities.HealthReport.create({
        client_id,
        report_type: reportTypeMap[report_type] || 'other',
        report_name: `${report_type} - ${new Date().toLocaleDateString()}`,
        report_date: extractionResponse.test_date || new Date().toISOString().split('T')[0],
        file_url,
        file_type: 'image/jpeg',
        ai_analysis: {
          summary: reportResponse.clinical_summary,
          key_findings: analysis.detailed_analysis.concerning_indicators.concat(analysis.detailed_analysis.normal_indicators).map(ind => ({
            parameter: ind.name,
            value: ind.value,
            normal_range: ind.range,
            status: ind.status?.toLowerCase() || 'normal',
            interpretation: ind.recommendation || 'Within normal parameters'
          })),
          recommendations: reportResponse.coaching_recommendations,
          red_flags: reportResponse.concerns
        },
        action_items: reportResponse.coaching_recommendations,
        analyzed_by: user.email
      });
    }

    return Response.json(report);
  } catch (error) {
    console.error('Error analyzing health report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});