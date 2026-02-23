/**
 * Shared types for PVD Snow
 * Used by both the PWA (public/app.js) and the automation layer (automation/)
 */

export const CATEGORIES = {
  unshoveled_sidewalk: {
    label: 'Unshoveled Sidewalk',
    portalCaseTypeGuid: 'b8e7b671-7a2e-ef11-840a-001dd8039400',
    portalSearchTerm: '*shoveled*',
  },
  missed_plowing: {
    label: 'Missed Street Plowing',
    portalCaseTypeGuid: '5ae8b671-7a2e-ef11-840a-001dd8039400',
    portalSearchTerm: '*plowing*',
  },
} as const;

export type Category = keyof typeof CATEGORIES;

export type ReportStatus =
  | 'pending'      // Created by PWA, waiting for automation
  | 'processing'   // Automation has picked it up
  | 'submitted'    // Successfully submitted to 311 portal
  | 'failed';      // Automation failed (see statusDetail)

export interface SnowReport {
  /** Firestore document ID (not stored in doc, used as reference) */
  id?: string;

  /** Server timestamp of creation */
  timestamp: FirebaseFirestore.Timestamp | null;

  /** Issue category */
  category: Category;

  /** Human-readable address string */
  address: string;

  /** GPS latitude (may be null if manually entered) */
  lat: number | null;

  /** GPS longitude (may be null if manually entered) */
  lng: number | null;

  /** Optional description from the reporter */
  description: string | null;

  /** Photo as base64 data URL */
  photo: string | null;

  /** Optional reporter name */
  reporterName: string | null;

  /** Optional reporter email */
  reporterEmail: string | null;

  /** Processing status for the automation pipeline */
  status: ReportStatus;

  /** Human-readable detail about status (e.g. error message, case ID) */
  statusDetail: string | null;

  /** PVD 311 case ID if successfully submitted (e.g. "PVD2026-72841") */
  portalCaseId: string | null;

  /** Timestamp of last status update by automation */
  statusUpdatedAt: FirebaseFirestore.Timestamp | null;
}
