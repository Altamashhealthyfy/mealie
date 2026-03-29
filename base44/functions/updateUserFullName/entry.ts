import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        const { user_id, full_name } = await req.json();

        if (!full_name) {
            return Response.json({ error: 'full_name is required' }, { status: 400 });
        }

        // Allow admins to update any user, or allow users to update their own name
        const targetId = user_id || user?.id;
        const isAdmin = user?.role === 'admin' || user?.user_type === 'super_admin';
        if (!isAdmin && targetId !== user?.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update User entity using service role
        await base44.asServiceRole.entities.User.update(targetId, { full_name });

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