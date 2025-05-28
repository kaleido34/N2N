/**
 * Simple API rate limiter to prevent excessive API calls
 */

// Track API calls by endpoint
const apiCalls: Record<string, { lastCall: number; inProgress: boolean }> = {};

/**
 * Check if an API call should be allowed
 * @param endpoint The API endpoint
 * @param cooldownMs Cooldown period in milliseconds
 * @returns Whether the API call should be allowed
 */
export function shouldAllowApiCall(endpoint: string, cooldownMs: number = 5000): boolean {
  const now = Date.now();
  const callInfo = apiCalls[endpoint];
  
  // If no previous call or call is not in progress
  if (!callInfo) {
    apiCalls[endpoint] = { lastCall: now, inProgress: true };
    return true;
  }
  
  // If call is in progress, don't allow another
  if (callInfo.inProgress) {
    console.log(`[API-LIMITER] Skipping call to ${endpoint} - already in progress`);
    return false;
  }
  
  // If cooldown period hasn't elapsed
  const timeSinceLastCall = now - callInfo.lastCall;
  if (timeSinceLastCall < cooldownMs) {
    console.log(`[API-LIMITER] Skipping call to ${endpoint} - cooldown period (${timeSinceLastCall}ms < ${cooldownMs}ms)`);
    return false;
  }
  
  // Allow the call and update tracking
  apiCalls[endpoint] = { lastCall: now, inProgress: true };
  return true;
}

/**
 * Mark an API call as completed
 * @param endpoint The API endpoint
 */
export function markApiCallCompleted(endpoint: string): void {
  if (apiCalls[endpoint]) {
    apiCalls[endpoint].inProgress = false;
  }
}

/**
 * Reset all API call tracking
 */
export function resetApiCallTracking(): void {
  Object.keys(apiCalls).forEach(key => {
    apiCalls[key] = { lastCall: 0, inProgress: false };
  });
}

// Auto-reset tracking every 30 seconds to prevent stale state
setInterval(resetApiCallTracking, 30000);
