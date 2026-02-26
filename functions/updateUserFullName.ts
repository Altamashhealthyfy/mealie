import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id, full_name } = await req.json();

        // Allow user to update their own name, or admin to update any user
        const targetUserId = user_id || user.id;
        const isAdmin = user?.role === 'admin' || user?.user_type === 'super_admin';
        const isOwnName = targetUserId === user.id;

        if (!isAdmin && !isOwnName) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!full_name) {
            return Response.json({ error: 'full_name is required' }, { status: 400 });
        }

        await base44.asServiceRole.entities.User.update(targetUserId, { full_name });

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