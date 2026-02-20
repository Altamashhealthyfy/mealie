import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Called when a trigger event occurs (e.g., new client added)
// Payload: { trigger, client_id, client_email, client_name }
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { trigger, client_id, client_email, client_name } = await req.json();
        if (!trigger || !client_id || !client_email) {
            return Response.json({ error: 'Missing required fields: trigger, client_id, client_email' }, { status: 400 });
        }

        // Find active sequences matching this trigger
        const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
            trigger,
            is_active: true
        });

        if (!sequences || sequences.length === 0) {
            return Response.json({ message: 'No active sequences for this trigger', triggered: 0 });
        }

        const triggered = [];

        for (const seq of sequences) {
            if (!seq.emails || seq.emails.length === 0) continue;

            // Sort emails by step
            const sortedEmails = [...seq.emails].sort((a, b) => a.step - b.step);
            const firstEmail = sortedEmails[0];

            // Calculate when to send the first email
            const triggerDate = new Date();
            const nextSendDate = new Date(triggerDate);
            nextSendDate.setDate(nextSendDate.getDate() + (firstEmail.delay_days || 0));

            // Create a log entry to track progress
            const log = await base44.asServiceRole.entities.EmailSequenceLog.create({
                sequence_id: seq.id,
                sequence_name: seq.name,
                client_id,
                client_email,
                client_name: client_name || '',
                trigger,
                trigger_date: triggerDate.toISOString(),
                emails_sent: [],
                next_step: 0,
                next_send_date: nextSendDate.toISOString(),
                status: 'active'
            });

            triggered.push({ sequence: seq.name, log_id: log.id, next_send: nextSendDate });
        }

        return Response.json({ 
            message: `Triggered ${triggered.length} sequence(s)`,
            triggered 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});