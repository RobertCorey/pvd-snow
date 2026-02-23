import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { config } from './config.js';
import type { SnowReport, ReportStatus } from '../../shared/types.js';

let db: Firestore;

export function initFirestore(): Firestore {
  const serviceAccount = JSON.parse(
    readFileSync(config.firebaseServiceAccountPath, 'utf-8')
  ) as ServiceAccount;

  initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore();
  return db;
}

/** Fetch all reports, newest first. */
export async function fetchAllReports(): Promise<(SnowReport & { id: string })[]> {
  const snapshot = await db
    .collection('reports')
    .orderBy('timestamp', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    ...(doc.data() as SnowReport),
    id: doc.id,
  }));
}

/** Fetch a single report by ID. */
export async function fetchReport(id: string): Promise<(SnowReport & { id: string }) | null> {
  const doc = await db.collection('reports').doc(id).get();
  if (!doc.exists) return null;
  return { ...(doc.data() as SnowReport), id: doc.id };
}

/** Update a report's status. */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  detail?: string,
  portalCaseId?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    statusDetail: detail || null,
    statusUpdatedAt: FieldValue.serverTimestamp(),
  };
  if (portalCaseId) {
    update['portalCaseId'] = portalCaseId;
  }
  await db.collection('reports').doc(reportId).update(update);
}
