/**
 * Global action and error logging utility.
 * Writes to the AppLog entity. Never throws — always silent on failure.
 */

import { base44 } from "@/api/base44Client";

// Cache current user to avoid repeated auth calls
let _cachedUserEmail = null;
export async function getLogUserEmail() {
  if (_cachedUserEmail) return _cachedUserEmail;
  try {
    const user = await base44.auth.me();
    _cachedUserEmail = user?.email || "unknown";
  } catch {
    _cachedUserEmail = "unknown";
  }
  return _cachedUserEmail;
}

/**
 * Log an action to the AppLog entity.
 *
 * @param {object} params
 * @param {string} params.action         - Action identifier, e.g. "generate_meal_plan"
 * @param {string} params.status         - "success" | "error" | "warning"
 * @param {string} [params.userEmail]    - User email (auto-resolved if omitted)
 * @param {string} [params.userType]     - "coach" | "client" | "admin" | "unknown"
 * @param {string} [params.pageSection]  - Page/section name
 * @param {string} [params.errorMessage] - Error message if status=error
 * @param {string} [params.errorCode]    - Error code, e.g. "AI_TIMEOUT"
 * @param {object} [params.metadata]     - Extra data (client_id, duration, tokens, etc.)
 * @param {number} [params.durationMs]   - How long the operation took in ms
 */
export async function logAction({
  action,
  status,
  userEmail,
  userType = "coach",
  pageSection,
  errorMessage,
  errorCode,
  metadata,
  durationMs,
}) {
  try {
    const email = userEmail || await getLogUserEmail();
    await base44.entities.AppLog.create({
      user_email: email || "unknown",
      user_type: userType || "coach",
      action,
      status,
      page_section: pageSection || null,
      error_message: errorMessage ? String(errorMessage).substring(0, 1000) : null,
      error_code: errorCode || null,
      metadata: metadata || {},
      duration_ms: durationMs || null,
      resolved: false,
    });
  } catch (e) {
    // Logging must NEVER break the app
    console.error("AppLog write failed:", e?.message);
  }
}

// ── Convenience helpers ─────────────────────────────────────────────────────

export const logSuccess = (action, pageSection, userEmail, metadata) =>
  logAction({ action, status: "success", pageSection, userEmail, metadata });

export const logError = (action, pageSection, errorMessage, userEmail, errorCode, metadata) =>
  logAction({ action, status: "error", pageSection, errorMessage, errorCode, userEmail, metadata });

export const logWarning = (action, pageSection, errorMessage, userEmail, metadata) =>
  logAction({ action, status: "warning", pageSection, errorMessage, userEmail, metadata });