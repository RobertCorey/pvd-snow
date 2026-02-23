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
};
