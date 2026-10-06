import { z } from 'zod';
import { careStepSchema, faqItemSchema, priceSchema } from './content';

// NANO-07 staff workspace core and content governance (STF-01–04, 08, 09, 12–14, 36, 38–42; ADMIN, D34–D36).
// Every write carries the version it was based on; a mismatch is 409 `conflict` and is never overwritten.

const isoTime = z.iso.datetime({ offset: true });
const version = z.number().int().positive();
export const ROLES = ['Owner', 'Editor', 'Front desk'] as const;
export const staffRoleSchema = z.enum(ROLES);

/** The editable part of a service (STF-03 sections; STF-40 FAQ). Live fields change only on publish. */
export const serviceDraftSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: z.string().min(1).max(80),
  aliases: z.array(z.string().trim().min(1).max(40)).max(20),
  concerns: z.array(z.string().min(1).max(80)).max(20),
  description: z.string().trim().max(2000).nullable(),
  price: priceSchema,
  durationLabel: z.string().trim().max(40).nullable(),
  durationMin: z.number().int().positive().max(600).nullable(),
  /** `media:<id>` (STF-36) or a bundled image key. */
  photo: z
    .string()
    .regex(/^(media:[0-9a-f-]{36}|[a-z0-9-]{3,40})$/, 'Choose a photo from Media')
    .nullable(),
  professionals: z.array(z.string().min(1).max(80)).max(20),
  faq: z.array(faqItemSchema.extend({ q: z.string().trim().min(3).max(200), a: z.string().trim().min(3).max(2000) })).max(30),
  care: z.array(careStepSchema).max(20),
  /** live = bookable; unavailable = shown, not bookable. */
  visibility: z.enum(['live', 'unavailable']),
});
export type ServiceDraft = z.infer<typeof serviceDraftSchema>;

export const publishStateSchema = z.enum(['draft', 'review', 'live', 'unavailable', 'archived']);
export type PublishState = z.infer<typeof publishStateSchema>;

export const staffServiceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryName: z.string().nullable(),
  state: publishStateSchema,
  /** Unpublished edits exist on top of the live version. */
  hasDraft: z.boolean(),
  price: priceSchema,
  archivedAt: isoTime.nullable(),
  /** Never published: may be deleted (D36). */
  deletable: z.boolean(),
  version,
});
export type StaffServiceRow = z.infer<typeof staffServiceRowSchema>;

export const staffServiceSchema = z.object({
  id: z.string(),
  state: publishStateSchema,
  version,
  /** What staff are editing: the draft if one exists, otherwise the live fields. */
  draft: serviceDraftSchema,
  /** What customers see now; null while never published. */
  live: serviceDraftSchema.nullable(),
  /** High-risk fields that differ from live (price, price type) — they trigger the price-change notice. */
  highRiskChanges: z.array(z.string()),
  /** Publish blockers, e.g. "Add a duration", "Add alt text for the photo". */
  missing: z.array(z.string()),
  waitingApproval: z.object({ id: z.string(), submittedByMe: z.boolean() }).nullable(),
  updatedAt: isoTime.nullable(),
  deletable: z.boolean(),
});
export type StaffService = z.infer<typeof staffServiceSchema>;

export const versionedSchema = z.object({ version });
export const saveDraftSchema = z.object({ version, draft: serviceDraftSchema });
export const createServiceSchema = z.object({ draft: serviceDraftSchema });
export const publishResultSchema = z.object({
  /** published = customers see it now; waiting = needs a second approver (D35). */
  outcome: z.enum(['published', 'waiting']),
  service: staffServiceSchema,
});

export const categoryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  treatments: z.number().int(),
  archived: z.boolean(),
  deletable: z.boolean(),
  version,
});
export type CategoryRow = z.infer<typeof categoryRowSchema>;
export const categoryCreateSchema = z.object({ name: z.string().trim().min(2).max(60) });
export const categoryRenameSchema = z.object({ version, name: z.string().trim().min(2).max(60) });
export const moveServiceSchema = z.object({ version, categoryId: z.string().min(1).max(80) });

