import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Entity automation: triggered when a new Client is created
// Automatically starts any "new_client" email sequences
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { event, data } = body;

        if (event?.type !== 'create') {
            return Response.json({ message: 'Not a create event, skipping' });
        }

        const client = data;
        if (!client?.email) {
            return Response.json({ message: 'No client email, skipping' });
        }

        // Find active new_client sequences
        const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
            trigger: 'new_client',
            is_active: true
        });

        if (!sequences || sequences.length === 0) {
            return Response.json({ message: 'No active new_client sequences' });
        }

        const triggered = [];

        for (const seq of sequences) {
            if (!seq.emails || seq.emails.length === 0) continue;

            const sortedEmails = [...seq.emails].sort((a, b) => a.step - b.step);
            const firstEmail = sortedEmails[0];

            const triggerDate = new Date();
            const nextSendDate = new Date(triggerDate);
            nextSendDate.setDate(nextSendDate.getDate() + (firstEmail.delay_days || 0));

            await base44.asServiceRole.entities.EmailSequenceLog.create({
                sequence_id: seq.id,
                sequence_name: seq.name,
                client_id: client.id,
                client_email: client.email,
                client_name: client.full_name || '',
                trigger: 'new_client',
                trigger_date: triggerDate.toISOString(),
                emails_sent: [],
                next_step: 0,
                next_send_date: nextSendDate.toISOString(),
                status: 'active'
            });

            triggered.push(seq.name);
        }

        return Response.json({ 
            message: `Triggered ${triggered.length} sequence(s) for new client ${client.email}`,
            sequences: triggered
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});