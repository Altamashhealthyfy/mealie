import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { students } = await req.json();

    if (!students || !Array.isArray(students)) {
      return Response.json({ error: 'Invalid data format. Expected array of students.' }, { status: 400 });
    }

    const results = {
      success: [],
      failed: []
    };

    // Get plan IDs for Mealie Basic and Mealie Pro
    const plans = await base44.asServiceRole.entities.HealthCoachPlan.list();
    const basicPlan = plans.find(p => p.plan_name === 'Mealie Basic');
    const proPlan = plans.find(p => p.plan_name === 'Mealie Pro');

    if (!basicPlan || !proPlan) {
      return Response.json({ error: 'Mealie Basic or Mealie Pro plan not found' }, { status: 400 });
    }

    for (const student of students) {
      try {
        const { email, full_name, plan_type } = student;

        if (!email || !full_name || !plan_type) {
          results.failed.push({ email, error: 'Missing required fields' });
          continue;
        }

        // Determine which plan to use
        const selectedPlan = plan_type.toLowerCase() === 'mealie pro' ? proPlan : basicPlan;

        // Check if user already exists
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
        
        if (existingUsers.length > 0) {
          results.failed.push({ email, error: 'User already exists' });
          continue;
        }

        // Invite user with student_coach role
        await base44.users.inviteUser(email, 'student_coach');

        // Wait a bit for user creation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create subscription for the student
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription

        await base44.asServiceRole.entities.HealthCoachSubscription.create({
          coach_email: email,
          coach_name: full_name,
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.plan_name,
          billing_cycle: 'yearly',
          amount: 0, // Free access granted by admin
          currency: 'INR',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          next_billing_date: endDate.toISOString().split('T')[0],
          status: 'active',
          payment_method: 'manual',
          manually_granted: true,
          granted_by: user.email,
          auto_renew: false,
          ai_credits_purchased: 0,
          ai_credits_used_this_month: 0
        });

        results.success.push({ email, full_name, plan: selectedPlan.plan_name });
      } catch (error) {
        results.failed.push({ email: student.email, error: error.message });
      }
    }

    return Response.json({ 
      message: `Processed ${students.length} students`,
      results 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});