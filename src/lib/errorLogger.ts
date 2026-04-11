// ─────────────────────────────────────────────────────────────────────────────
// Error Logger — captures unhandled errors and promise rejections.
// Logs to console in dev; extend to external service (Sentry, LogRocket) later.
// ─────────────────────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

export function initErrorLogger(): void {
  // Catch synchronous JS errors (e.g., ReferenceError in event handlers)
  window.addEventListener('error', (event) => {
    logError('uncaught_error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  });

  // Catch unhandled promise rejections (e.g., failed fetch, throw in async fn)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? { message: event.reason.message, stack: event.reason.stack }
      : { message: String(event.reason) };
    logError('unhandled_rejection', reason);
    // Prevent browser from printing the default unhandled rejection warning
    // in production so users don't see a confusing message.
    if (!IS_DEV) event.preventDefault();
  });
}

export function logError(type: string, data: Record<string, unknown>): void {
  if (IS_DEV) {
    console.error(`[FitPulse Error] ${type}`, data);
  }
  // Future: send to external monitoring service
  // e.g. Sentry.captureException(...)
}

// ─── Event Tracking ──────────────────────────────────────────────────────────
// Structured events for future analytics integration.

export type TrackableEvent =
  | 'workout_completed'
  | 'profile_updated'
  | 'challenge_joined'
  | 'rank_promoted'
  | 'daily_mission_completed'
  | 'session_started'
  | 'weight_logged'
  | 'achievement_unlocked';

export function trackEvent(
  event: TrackableEvent,
  properties?: Record<string, unknown>
): void {
  if (IS_DEV) {
    console.log(`[FitPulse Track] ${event}`, properties ?? {});
  }
  // Future: send to analytics (PostHog, Mixpanel, etc.)
  // e.g. posthog.capture(event, properties)
}
