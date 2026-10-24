import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tradeEnum = pgEnum("trade", [
  "roofing",
  "hvac",
  "plumbing",
  "other",
]);

export const userRoleEnum = pgEnum("user_role", ["owner", "member"]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "paused",
  "expired",
]);

export const scheduledFollowUpStatusEnum = pgEnum("scheduled_follow_up_status", [
  "scheduled",
  "processing",
  "sent",
  "skipped",
  "cancelled",
  "failed",
]);

export const documentExtractionStatusEnum = pgEnum(
  "document_extraction_status",
  ["processing", "ready", "failed"],
);

export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent",
  "delivered",
  "bounced",
  "complained",
  "opened",
  "clicked",
  "received",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "none",
  "starter",
  "growth",
  "pro",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  trade: tradeEnum("trade").notNull().default("other"),
  slug: text("slug").notNull().unique(),
  replyEmail: text("reply_email"),
  businessPhone: text("business_phone"),
  emailSignature: text("email_signature"),
  mailingAddress: text("mailing_address"),
  sendTimezone: text("send_timezone").notNull().default("America/Chicago"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan")
    .notNull()
    .default("none"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("none"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  /** Set by a platform admin: members can't sign in and follow-ups stop. */
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  /** Uploaded PNG/JPEG shown on quotes, PDFs and customer emails. */
  logoPath: text("logo_path"),
  /** Pre-filled on new quotes, as a percentage (8.25 = 8.25%). */
  defaultTaxRate: numeric("default_tax_rate", { precision: 6, scale: 3 }).notNull().default("0"),
  weeklySummaryEnabled: boolean("weekly_summary_enabled").notNull().default(true),
  lastWeeklySummaryAt: timestamp("last_weekly_summary_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  /**
   * Defaults to now() so accounts that existed before verification was added
   * count as verified. New signups and invites insert null explicitly.
   */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }).defaultNow(),
  /** Set by a platform admin: the user can't sign in. */
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authTokenTypeEnum = pgEnum("auth_token_type", [
  "email_verification",
  "password_reset",
  "team_invite",
]);

/** Single-use emailed links. Only the SHA-256 of the token is stored. */
export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: authTokenTypeEnum("type").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const followUpSequences = pgTable("follow_up_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  /** Archived sequences are hidden but kept so past follow-up history survives. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const followUpSteps = pgTable("follow_up_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceId: uuid("sequence_id")
    .notNull()
    .references(() => followUpSequences.id, { onDelete: "cascade" }),
  dayOffset: integer("day_offset").notNull(),
  subject: text("subject").notNull(),
  bodyTemplate: text("body_template").notNull(),
  sortOrder: integer("sort_order").notNull(),
  /** Removed steps are archived so sent follow-ups keep their step record. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  quoteNumber: text("quote_number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  jobDescription: text("job_description").notNull(),
  quoteDate: timestamp("quote_date", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  notes: text("notes"),
  status: quoteStatusEnum("status").notNull().default("draft"),
  followUpsEnabled: boolean("follow_ups_enabled").notNull().default(true),
  contactConfirmed: boolean("contact_confirmed").notNull().default(true),
  sequenceId: uuid("sequence_id").references(() => followUpSequences.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  /** Last time the estimate itself was emailed to the customer. */
  sentAt: timestamp("sent_at", { withTimezone: true }),
  /** Unguessable id for the customer's online quote page (/q/<token>). */
  publicToken: text("public_token"),
  jobType: text("job_type"),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  discountType: text("discount_type"),
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 3 }).notNull().default("0"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedName: text("accepted_name"),
  acceptedOptionId: uuid("accepted_option_id"),
  acceptedIp: text("accepted_ip"),
  acceptedUserAgent: text("accepted_user_agent"),
  viewCount: integer("view_count").notNull().default(0),
  firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  // Not unique: adding a unique constraint to an existing table makes
  // drizzle-kit offer to truncate it. The 24-byte random tokens don't collide.
  index("quotes_public_token_idx").on(table.publicToken),
]);

/** Good / Better / Best choices; a quote without options has no rows here. */
export const quoteOptions = pgTable("quote_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

/** Itemized lines; quotes.amount holds the total (of the chosen or first option). */
export const quoteLineItems = pgTable("quote_line_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  optionId: uuid("option_id").references(() => quoteOptions.id, {
    onDelete: "cascade",
  }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quoteDocuments = pgTable("quote_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  extractedText: text("extracted_text"),
  extractionStatus: documentExtractionStatusEnum("extraction_status")
    .notNull()
    .default("processing"),
  extractionMethod: text("extraction_method"),
  extractedPayload: text("extracted_payload"),
  extractionError: text("extraction_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scheduledFollowUps = pgTable("scheduled_follow_ups", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  stepId: uuid("step_id")
    .notNull()
    .references(() => followUpSteps.id, { onDelete: "cascade" }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: scheduledFollowUpStatusEnum("status").notNull().default("scheduled"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  providerMessageId: text("provider_message_id"),
  processingStartedAt: timestamp("processing_started_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emailSuppressions = pgTable("email_suppressions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  reason: text("reason").notNull(),
  sourceQuoteId: uuid("source_quote_id").references(() => quotes.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emailEvents = pgTable("email_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  scheduledFollowUpId: uuid("scheduled_follow_up_id").references(
    () => scheduledFollowUps.id,
    { onDelete: "set null" },
  ),
  quoteId: uuid("quote_id").references(() => quotes.id, {
    onDelete: "set null",
  }),
  providerMessageId: text("provider_message_id"),
  eventType: emailEventTypeEnum("event_type").notNull(),
  payload: text("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quoteInternalNotes = pgTable("quote_internal_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  mentionedUserIds: text("mentioned_user_ids"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  fromEmail: text("from_email"),
  toEmail: text("to_email"),
  replyClassification: text("reply_classification"),
  suggestedQuoteStatus: text("suggested_quote_status"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Reusable items with a saved price. */
export const priceBookItems = pgTable("price_book_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A saved starting point for new quotes; `pricing` is the editor's JSON. */
export const quoteTemplates = pgTable("quote_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  jobDescription: text("job_description").notNull(),
  jobType: text("job_type"),
  pricing: text("pricing").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Audit trail of platform-admin actions; survives deletion of the target. */
export const adminActions = pgTable("admin_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminUserId: uuid("admin_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id"),
  targetLabel: text("target_label").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  customers: many(customers),
  quotes: many(quotes),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  sessions: many(sessions),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  }),
);

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [quotes.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  sequence: one(followUpSequences, {
    fields: [quotes.sequenceId],
    references: [followUpSequences.id],
  }),
  scheduledFollowUps: many(scheduledFollowUps),
  internalNotes: many(quoteInternalNotes),
}));

export const quoteInternalNotesRelations = relations(
  quoteInternalNotes,
  ({ one }) => ({
    quote: one(quotes, {
      fields: [quoteInternalNotes.quoteId],
      references: [quotes.id],
    }),
    author: one(users, {
      fields: [quoteInternalNotes.userId],
      references: [users.id],
    }),
  }),
);

export const followUpSequencesRelations = relations(
  followUpSequences,
  ({ many }) => ({
    steps: many(followUpSteps),
  }),
);

export const followUpStepsRelations = relations(followUpSteps, ({ one }) => ({
  sequence: one(followUpSequences, {
    fields: [followUpSteps.sequenceId],
    references: [followUpSequences.id],
  }),
}));
