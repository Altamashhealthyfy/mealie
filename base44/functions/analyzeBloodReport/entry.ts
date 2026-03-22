import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { health_report_id, client_id, lab_values, gender } = await req.json();

    if (!lab_values || typeof lab_values !== 'object') {
      return Response.json({ error: 'lab_values object is required' }, { status: 400 });
    }

    // Fetch all active LabInterpretationRules from the knowledge base
    const allRules = await base44.asServiceRole.entities.LabInterpretationRules.filter({ is_active: true });

    // Build a lookup map: marker_name (lowercase) -> rule
    const ruleMap = {};
    for (const rule of allRules) {
      ruleMap[rule.marker_name.toLowerCase()] = rule;
      // Also index by aliases
      if (rule.marker_alias && Array.isArray(rule.marker_alias)) {
        for (const alias of rule.marker_alias) {
          ruleMap[alias.toLowerCase()] = rule;
        }
      }
    }

    const keyFindings = [];
    const hiddenInsightPatterns = [];
    const dietaryConsiderations = new Set();
    const lifestyleConsiderations = new Set();
    const supplementRecommendations = new Set();
    const ayurvedicRecommendations = new Set();
    const redFlags = [];
    const ruleBasedMarkers = [];
    const aiFallbackMarkers = [];

    const markerNames = Object.keys(lab_values);

    // --- STEP 1: Rule-based analysis for each marker ---
    for (const markerKey of markerNames) {
      const value = parseFloat(lab_values[markerKey]);
      if (isNaN(value)) continue;

      const rule = ruleMap[markerKey.toLowerCase()];

      if (rule) {
        ruleBasedMarkers.push(markerKey);

        // Determine status: low / normal / high
        let status = 'normal';
        if (rule.low_threshold !== undefined && value < rule.low_threshold) {
          status = 'low';
        } else if (rule.high_threshold !== undefined && value > rule.high_threshold) {
          status = 'high';
        }

        // Determine implication text
        const implications = status === 'low'
          ? (rule.low_implication || [])
          : status === 'high'
          ? (rule.high_implication || [])
          : [];

        keyFindings.push({
          marker: rule.marker_name,
          value: `${value} ${rule.units || ''}`.trim(),
          status,
          implication: implications.join('; ') || 'Within normal range'
        });

        // Add recommendations from rule
        if (status === 'low') {
          (rule.dietary_recommendations_low || []).forEach(r => dietaryConsiderations.add(r));
          (rule.lifestyle_recommendations_low || []).forEach(r => lifestyleConsiderations.add(r));
          (rule.supplements_low || []).forEach(r => supplementRecommendations.add(r));
          (rule.ayurvedic_support_low || []).forEach(r => ayurvedicRecommendations.add(r));
          if (rule.urgency_flag_low === 'urgent') {
            redFlags.push(`${rule.marker_name} is critically LOW (${value} ${rule.units || ''})`);
          }
        } else if (status === 'high') {
          (rule.dietary_recommendations_high || []).forEach(r => dietaryConsiderations.add(r));
          (rule.lifestyle_recommendations_high || []).forEach(r => lifestyleConsiderations.add(r));
          (rule.supplements_high || []).forEach(r => supplementRecommendations.add(r));
          (rule.ayurvedic_support_high || []).forEach(r => ayurvedicRecommendations.add(r));
          if (rule.urgency_flag_high === 'urgent') {
            redFlags.push(`${rule.marker_name} is critically HIGH (${value} ${rule.units || ''})`);
          }
        }

        // Collect hidden insight patterns from this rule
        if (rule.hidden_insights && Array.isArray(rule.hidden_insights)) {
          hiddenInsightPatterns.push(...rule.hidden_insights);
        }
      } else {
        aiFallbackMarkers.push(markerKey);
      }
    }

    // --- STEP 2: AI fallback for unrecognized markers ---
    let aiFallbackFindings = [];
    if (aiFallbackMarkers.length > 0) {
      const fallbackValues = {};
      for (const m of aiFallbackMarkers) {
        fallbackValues[m] = lab_values[m];
      }

      const fallbackPrompt = `You are a clinical nutrition expert. Analyze these lab markers that were not found in our knowledge base.
      
Patient gender: ${gender || 'unknown'}
Lab values: ${JSON.stringify(fallbackValues, null, 2)}

For each marker, provide:
1. Whether it is LOW, NORMAL, or HIGH
2. Clinical implication (1-2 sentences)
3. Top 2 dietary recommendations
4. Top 1 lifestyle recommendation

Return JSON with this structure:
{
  "findings": [
    {
      "marker": "marker name",
      "value": "value with unit",
      "status": "low|normal|high",
      "implication": "clinical meaning",
      "dietary": ["recommendation 1", "recommendation 2"],
      "lifestyle": ["recommendation 1"]
    }
  ]
}`;

      const fallbackResult = await base44.integrations.Core.InvokeLLM({
        prompt: fallbackPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            findings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  marker: { type: 'string' },
                  value: { type: 'string' },
                  status: { type: 'string' },
                  implication: { type: 'string' },
                  dietary: { type: 'array', items: { type: 'string' } },
                  lifestyle: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      });

      aiFallbackFindings = fallbackResult?.findings || [];
      for (const finding of aiFallbackFindings) {
        keyFindings.push({
          marker: finding.marker,
          value: finding.value,
          status: finding.status,
          implication: finding.implication + ' [AI analysis]'
        });
        (finding.dietary || []).forEach(r => dietaryConsiderations.add(r));
        (finding.lifestyle || []).forEach(r => lifestyleConsiderations.add(r));
      }
    }

    // --- STEP 3: Generate overall summary using AI ---
    const summaryPrompt = `You are a clinical dietitian. Write a concise 3-4 sentence professional summary of this blood report analysis for a dietitian to review.

Key findings: ${keyFindings.map(f => `${f.marker}: ${f.value} (${f.status})`).join(', ')}
Red flags: ${redFlags.join(', ') || 'None'}
Gender: ${gender || 'unknown'}

Be professional, clear, and highlight what the dietitian should focus on first.`;

    const summaryResult = await base44.integrations.Core.InvokeLLM({ prompt: summaryPrompt });

    // --- STEP 4: Build final analysis object ---
    const analysisResult = {
      summary: typeof summaryResult === 'string' ? summaryResult : summaryResult?.text || 'Analysis complete.',
      key_findings: keyFindings,
      hidden_insights: hiddenInsightPatterns,
      dietary_considerations: Array.from(dietaryConsiderations),
      lifestyle_considerations: Array.from(lifestyleConsiderations),
      supplement_recommendations: Array.from(supplementRecommendations),
      ayurvedic_recommendations: Array.from(ayurvedicRecommendations),
      red_flags: redFlags,
      recommendations: [
        ...redFlags.map(f => `⚠️ URGENT: ${f}`),
        ...Array.from(dietaryConsiderations).slice(0, 5)
      ]
    };

    const auditTrail = {
      analyzed_at: new Date().toISOString(),
      analyzed_by: user.email,
      markers_analyzed: markerNames,
      rule_based_markers: ruleBasedMarkers,
      ai_fallback_markers: aiFallbackMarkers,
      ai_fallback_used: aiFallbackMarkers.length > 0,
      rules_applied_count: ruleBasedMarkers.length,
      analysis_source_breakdown: `${ruleBasedMarkers.length} marker(s) from Knowledge Base, ${aiFallbackMarkers.length} marker(s) from AI fallback`
    };

    // --- STEP 5: Update the HealthReport record if ID is provided ---
    if (health_report_id) {
      await base44.asServiceRole.entities.HealthReport.update(health_report_id, {
        ai_analysis: analysisResult,
        analysis_audit: auditTrail
      });
    }

    return Response.json({
      success: true,
      ai_analysis: analysisResult,
      analysis_audit: auditTrail
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});