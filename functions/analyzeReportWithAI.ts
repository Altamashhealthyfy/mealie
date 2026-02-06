import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ error: 'Only create events supported' }, { status: 400 });
    }

    const report = data;
    const reportId = report.id;

    // Get the report file for analysis
    const fileUrl = report.report_file_url;
    if (!fileUrl) {
      return Response.json({ error: 'No report file URL' }, { status: 400 });
    }

    // Get report type for context
    const reportTypeMap = {
      'blood_report': 'Blood Test/Lab Report',
      'ultrasound_report': 'Ultrasound Report',
      'xray_report': 'X-Ray Report',
      'doctor_prescription': 'Doctor Prescription'
    };

    const reportType = reportTypeMap[report.report_type] || report.report_type;

    // Call LLM to analyze the report
    const analysisResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a medical report analyzer. Analyze the following ${reportType} and provide:

1. KEY METRICS: Extract all numerical values/measurements with their units and normal ranges if visible
2. ABNORMALITIES: Flag any values outside normal range, with severity (mild/moderate/severe) and implications
3. CLIENT SUMMARY: Write a 2-3 sentence simplified explanation for the patient to understand their results
4. COACH SUMMARY: Provide detailed clinical insights for the health coach
5. NEXT STEPS: List recommended follow-up tests or actions (2-4 items)
6. DISCUSSION POINTS: Key points the coach should discuss with the client (3-5 items)

Report File: ${fileUrl}
Report Title: ${report.report_title}
Report Date: ${report.report_date || 'Not specified'}

Provide response as JSON with keys: key_metrics (array), abnormalities (array), summary, coach_summary, next_steps (array), discussion_points (array)`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          key_metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
                status: { type: 'string', enum: ['normal', 'abnormal', 'critical'] },
                reference_range: { type: 'string' }
              }
            }
          },
          abnormalities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                finding: { type: 'string' },
                severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
                implication: { type: 'string' }
              }
            }
          },
          summary: { type: 'string' },
          coach_summary: { type: 'string' },
          next_steps: {
            type: 'array',
            items: { type: 'string' }
          },
          discussion_points: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Update report with AI analysis
    await base44.asServiceRole.entities.ClientReport.update(reportId, {
      ai_analysis: analysisResponse,
      ai_analysis_status: 'completed'
    });

    // Create notification for coach about analysis
    if (report.assigned_coach) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: report.assigned_coach,
        title: 'AI Analysis Ready',
        message: `AI analysis is ready for ${report.client_name}'s ${report.report_type.replace(/_/g, ' ')}.`,
        type: 'report_analyzed',
        related_entity: 'ClientReport',
        related_entity_id: reportId,
        is_read: false
      });
    }

    return Response.json({ success: true, analysis: analysisResponse });
  } catch (error) {
    console.error('Error:', error);

    // Update report status to failed
    try {
      const { event, data } = await req.json();
      await base44.asServiceRole.entities.ClientReport.update(data.id, {
        ai_analysis_status: 'failed'
      });
    } catch (e) {
      console.error('Failed to update report status:', e);
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});