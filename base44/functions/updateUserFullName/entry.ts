import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin' && user?.user_type !== 'super_admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { user_id, full_name } = await req.json();

        if (!user_id || !full_name) {
            return Response.json({ error: 'user_id and full_name are required' }, { status: 400 });
        }

        // Update User entity using service role
        await base44.asServiceRole.entities.User.update(user_id, { full_name });

        return Response.json({ 
            success: true, 
            message: 'User full name updated successfully' 
        });
    } catch (error) {
        console.error('Update user error:', error);
        return Response.json({ 
            error: error.message || 'Failed to update user' 
        }, { status: 500 });
    }
});