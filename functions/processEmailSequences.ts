import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Scheduled function: runs every hour
// Handles conditional branching, pause/resume, and regular sequential sends
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const allLogs = await base44.asServiceRole.entities.EmailSequenceLog.filter({ status: 'active' });
        const now = new Date();

        let processed = 0;
        let sent = 0;
        let errors = 0;
        let branched = 0;

        for (const log of allLogs) {
            // Fetch sequence definition
            const seqList = await base44.asServiceRole.entities.EmailSequence.filter({ id: log.sequence_id });
            const seq = seqList[0];
            if (!seq || !seq.is_active) {
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, { status: 'cancelled' });
                continue;
            }

            const sortedEmails = [...(seq.emails || [])].sort((a, b) => a.step - b.step);

            // --- Step 1: Handle awaiting condition check ---
            if (log.awaiting_condition_check) {
                const check = log.awaiting_condition_check;
                const sentAt = new Date(check.sent_at);
                const checkDue = new Date(sentAt);
                checkDue.setDate(checkDue.getDate() + (check.check_after_days || 1));

                if (now < checkDue) continue; // Not time to evaluate yet

                // Evaluate condition
                const stepLog = (log.emails_sent || []).find(e => e.step === check.step);
                let conditionMet = false;

                if (check.condition === 'email_not_opened') {
                    conditionMet = !stepLog?.opened;
                } else if (check.condition === 'link_clicked') {
                    conditionMet = !!stepLog?.link_clicked;
                } else if (check.condition === 'link_not_clicked') {
                    conditionMet = !stepLog?.link_clicked;
                }

                // Mark the condition as evaluated in emails_sent
                const updatedEmailsSent = (log.emails_sent || []).map(e =>
                    e.step === check.step
                        ? { ...e, condition_evaluated: true, branch_taken: conditionMet ? check.action : 'next_sequential' }
                        : e
                );

                branched++;

                if (conditionMet) {
                    if (check.action === 'end_sequence') {
                        await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                            emails_sent: updatedEmailsSent,
                            awaiting_condition_check: null,
                            status: 'completed'
                        });
                        continue;
                    } else if (check.action === 'resend_email') {
                        // Resend the same step's email
                        const stepEmailObj = sortedEmails.find(e => e.step === check.step);
                        if (stepEmailObj) {
                            const resendResult = await sendEmail(base44, log, stepEmailObj, seq);
                            const resendEntry = {
                                step: stepEmailObj.step,
                                subject: stepEmailObj.subject,
                                sent_at: now.toISOString(),
                                status: resendResult.ok ? 'sent' : 'failed',
                                error: resendResult.error || null,
                                opened: false,
                                link_clicked: false,
                                condition_evaluated: false,
                                branch_taken: null
                            };
                            if (resendResult.ok) sent++; else errors++;
                            // After resend, advance to next step (no re-evaluation loop)
                            const currentIdx = sortedEmails.findIndex(e => e.step === check.step);
                            const nextIdx = currentIdx + 1;
                            const updates = {
                                emails_sent: [...updatedEmailsSent, resendEntry],
                                awaiting_condition_check: null,
                            };
                            if (nextIdx >= sortedEmails.length) {
                                updates.status = 'completed';
                                updates.next_send_date = null;
                                updates.next_step = nextIdx;
                            } else {
                                const nextEmail = sortedEmails[nextIdx];
                                const nextSend = new Date();
                                nextSend.setDate(nextSend.getDate() + (nextEmail.delay_days || 1));
                                updates.next_step = nextIdx;
                                updates.next_send_date = nextSend.toISOString();
                            }
                            await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, updates);
                        }
                        continue;
                    } else if (check.action === 'go_to_step') {
                        // Jump to a specific step
                        const targetIdx = sortedEmails.findIndex(e => e.step === check.branch_step);
                        if (targetIdx === -1) {
                            // Step not found, complete
                            await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                                emails_sent: updatedEmailsSent,
                                awaiting_condition_check: null,
                                status: 'completed'
                            });
                        } else {
                            const targetEmail = sortedEmails[targetIdx];
                            const nextSend = new Date(); // Send immediately (or delay_days from now)
                            nextSend.setDate(nextSend.getDate() + (targetEmail.delay_days || 0));
                            await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                                emails_sent: updatedEmailsSent,
                                awaiting_condition_check: null,
                                next_step: targetIdx,
                                next_send_date: nextSend.toISOString()
                            });
                        }
                        continue;
                    }
                } else {
                    // Condition NOT met — advance to next sequential step
                    const currentIdx = sortedEmails.findIndex(e => e.step === check.step);
                    const nextIdx = currentIdx + 1;
                    const updates = { emails_sent: updatedEmailsSent, awaiting_condition_check: null };
                    if (nextIdx >= sortedEmails.length) {
                        updates.status = 'completed';
                        updates.next_send_date = null;
                        updates.next_step = nextIdx;
                    } else {
                        const nextEmail = sortedEmails[nextIdx];
                        const nextSend = new Date();
                        nextSend.setDate(nextSend.getDate() + (nextEmail.delay_days || 1));
                        updates.next_step = nextIdx;
                        updates.next_send_date = nextSend.toISOString();
                    }
                    await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, updates);
                    continue;
                }
            }

            // --- Step 2: Check if next email is due ---
            if (!log.next_send_date) continue;
            const sendDate = new Date(log.next_send_date);
            if (sendDate > now) continue;

            const stepIndex = log.next_step || 0;
            if (stepIndex >= sortedEmails.length) {
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, { status: 'completed' });
                continue;
            }

            const emailToSend = sortedEmails[stepIndex];
            processed++;

            // Send the email
            const result = await sendEmail(base44, log, emailToSend, seq);
            if (result.ok) sent++; else errors++;

            const sentEntry = {
                step: emailToSend.step,
                subject: emailToSend.subject,
                sent_at: now.toISOString(),
                status: result.ok ? 'sent' : 'failed',
                error: result.error || null,
                gmail_message_id: result.messageId || null,
                opened: false,
                link_clicked: false,
                condition_evaluated: false,
                branch_taken: null
            };

            const updatedEmailsSent = [...(log.emails_sent || []), sentEntry];
            const nextStepIndex = stepIndex + 1;

            // Check if this email has conditions defined
            const emailConditions = emailToSend.conditions || [];
            if (result.ok && emailConditions.length > 0) {
                // Use the first condition for now
                const cond = emailConditions[0];
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                    emails_sent: updatedEmailsSent,
                    next_step: nextStepIndex,
                    next_send_date: null, // will be set after condition check
                    awaiting_condition_check: {
                        step: emailToSend.step,
                        condition: cond.condition,
                        check_after_days: cond.check_after_days || 2,
                        action: cond.action,
                        branch_step: cond.branch_step || null,
                        sent_at: now.toISOString()
                    }
                });
            } else if (nextStepIndex >= sortedEmails.length) {
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                    emails_sent: updatedEmailsSent,
                    next_step: nextStepIndex,
                    next_send_date: null,
                    status: 'completed'
                });
            } else {
                const nextEmail = sortedEmails[nextStepIndex];
                const nextSendDate = new Date();
                nextSendDate.setDate(nextSendDate.getDate() + (nextEmail.delay_days || 1));
                await base44.asServiceRole.entities.EmailSequenceLog.update(log.id, {
                    emails_sent: updatedEmailsSent,
                    next_step: nextStepIndex,
                    next_send_date: nextSendDate.toISOString(),
                    status: result.ok ? 'active' : 'failed'
                });
            }
        }

        return Response.json({
            message: `Processed ${processed} emails. Sent: ${sent}, Branched: ${branched}, Errors: ${errors}`,
            processed, sent, branched, errors
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function sendEmail(base44, log, emailToSend, seq) {
    try {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        const subject = (emailToSend.subject || '')
            .replace(/\{\{client_name\}\}/g, log.client_name || 'there')
            .replace(/\{\{coach_name\}\}/g, seq.coach_email || '');

        // Add a 1x1 tracking pixel
        const trackingPixel = `<img src="https://app.base44.app/api/track/open/${log.id}" width="1" height="1" style="display:none" alt="" />`;

        let body = (emailToSend.body || '')
            .replace(/\{\{client_name\}\}/g, log.client_name || 'there')
            .replace(/\{\{coach_name\}\}/g, seq.coach_email || '');

        // Append tracking pixel before closing body tag, or at end
        if (body.includes('</body>')) {
            body = body.replace('</body>', `${trackingPixel}</body>`);
        } else {
            body = body + trackingPixel;
        }

        // Fetch the Gmail account's own email address
        const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profile = profileRes.ok ? await profileRes.json() : {};
        const senderEmail = profile.emailAddress || Deno.env.get('GOOGLE_WORKSPACE_EMAIL') || seq.coach_email;

        const rawMessage = [
            `From: Health Coach <${senderEmail}>`,
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

        const gmailData = await gmailRes.json();
        return { ok: true, messageId: gmailData.id };
    } catch (e) {
        console.error(`Failed to send email for log ${log.id}:`, e.message);
        return { ok: false, error: e.message };
    }
}