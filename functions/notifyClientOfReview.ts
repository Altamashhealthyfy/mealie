import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (event.type !== 'update') {
      return Response.json({ error: 'Only update events supported' }, { status: 400 });
    }

    const report = data;
    
    // Check if coach_reviewed changed from false to true
    const wasReviewedBefore = old_data?.coach_reviewed === true;
    const isReviewedNow = report.coach_reviewed === true;

    if (!isReviewedNow || wasReviewedBefore) {
      return Response.json({ success: true, message: 'Not a new review' });
    }

    const clientEmail = report.client_email;
    if (!clientEmail) {
      return Response.json({ error: 'Client email not found' }, { status: 400 });
    }

    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: clientEmail,
      title: 'Report Review Complete',
      message: `Your coach has reviewed your ${report.report_type.replace(/_/g, ' ')}: "${report.report_title}" and added notes.`,
      type: 'report_reviewed',
      related_entity: 'ClientReport',
      related_entity_id: report.id,
      is_read: false
    });

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      subject: 'Your Medical Report Has Been Reviewed',
      body: `Hello,\n\nYour health coach has reviewed your medical report:\n\nReport: ${report.report_title}\nDate: ${report.report_date || 'Not specified'}\n\nCoach Notes:\n${report.coach_notes || 'No additional notes'}\n\nPlease log in to view the complete review and feedback.\n\nBest regards,\nMealie Pro Team`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});