/**
 * Token Usage Logger — logs every AI API call with cost tracking
 * NEVER blocks — always silent on failure
 */

import { base44 } from "@/api/base44Client";

const HAIKU_INPUT_COST = 0.0000008;   // per token
const HAIKU_OUTPUT_COST = 0.000004;   // per token
const USD_TO_INR = 84;

function getISTTimestamp() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function getISTDate() {
  return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function getMonthYear() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Core token logging function
 * Call after every Claude API response
 */
export async function logTokenUsage({
  triggered_by,
  coach_name = '',
  client_id = null,
  client_name = null,
  function_name,
  model_used = 'claude-haiku-4-5-20251001',
  plan_type = null,
  input_tokens = 0,
  output_tokens = 0,
  status = 'success',
  error_message = null,
  duration_ms = null,
}) {
  try {
    if (!triggered_by) return;

    const totalTokens = input_tokens + output_tokens;
    const inputCostUsd = input_tokens * HAIKU_INPUT_COST;
    const outputCostUsd = output_tokens * HAIKU_OUTPUT_COST;
    const totalCostUsd = inputCostUsd + outputCostUsd;
    const totalCostInr = totalCostUsd * USD_TO_INR;

    await base44.entities.TokenUsageLog.create({
      created_at: getISTTimestamp(),
      date: getISTDate(),
      month_year: getMonthYear(),
      triggered_by,
      coach_name: coach_name || '',
      client_id: client_id || null,
      client_name: client_name || null,
      function_name,
      model_used,
      plan_type: plan_type || null,
      input_tokens,
      output_tokens,
      total_tokens: totalTokens,
      input_cost_usd: parseFloat(inputCostUsd.toFixed(8)),
      output_cost_usd: parseFloat(outputCostUsd.toFixed(8)),
      total_cost_usd: parseFloat(totalCostUsd.toFixed(8)),
      total_cost_inr: parseFloat(totalCostInr.toFixed(3)),
      status,
      error_message: error_message ? String(error_message).substring(0, 500) : null,
      duration_ms: duration_ms || null,
    });
  } catch (e) {
    // Always silent — never block the function
    console.log('Token log failed silently:', e?.message);
  }
}

/**
 * Convenience wrapper for successful API calls
 */
export async function logTokenSuccess(params) {
  await logTokenUsage({ ...params, status: 'success' });
}

/**
 * Convenience wrapper for failed API calls
 */
export async function logTokenError(params, error) {
  await logTokenUsage({
    ...params,
    input_tokens: 0,
    output_tokens: 0,
    status: 'error',
    error_message: error?.message || String(error),
  });
}

// Export constants for use in functions
export { HAIKU_INPUT_COST, HAIKU_OUTPUT_COST, USD_TO_INR };