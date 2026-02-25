import 'dotenv/config';

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const config = {
  firebaseServiceAccountPath: required('FIREBASE_SERVICE_ACCOUNT_PATH'),
  portalEmail: required('PORTAL_EMAIL'),
  portalPassword: required('PORTAL_PASSWORD'),
  portalBaseUrl: 'https://311.providenceri.gov',
  headless: process.env['HEADLESS'] === 'true',
  port: parseInt(process.env['PORT'] || '3311', 10),

  // Auto-submission mode
  autoMode: process.argv.includes('--auto'),
  autoPollIntervalMs: 60_000,          // Check for pending reports every 60s
  autoSubmissionDelayMs: 45_000,       // Minimum gap between submissions
  autoMaxPerHour: 15,                  // Max submissions per rolling hour
  autoCircuitBreakerThreshold: 3,      // Pause after N consecutive failures
  autoDuplicateWindowHours: 24,        // Duplicate detection window
  autoDuplicateDistanceMeters: 50,     // Haversine distance threshold
};
