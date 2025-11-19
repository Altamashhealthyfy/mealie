import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser || !['super_admin', 'student_coach'].includes(currentUser.user_type)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { full_name, email, password, user_type } = await req.json();

        if (!full_name || !email || !password) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create user with service role
        // Note: This is a placeholder - Base44 SDK doesn't currently support creating users with passwords
        // You would need to use Base44's admin API or invite system
        
        // For now, return error with instructions
        return Response.json({ 
            error: 'User creation with password is not yet supported. Please use the Base44 dashboard to invite users.',
            instructions: 'Go to Base44 Dashboard → Users → Invite User'
        }, { status: 501 });

        // When Base44 supports it, the code would look like:
        /*
        const newUser = await base44.asServiceRole.auth.createUser({
            email,
            password,
            user_metadata: {
                full_name,
                user_type
            }
        });

        return Response.json({ 
            success: true, 
            user: newUser 
        });
        */
    } catch (error) {
        console.error('Error creating user:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});