export const approvalSchema = z.object({
  id: z.string(),
  itemType: z.enum(['service', 'package', 'campaign', 'promo', 'professional', 'policy']),
  itemId: z.string(),
  itemName: z.string(),
  summary: z.string(),
  fields: z.array(z.string()),
  submittedBy: z.string(),
  submittedByMe: z.boolean(),
  createdAt: isoTime,
});
export type Approval = z.infer<typeof approvalSchema>;
export const approvalsResponseSchema = z.object({
  secondApprover: z.boolean(),
  waiting: z.array(approvalSchema),
  recent: z.array(z.object({ item: z.string(), by: z.string(), at: isoTime })),
});
export const approvalDecisionSchema = z
  .object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().min(3).max(500).optional() })
  .refine((v) => v.decision === 'approve' || !!v.reason, { message: 'A reason is required to send it back', path: ['reason'] });

export const auditEntrySchema = z.object({
  id: z.string(),
  actor: z.string(),
  roles: z.string(),
  item: z.string(),
  field: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  reason: z.string().nullable(),
  device: z.string().nullable(),
  at: isoTime,
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phoneMasked: z.string(),
  roles: z.array(staffRoleSchema),
  status: z.enum(['active', 'invited', 'removed']),
  since: isoTime.nullable(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;
export const inviteSchema = z.object({ phone: z.string().min(7).max(32), roles: z.array(staffRoleSchema).min(1) });
export const rolesUpdateSchema = z.object({ roles: z.array(staffRoleSchema).min(1) });

export const mediaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  altText: z.string().nullable(),
  rightsConfirmed: z.boolean(),
  status: z.enum(['draft', 'active', 'archived']),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  sizeBytes: z.number().int(),
  inUse: z.number().int(),
  version,
  createdAt: isoTime,
});
export type Media = z.infer<typeof mediaSchema>;
export const mediaUploadSchema = z.object({
  filename: z.string().trim().min(1).max(120),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  /** Base64 file contents (development storage; max ~5 MB). */
  data: z.string().min(10).max(7_000_000),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});
export const mediaUpdateSchema = z.object({ version, altText: z.string().trim().max(250).nullable(), rightsConfirmed: z.boolean() });

// ---------- Import (STF-41/42) ----------

export const importFieldSchema = z.enum(['name', 'category', 'price', 'duration', 'description']);
export type ImportField = z.infer<typeof importFieldSchema>;
export const importCreateSchema = z.object({ filename: z.string().trim().min(1).max(120), csv: z.string().min(1).max(2_000_000) });
export const importSchema = z.object({
  id: z.string(),
  filename: z.string(),
  header: z.array(z.string()),
  rowCount: z.number().int(),
  /** Column header chosen for each field, or null when not matched. */
  mapping: z.record(importFieldSchema, z.string().nullable()),
  missingRequired: z.array(importFieldSchema),
  status: z.enum(['draft', 'published']),
});
export type ImportJob = z.infer<typeof importSchema>;
export const importMappingSchema = z.object({ mapping: z.record(importFieldSchema, z.string().nullable()) });
export const importRowSchema = z.object({
  index: z.number().int(),
  name: z.string(),
  category: z.string(),
  /** conflict = the service has unpublished edits or a waiting approval; the import leaves it alone. */
  kind: z.enum(['new', 'changed', 'unchanged', 'duplicate', 'invalid', 'conflict']),
  /** Changed: what differs, e.g. "price $55 → $50 per area". Invalid: why. */
  detail: z.string().nullable(),
  matchId: z.string().nullable(),
  decision: z.enum(['keep', 'replace', 'both', 'skip']).nullable(),
});
export type ImportRow = z.infer<typeof importRowSchema>;
export const importReviewSchema = z.object({
  import: importSchema,
  rows: z.array(importRowSchema),
  counts: z.object({ new: z.number().int(), changed: z.number().int(), duplicate: z.number().int(), unresolved: z.number().int(), invalid: z.number().int(), conflict: z.number().int() }),
  result: z.object({ created: z.number().int(), updated: z.number().int(), skipped: z.number().int(), waiting: z.number().int() }).nullable(),
});
export type ImportReview = z.infer<typeof importReviewSchema>;
export const importDecisionsSchema = z.object({ decisions: z.record(z.string().regex(/^\d+$/), z.enum(['keep', 'replace', 'both', 'skip'])) });

export const staffSummarySchema = z.object({ myWaiting: z.number().int(), waitingApprovals: z.number().int(), secondApprover: z.boolean() });
