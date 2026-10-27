/**
 * Seeds a demo workspace for recording the homepage video.
 * Refuses to run against anything but a local database.
 *
 *   DEMO_DATABASE_URL=postgres://qoutefollow:qoutefollow@localhost:5432/qoutefollow_demo npm run demo:seed
 */
import { DEMO_EMAIL, DEMO_PASSWORD } from "./constants";

const url = process.env.DEMO_DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Set DEMO_DATABASE_URL to a local Postgres database.");
  process.exit(1);
}
process.env.DATABASE_URL = url;
// Demo data must never send real email.
delete process.env.RESEND_API_KEY;

async function main() {
  const { sql, eq } = await import("drizzle-orm");
  const { db } = await import("../../lib/db");
  const schema = await import("../../lib/db/schema");
  const { hashPassword } = await import("../../lib/auth/password");
  const { createDefaultFollowUpSequence } = await import("../../lib/organization/defaults");
  const { createQuoteFromInput } = await import("../../lib/quotes/create-quote");
  const { handleCustomerReply } = await import("../../lib/replies/handle-customer-reply");

  // Clear the previous run, including its uploaded PDFs and logo.
  const { rm } = await import("fs/promises");
  const { uploadPathForOrg } = await import("../../lib/storage/uploads");
  for (const { id } of await db.select({ id: schema.organizations.id }).from(schema.organizations)) {
    await rm(uploadPathForOrg(id, ""), { recursive: true, force: true });
  }
  await db.execute(sql`truncate table organizations, users, admin_actions cascade`);

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * day);

  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Alex Rivera",
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      emailVerifiedAt: daysAgo(60),
    })
    .returning();

  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "Lone Star Roofing & Exteriors",
      trade: "roofing",
      slug: "lone-star-roofing-demo",
      replyEmail: DEMO_EMAIL,
      businessPhone: "(512) 555-0148",
      mailingAddress: "2104 Barton Springs Rd, Austin, TX 78704",
      emailSignature: "Alex Rivera\nLone Star Roofing & Exteriors",
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      defaultTaxRate: "8.250",
      createdAt: daysAgo(60),
    })
    .returning();

  const [teammate] = await db
    .insert(schema.users)
    .values({
      name: "Jamie Cole",
      email: "jamie@lonestar-roofing.example",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      emailVerifiedAt: daysAgo(50),
    })
    .returning();

  await db.insert(schema.organizationMembers).values([
    { organizationId: org.id, userId: user.id, role: "owner" },
    { organizationId: org.id, userId: teammate.id, role: "member" },
  ]);

  await db.insert(schema.priceBookItems).values(
    ([
      ["Tear-off and disposal (per sq)", 95],
      ["Architectural shingles, installed (per sq)", 185],
      ["Designer shingles, installed (per sq)", 245],
      ["Synthetic underlayment (per sq)", 22],
      ["Ice & water shield (per roll)", 110],
      ["Ridge vent", 340],
      ["Skylight replacement", 1450],
      ["6\" seamless gutters (per ft)", 14],
      ["Gutter guards (per ft)", 7],
    ] as const).map(([name, price]) => ({ organizationId: org.id, name, unitPrice: price.toFixed(2) })),
  );

  const roofItems = (shingles: [string, number]) => [
    { description: "Tear-off and disposal", quantity: 28, unitPrice: 95 },
    { description: shingles[0], quantity: 28, unitPrice: shingles[1] },
    { description: "Synthetic underlayment", quantity: 28, unitPrice: 22 },
  ];
  await db.insert(schema.quoteTemplates).values([
    {
      organizationId: org.id,
      name: "Roof replacement — Good / Better / Best",
      jobDescription: "Full roof replacement — 28 squares",
      jobType: "Roofing",
      pricing: JSON.stringify({
        options: [
          { name: "Good", items: roofItems(["Architectural shingles, installed", 185]) },
          { name: "Better", items: [...roofItems(["Architectural shingles, installed", 185]), { description: "Ice & water shield", quantity: 4, unitPrice: 110 }, { description: "Ridge vent", quantity: 1, unitPrice: 340 }] },
          { name: "Best", items: [...roofItems(["Designer shingles, installed", 245]), { description: "Ice & water shield", quantity: 4, unitPrice: 110 }, { description: "Ridge vent", quantity: 1, unitPrice: 340 }, { description: "50-year transferable warranty", quantity: 1, unitPrice: 1200 }] },
        ],
        discount: null,
        taxRate: 8.25,
      }),
    },
    {
      organizationId: org.id,
      name: "Seamless gutters",
      jobDescription: "Seamless gutter replacement",
      jobType: "Gutters",
      pricing: JSON.stringify({
        options: [{ name: null, items: [{ description: "6\" seamless gutters", quantity: 150, unitPrice: 14 }, { description: "Downspouts", quantity: 5, unitPrice: 95 }] }],
        discount: null,
        taxRate: 8.25,
      }),
    },
  ]);

  const sequence = await createDefaultFollowUpSequence(org.id);
  const [stormSequence] = await db
    .insert(schema.followUpSequences)
    .values({ organizationId: org.id, name: "Storm season (Day 1, 3, 6)" })
    .returning();
  await db.insert(schema.followUpSteps).values([
    { sequenceId: stormSequence.id, dayOffset: 1, sortOrder: 1, subject: "Your storm damage estimate {{quote_number}}", bodyTemplate: "Hi {{customer_name}},\n\nThanks for having us out after the storm. Your estimate for {{job_description}} ({{quote_amount}}) is ready. Crews are booking up fast — reply here and we'll hold a spot for you." },
    { sequenceId: stormSequence.id, dayOffset: 3, sortOrder: 2, subject: "Holding a crew spot for {{quote_number}}", bodyTemplate: "Hi {{customer_name}},\n\nJust checking in on estimate {{quote_number}}. Happy to walk your insurance adjuster through it if that helps." },
    { sequenceId: stormSequence.id, dayOffset: 6, sortOrder: 3, subject: "Last call on estimate {{quote_number}}", bodyTemplate: "Hi {{customer_name}},\n\nWe're finalizing next week's schedule. If you'd like to go ahead with {{job_description}}, reply and we'll get you on it." },
  ]);

  const steps = await db
    .select()
    .from(schema.followUpSteps)
    .where(eq(schema.followUpSteps.sequenceId, sequence.id))
    .orderBy(schema.followUpSteps.sortOrder);

  type Seed = {
    customer: string;
    job: string;
    items: [string, number, number][];
    age: number;
    status: "pending" | "accepted" | "declined" | "expired";
    views?: number;
  };

  const seeds: Seed[] = [
    { customer: "Jordan Miller", job: "Roof replacement — 28 sq architectural shingles", items: [["Tear-off and disposal", 28, 95], ["GAF Timberline HDZ shingles, installed", 28, 185], ["Synthetic underlayment & ice shield", 1, 610], ["Ridge vent", 1, 340]], age: 1, status: "pending", views: 2 },
    { customer: "Priya Shah", job: "Storm damage repair — north slope", items: [["Replace damaged shingles (3 sq)", 3, 420], ["Flashing repair at chimney", 1, 685]], age: 4, status: "pending", views: 3 },
    { customer: "Marcus Bell", job: "Metal roof install — detached garage", items: [["26ga standing seam panels", 9, 640], ["Trim and closures", 1, 920]], age: 6, status: "pending", views: 1 },
    { customer: "Elena Garza", job: "Gutter replacement — 180 ft seamless", items: [["6\" seamless aluminum gutters", 180, 14], ["Downspouts", 6, 95], ["Leaf guards", 180, 7]], age: 8, status: "pending", views: 4 },
    { customer: "Tom Whitaker", job: "Full re-roof with skylight replacement", items: [["Re-roof, 32 sq", 32, 290], ["Velux skylight replacement", 2, 1450]], age: 3, status: "pending" },
    { customer: "Sofia Nguyen", job: "Roof inspection & minor repairs", items: [["Inspection and report", 1, 225], ["Seal pipe boots", 4, 85]], age: 12, status: "accepted", views: 3 },
    { customer: "David Okafor", job: "Roof replacement — 24 sq", items: [["Re-roof, 24 sq", 24, 310], ["Drip edge", 1, 480]], age: 18, status: "accepted", views: 5 },
    { customer: "Rachel Kim", job: "Attic ventilation upgrade", items: [["Solar attic fans", 2, 690], ["Soffit vents", 10, 45]], age: 15, status: "accepted", views: 2 },
    { customer: "Luis Herrera", job: "Hail damage roof replacement", items: [["Re-roof, 30 sq (insurance scope)", 30, 335]], age: 26, status: "accepted", views: 6 },
    { customer: "Hannah Brooks", job: "Fascia & soffit replacement", items: [["Fascia board, 120 ft", 120, 18], ["Vented soffit", 120, 16]], age: 22, status: "declined", views: 1 },
    { customer: "Chris Patel", job: "Flat roof coating — commercial", items: [["Silicone roof coating", 4200, 3.4]], age: 34, status: "expired" },
    { customer: "Megan Torres", job: "Chimney flashing & cricket", items: [["Chimney cricket", 1, 1150], ["Step & counter flashing", 1, 780]], age: 10, status: "pending", views: 2 },
  ];

  // Older, decided quotes so the monthly win-rate chart has history.
  const pastCustomers = ["Ava Johnson", "Noah Williams", "Mia Brown", "Ethan Davis", "Isabella Lopez", "Logan Wilson", "Chloe Anderson", "Lucas Thomas", "Grace Martin", "Mason Lee", "Zoe Clark", "Caleb Lewis", "Lily Walker", "Owen Hall", "Nora Allen", "Wyatt Young"];
  const pastJobs: [string, [string, number, number][]][] = [
    ["Roof replacement — 26 sq", [["Re-roof, 26 sq", 26, 305]]],
    ["Leak repair at valley", [["Valley repair and re-flash", 1, 890]]],
    ["Seamless gutters — 140 ft", [["6\" seamless gutters", 140, 14], ["Downspouts", 5, 95]]],
    ["Storm damage repair", [["Replace damaged shingles (4 sq)", 4, 410]]],
  ];
  pastCustomers.forEach((customer, i) => {
    const [job, items] = pastJobs[i % pastJobs.length];
    seeds.push({
      customer,
      job,
      items,
      age: 40 + i * 8,
      status: i % 3 === 2 ? "declined" : i % 5 === 4 ? "expired" : "accepted",
      views: 1 + (i % 4),
    });
  });
  // Oldest first, so quote numbers rise with the date.
  seeds.sort((a, b) => b.age - a.age);

  const quoteIds: Record<string, string> = {};

  for (const [index, seed] of seeds.entries()) {
    const slug = seed.customer.toLowerCase().replace(/[^a-z]+/g, ".");
    const quote = await createQuoteFromInput({
      organizationId: org.id,
      userId: user.id,
      customerName: seed.customer,
      customerEmail: `${slug}@example.com`,
      pricing: {
        options: [{ name: null, items: seed.items.map(([description, quantity, unitPrice]) => ({ description, quantity, unitPrice })) }],
        discount: null,
        taxRate: 8.25,
      },
      jobType: /gutter/i.test(seed.job) ? "Gutters" : /repair|flashing|inspection/i.test(seed.job) ? "Repairs" : "Roofing",
      jobDescription: seed.job,
      quoteDate: daysAgo(seed.age),
      expiresAt: new Date(now + (30 - seed.age) * day),
      status: "draft",
      followUpsEnabled: true,
      contactConfirmed: true,
      // The app's own numbering, oldest first.
      quoteNumberOverride: `QF-${String(index + 1).padStart(4, "0")}`,
      // Split the work between the two of them for the salesperson report.
      assignedUserId: index % 3 === 1 ? teammate.id : user.id,
    });
    quoteIds[seed.customer] = quote.id;

    const sentAt = daysAgo(seed.age);
    const accepted = seed.status === "accepted";
    const acceptedAt = accepted ? daysAgo(Math.max(seed.age - 6, 1)) : null;
    await db
      .update(schema.quotes)
      .set({
        status: seed.status,
        approvedAt: sentAt,
        sentAt,
        createdAt: sentAt,
        updatedAt: acceptedAt ?? sentAt,
        acceptedAt,
        acceptedName: accepted ? seed.customer : null,
        viewCount: seed.views ?? 0,
        firstViewedAt: seed.views ? new Date(sentAt.getTime() + 3 * 60 * 60 * 1000) : null,
        lastViewedAt: seed.views ? daysAgo(Math.max(seed.age - 2, 0)) : null,
      })
      .where(eq(schema.quotes.id, quote.id));

    // Follow-up history: earlier steps sent, later ones still scheduled.
    const closedAt = acceptedAt?.getTime() ?? (seed.status === "pending" ? Infinity : sentAt.getTime() + 20 * day);
    await db.insert(schema.scheduledFollowUps).values(
      steps.map((step) => {
        const at = new Date(sentAt.getTime() + step.dayOffset * day + 9 * 60 * 60 * 1000);
        const due = at.getTime() <= now;
        const status = at.getTime() > closedAt ? "cancelled" : due ? "sent" : "scheduled";
        return {
          organizationId: org.id,
          quoteId: quote.id,
          stepId: step.id,
          scheduledFor: at,
          status: status as "sent" | "scheduled" | "cancelled",
          sentAt: status === "sent" ? at : null,
          idempotencyKey: `demo-${quote.id}-${step.id}`,
        };
      }),
    );
  }

  // A reply that pauses follow-ups, as the inbound-email webhook would record it.
  await handleCustomerReply({
    organizationId: org.id,
    quoteId: quoteIds["Elena Garza"],
    fromEmail: "elena.garza@example.com",
    subject: "Re: Following up on your estimate",
    body: "Hi Alex, thanks for checking in! We'd like to go ahead with the gutters. Could your crew start the week of the 10th?",
  });

  // The OpenAI classifier's read of that reply.
  await db
    .update(schema.conversations)
    .set({
      replyClassification: "interested",
      suggestedQuoteStatus: "accepted",
      aiSummary: "Wants to go ahead with the gutters and asks to start the week of the 10th.",
    })
    .where(eq(schema.conversations.quoteId, quoteIds["Elena Garza"]));
  await db
    .update(schema.notifications)
    .set({ body: "elena.garza@example.com replied. AI read: Wants to go ahead with the gutters and asks to start the week of the 10th. Suggested status: accepted. Automation is paused until you update the quote." })
    .where(eq(schema.notifications.quoteId, quoteIds["Elena Garza"]));

  await db.insert(schema.quoteInternalNotes).values({
    organizationId: org.id,
    quoteId: quoteIds["Jordan Miller"],
    userId: teammate.id,
    body: "Walked the roof with Jordan — some decking is soft by the chimney. Worth mentioning on the call.",
    createdAt: daysAgo(1),
  });

  console.log(`Seeded ${seeds.length} quotes. Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
