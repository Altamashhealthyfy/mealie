import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_type, client_id, client_name, description, amount, payment_method, reference_id, related_id } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create revenue record
    const revenue = await base44.entities.CoachRevenue.create({
      coach_email: user.email,
      transaction_type,
      client_id,
      client_name,
      description,
      amount,
      payment_method,
      reference_id,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_status: 'completed',
      related_appointment_id: transaction_type === 'appointment' ? related_id : undefined,
      related_program_id: transaction_type === 'program_enrollment' ? related_id : undefined,
      net_amount: amount * 0.95 // 5% platform commission
    });

    return Response.json({
      success: true,
      revenue_id: revenue.id
    });

  } catch (error) {
    console.error('Revenue recording error:', error);
    return Response.json(
      { error: error.message || 'Failed to record revenue' },
      { status: 500 }
    );
  }
});