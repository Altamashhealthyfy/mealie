import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(user.user_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { assessmentId } = await req.json();

    if (!assessmentId) {
      return Response.json({ error: 'Assessment ID required' }, { status: 400 });
    }

    const assessments = await base44.entities.ClientAssessment.filter({ id: assessmentId });
    const assessment = assessments[0];

    if (!assessment) {
      return Response.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.status !== 'completed') {
      return Response.json({ error: 'Assessment not completed yet' }, { status: 400 });
    }

    // Generate comprehensive report using AI
    const prompt = `Generate a detailed health assessment report based on the following client information:

CLIENT: ${assessment.client_name}
ASSESSMENT DATE: ${assessment.assessment_date}

MEDICAL HISTORY:
- Chronic Conditions: ${assessment.medical_history?.chronic_conditions?.join(', ') || 'None'}
- Current Medications: ${assessment.medical_history?.current_medications?.join(', ') || 'None'}
- Allergies: ${assessment.medical_history?.allergies?.join(', ') || 'None'}
- Current Symptoms: ${assessment.medical_history?.current_symptoms || 'None'}

LIFESTYLE HABITS:
- Sleep: ${assessment.lifestyle_habits?.sleep_hours || 'N/A'} hours, Quality: ${assessment.lifestyle_habits?.sleep_quality || 'N/A'}
- Stress Level: ${assessment.lifestyle_habits?.stress_level || 'N/A'}
- Water Intake: ${assessment.lifestyle_habits?.water_intake_liters || 'N/A'}L/day
- Alcohol: ${assessment.lifestyle_habits?.alcohol_consumption || 'N/A'}
- Smoking: ${assessment.lifestyle_habits?.smoking_status || 'N/A'}

DIETARY PREFERENCES:
- Diet Type: ${assessment.dietary_preferences?.diet_type || 'N/A'}
- Meal Frequency: ${assessment.dietary_preferences?.meal_frequency || 'N/A'} meals/day
- Favorite Foods: ${assessment.dietary_preferences?.favorite_foods?.join(', ') || 'N/A'}
- Foods to Avoid: ${assessment.dietary_preferences?.foods_to_avoid?.join(', ') || 'N/A'}
- Cooking Skills: ${assessment.dietary_preferences?.cooking_skills || 'N/A'}

FITNESS LEVEL:
- Activity Level: ${assessment.fitness_level?.current_activity_level || 'N/A'}
- Exercise Frequency: ${assessment.fitness_level?.exercise_frequency || 'N/A'}
- Exercise Types: ${assessment.fitness_level?.exercise_types?.join(', ') || 'N/A'}
- Exercise Duration: ${assessment.fitness_level?.exercise_duration_minutes || 'N/A'} minutes

HEALTH GOALS:
- Primary Goal: ${assessment.health_goals?.primary_goal?.replace('_', ' ') || 'N/A'}
- Target Weight: ${assessment.health_goals?.target_weight || 'N/A'} kg
- Timeline: ${assessment.health_goals?.timeline?.replace('_', ' ') || 'N/A'}
- Motivation: ${assessment.health_goals?.motivation_level || 'N/A'}
- Specific Goals: ${assessment.health_goals?.specific_goals || 'N/A'}

ADDITIONAL NOTES: ${assessment.additional_notes || 'None'}

Generate a comprehensive assessment report with the following sections:
1. Executive Summary
2. Health Status Analysis
3. Risk Factors & Concerns
4. Nutritional Recommendations
5. Fitness & Exercise Plan
6. Lifestyle Modifications
7. Action Plan & Next Steps

Make it professional, detailed, and actionable for a health coach.`;

    const reportContent = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false,
    });

    // Format report as markdown
    const reportMarkdown = `# Health Assessment Report
**Client:** ${assessment.client_name}  
**Assessment Date:** ${new Date(assessment.assessment_date).toLocaleDateString()}  
**Generated:** ${new Date().toLocaleDateString()}

---

${reportContent}

---

*This report was automatically generated based on the client's assessment responses. It should be reviewed by a qualified health professional.*
`;

    // Store report (in production, you might want to generate a PDF and upload it)
    const reportUrl = `data:text/markdown;base64,${btoa(reportMarkdown)}`;

    // Update assessment with report
    await base44.asServiceRole.entities.ClientAssessment.update(assessmentId, {
      report_generated: true,
      report_url: reportUrl,
      coach_notes: assessment.coach_notes || reportContent.substring(0, 500),
    });

    return Response.json({
      success: true,
      reportUrl: reportUrl,
      reportContent: reportMarkdown,
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ 
      error: 'Failed to generate report',
      details: error.message 
    }, { status: 500 });
  }
});