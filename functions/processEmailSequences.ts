import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Scheduled function: runs every hour, sends due emails in active sequences
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Get all active sequence logs where next_send_date is due
        const allLogs = await base44.asServiceRole.entities.EmailSequenceLog.filter({ status: 'active' });
        const now = new Date();

        let processed = 0;
        let sent = 0;
        let errors = 0;

        for (const log of allLogs) {
            if (!log.next_send_date) continue;
            const sendDate = new Date(log.next_send_date);
            if (sendDate > now) continue; // Not due yet

            // Fetch the sequence definition
            const seqList = await base44.asServiceRole.entities.EmailSequence.filter({ id: log.sequence_id });
            const seq = seqList[0];
            if (!seq || !seq.is_active) {
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, { status: 'cancelled' });
                continue;
            }

            const sortedEmails = [...(seq.emails || [])].sort((a, b) => a.step - b.step);
            const stepIndex = log.next_step || 0;

            if (stepIndex >= sortedEmails.length) {
                // All emails sent
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, { status: 'completed' });
                continue;
            }

            const emailToSend = sortedEmails[stepIndex];
            processed++;

            // Send email via Gmail OAuth connector
            let emailStatus = 'sent';
            let emailError = null;

            try {
                const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

                // Replace template variables
                const subject = (emailToSend.subject || '')
                    .replace(/\{\{client_name\}\}/g, log.client_name || 'there')
                    .replace(/\{\{coach_name\}\}/g, seq.coach_email || '');

                const body = (emailToSend.body || '')
                    .replace(/\{\{client_name\}\}/g, log.client_name || 'there')
                    .replace(/\{\{coach_name\}\}/g, seq.coach_email || '');

                const rawMessage = [
                    `From: Health Coach <${Deno.env.get('GOOGLE_WORKSPACE_EMAIL') || seq.coach_email}>`,
                    `To: ${log.client_name ? `"${log.client_name}" <${log.client_email}>` : log.client_email}`,
                    `Subject: ${subject}`,
                    `MIME-Version: 1.0`,
                    `Content-Type: text/html; charset=UTF-8`,
                    ``,
                    body
                ].join('\r\n');

                const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ raw: encoded }),
                });

                if (!gmailRes.ok) {
                    const err = await gmailRes.json();
                    throw new Error(err?.error?.message || `Gmail error: ${gmailRes.status}`);
                }
                sent++;
            } catch (e) {
                emailStatus = 'failed';
                emailError = e.message;
                errors++;
                console.error(`Failed to send email for log ${log.id}:`, e.message);
            }

            // Update the log
            const updatedEmailsSent = [...(log.emails_sent || []), {
                step: emailToSend.step,
                subject: emailToSend.subject,
                sent_at: now.toISOString(),
                status: emailStatus,
                error: emailError
            }];

            const nextStepIndex = stepIndex + 1;

            if (nextStepIndex >= sortedEmails.length) {
                // This was the last email
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                    emails_sent: updatedEmailsSent,
                    next_step: nextStepIndex,
                    next_send_date: null,
                    status: 'completed'
                });
            } else {
                // Calculate next send date
                const nextEmail = sortedEmails[nextStepIndex];
                const nextSendDate = new Date();
                nextSendDate.setDate(nextSendDate.getDate() + (nextEmail.delay_days || 1));

                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                    emails_sent: updatedEmailsSent,
                    next_step: nextStepIndex,
                    next_send_date: nextSendDate.toISOString(),
                    status: emailStatus === 'failed' ? 'failed' : 'active'
                });
            }
        }

        return Response.json({ 
            message: `Processed ${processed} due emails. Sent: ${sent}, Errors: ${errors}`,
            processed, sent, errors
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});