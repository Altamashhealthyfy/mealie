import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only student_coach can update their own email
    if (user.user_type !== 'student_coach') {
      return Response.json({ error: 'Forbidden: Only health coaches can update email' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if email already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0 && existingUsers[0].id !== user.id) {
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Update user email using service role
    await base44.asServiceRole.entities.User.update(user.id, { email });

    return Response.json({ 
      success: true, 
      message: 'Email updated successfully. Please use your new email for future logins.' 
    });

  } catch (error) {
    console.error('Error updating email:', error);
    return Response.json({ 
      error: error.message || 'Failed to update email' 
    }, { status: 500 });
  }
});