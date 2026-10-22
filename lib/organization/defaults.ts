import { db } from "@/lib/db";
import { followUpSequences, followUpSteps } from "@/lib/db/schema";

export const DEFAULT_FOLLOW_UP_STEPS = [
  {
    dayOffset: 2,
    sortOrder: 1,
    subject: "Following up on your estimate {{quote_number}}",
    bodyTemplate:
      "Hi {{customer_name}},\n\nI wanted to check in about your {{job_description}} estimate ({{quote_number}}) for {{quote_amount}}. Do you have any questions, or would you like to move forward?\n\nYou can reply to this email or reach us at {{reply_email}}.",
  },
  {
    dayOffset: 5,
    sortOrder: 2,
    subject: "Quick check-in on quote {{quote_number}}",
    bodyTemplate:
      "Hi {{customer_name}},\n\nJust following up on estimate {{quote_number}} for {{job_description}} ({{quote_amount}}). Let me know if you would like to schedule the work or need any changes before {{expires_at}}.",
  },
  {
    dayOffset: 9,
    sortOrder: 3,
    subject: "Final reminder — estimate {{quote_number}}",
    bodyTemplate:
      "Hi {{customer_name}},\n\nThis is a final reminder about estimate {{quote_number}} for {{job_description}} ({{quote_amount}}). If you are still interested, reply here and we will get you on the schedule.",
  },
] as const;

export async function createDefaultFollowUpSequence(organizationId: string) {
  const [sequence] = await db
    .insert(followUpSequences)
    .values({
      organizationId,
      name: "Standard (Day 2, 5, 9)",
      isDefault: true,
    })
    .returning();

  await db.insert(followUpSteps).values(
    DEFAULT_FOLLOW_UP_STEPS.map((step) => ({
      sequenceId: sequence.id,
      ...step,
    })),
  );

  return sequence;
}
