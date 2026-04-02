/**
 * Activity Logger — simplified, never blocks the app
 * All complex data goes into the `extra` JSON string field
 */

import { base44 } from "@/api/base44Client";

export function getSessionId() {
  let sid = sessionStorage.getItem('hfy_sid');
  if (!sid) {
    sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('hfy_sid', sid);
  }
  return sid;
}

export function getDeviceType() {
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other';
}

function getISTTimestamp() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Core logging function — wraps everything in try/catch
 * NEVER throws, NEVER blocks the app
 */
export async function logActivity({
  log_type,
  action,
  user_email,
  client_id = '',
  client_name = '',
  status = 'success',
  duration_ms = null,
  tokens_in = null,
  tokens_out = null,
  tokens_total = null,
  cost_inr = null,
  error_msg = '',
  // Any extra context goes here — will be JSON.stringified
  extra = null,
}) {
  try {
    if (!user_email) return;

    const extraData = {
      page_url: window.location.pathname,
      session_id: getSessionId(),
      device_type: getDeviceType(),
      browser: getBrowser(),
      ...(extra || {}),
    };

    await base44.entities.ActivityLog.create({
      created_at: getISTTimestamp(),
      log_type,
      action,
      user_email,
      client_id: client_id || '',
      client_name: client_name || '',
      status,
      duration_ms: duration_ms || null,
      tokens_in: tokens_in || null,
      tokens_out: tokens_out || null,
      tokens_total: tokens_total || null,
      cost_inr: cost_inr || null,
      error_msg: error_msg ? String(error_msg).substring(0, 500) : '',
      extra: JSON.stringify(extraData),
    });
  } catch (e) {
    // Always silent — logging must never block the app
    console.log('Activity log failed silently:', e?.message);
  }
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

export const logAuth = (action, user_email, status = 'success') =>
  logActivity({ log_type: 'user_auth', action, user_email, status });

export const logClientView = (client, user_email) =>
  logActivity({
    log_type: 'client_view',
    action: `Viewed client profile: ${client.full_name || client.name}`,
    user_email,
    client_id: client.id || '',
    client_name: client.full_name || client.name || '',
  });

export const logClientCreate = (client, user_email) =>
  logActivity({
    log_type: 'client_create',
    action: `Created new client: ${client.full_name || client.name}`,
    user_email,
    client_id: client.id || '',
    client_name: client.full_name || client.name || '',
    extra: { email: client.email, diet_type: client.food_preference },
  });

export const logPlanGeneration = (clientName, planType, user_email, status = 'success', duration_ms = null, tokens_total = null) =>
  logActivity({
    log_type: 'plan_generation',
    action: `Generated ${planType || 'AI'} plan for ${clientName}`,
    user_email,
    client_name: clientName,
    status,
    duration_ms,
    tokens_total,
    extra: { plan_type: planType },
  });

export const logPlanView = (planName, clientName, user_email, planId = null) =>
  logActivity({
    log_type: 'plan_view',
    action: `Viewed meal plan: ${planName} (${clientName})`,
    user_email,
    client_name: clientName,
    extra: { entity_type: 'MealPlan', entity_id: planId },
  });

export const logPdfDownload = (clientName, user_email) =>
  logActivity({
    log_type: 'pdf_download',
    action: `Downloaded PDF for ${clientName}`,
    user_email,
    client_name: clientName,
  });

export const logIntakeView = (clientName, user_email, clientId = null) =>
  logActivity({
    log_type: 'intake_view',
    action: `Opened clinical intake for ${clientName}`,
    user_email,
    client_name: clientName,
    client_id: clientId || '',
  });

export const logIntakeSave = (clientName, user_email, clientId = null, labValues = null) =>
  logActivity({
    log_type: 'intake_save',
    action: `Saved clinical intake for ${clientName}`,
    user_email,
    client_name: clientName,
    client_id: clientId || '',
    extra: labValues ? { lab_values: labValues } : {},
  });

export const logFoodLog = (clientName, mealSlot, dishName, user_email) =>
  logActivity({
    log_type: 'food_log',
    action: `${clientName} logged ${mealSlot} — ${dishName}`,
    user_email,
    client_name: clientName,
  });

export const logProgressLog = (clientName, weight, user_email) =>
  logActivity({
    log_type: 'progress_log',
    action: `${clientName} logged weight: ${weight}kg`,
    user_email,
    client_name: clientName,
  });

export const logMessageSend = (senderEmail, receiverName, hasAttachment = false) =>
  logActivity({
    log_type: 'message_send',
    action: `${senderEmail} sent message to ${receiverName}`,
    user_email: senderEmail,
    extra: { has_attachment: hasAttachment },
    // NOTE: Never log message content — privacy
  });

export const logAppointmentCreate = (coachEmail, clientName, date, user_email) =>
  logActivity({
    log_type: 'appointment_create',
    action: `Appointment booked: ${clientName} on ${date}`,
    user_email,
    client_name: clientName,
    extra: { coach: coachEmail, date },
  });

export const logError = (errorMessage, user_email, pageUrl = null) =>
  logActivity({
    log_type: 'error',
    action: `Error on ${pageUrl || window.location.pathname}: ${String(errorMessage).substring(0, 200)}`,
    user_email: user_email || 'unknown',
    status: 'error',
    error_msg: String(errorMessage).substring(0, 500),
  });

export const logAdminAction = (action, user_email, previousValue = null, newValue = null) =>
  logActivity({
    log_type: 'admin_action',
    action,
    user_email,
    extra: {
      previous_value: previousValue ? JSON.stringify(previousValue).substring(0, 300) : null,
      new_value: newValue ? JSON.stringify(newValue).substring(0, 300) : null,
    },
  });