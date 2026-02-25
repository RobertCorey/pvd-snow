import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { config } from './config.js';
import type { SnowReport, ReportStatus } from '../../shared/types.js';

let db: Firestore;

// ── In-memory cache to reduce Firestore reads ──
const CACHE_TTL_MS = 60_000; // 60 seconds
let allReportsCache: { data: (SnowReport & { id: string })[]; ts: number } | null = null;
let pendingCache: { data: (SnowReport & { id: string })[]; ts: number } | null = null;

/** Invalidate caches (call after any status update so next read is fresh). */
export function invalidateCache(): void {
  allReportsCache = null;
  pendingCache = null;
}

export function initFirestore(): Firestore {
  const serviceAccount = JSON.parse(
    readFileSync(config.firebaseServiceAccountPath, 'utf-8')
  ) as ServiceAccount;

  initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore();
  return db;
}

/** Fetch recent reports, newest first (capped at 200, cached 60s). */
export async function fetchAllReports(): Promise<(SnowReport & { id: string })[]> {
  if (allReportsCache && Date.now() - allReportsCache.ts < CACHE_TTL_MS) {
    return allReportsCache.data;
  }

  const snapshot = await db
    .collection('reports')
    .orderBy('timestamp', 'desc')
    .limit(200)
    .get();

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as SnowReport),
    id: doc.id,
  }));

  allReportsCache = { data, ts: Date.now() };
  return data;
}

/** Fetch a single report by ID. */
export async function fetchReport(id: string): Promise<(SnowReport & { id: string }) | null> {
  const doc = await db.collection('reports').doc(id).get();
  if (!doc.exists) return null;
  return { ...(doc.data() as SnowReport), id: doc.id };
}

/** Fetch pending reports ordered oldest-first (FIFO, cached 60s). */
export async function fetchPendingReports(): Promise<(SnowReport & { id: string })[]> {
  if (pendingCache && Date.now() - pendingCache.ts < CACHE_TTL_MS) {
    return pendingCache.data;
  }

  const snapshot = await db
    .collection('reports')
    .where('status', '==', 'pending')
    .get();

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as SnowReport),
    id: doc.id,
  }));

  data.sort((a, b) => {
    const aTime = a.timestamp?.seconds ?? 0;
    const bTime = b.timestamp?.seconds ?? 0;
    return aTime - bTime;
  });

  pendingCache = { data, ts: Date.now() };
  return data;
}

/** Fetch submitted reports from the last N hours (for duplicate detection). */
export async function findRecentSubmissions(windowHours: number): Promise<(SnowReport & { id: string })[]> {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const snapshot = await db
    .collection('reports')
    .where('status', '==', 'submitted')
    .where('statusUpdatedAt', '>=', Timestamp.fromDate(cutoff))
    .get();

  return snapshot.docs.map((doc) => ({
    ...(doc.data() as SnowReport),
    id: doc.id,
  }));
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
  invalidateCache();
}
