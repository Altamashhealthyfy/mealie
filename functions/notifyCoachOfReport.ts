import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ error: 'Only create events supported' }, { status: 400 });
    }

    const report = data;
    
    // Get coach email
    const coachEmail = report.assigned_coach;
    if (!coachEmail) {
      return Response.json({ success: true, message: 'No coach assigned' });
    }

    // Get client name
    const clientName = report.client_name || report.client_email;
    
    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: coachEmail,
      title: `New Report from ${clientName}`,
      message: `${clientName} uploaded a ${report.report_type.replace(/_/g, ' ')}: "${report.report_title}"`,
      type: 'report_uploaded',
      related_entity: 'ClientReport',
      related_entity_id: report.id,
      is_read: false
    });

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: coachEmail,
      subject: `New Medical Report from ${clientName}`,
      body: `Hello,\n\n${clientName} has uploaded a new medical report:\n\nReport Type: ${report.report_type.replace(/_/g, ' ')}\nTitle: ${report.report_title}\nDate: ${report.report_date || 'Not specified'}\n\nPlease log in to review the report and add your notes.\n\nBest regards,\nMealie Pro Team`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});