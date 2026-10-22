export const CLASSIFICATION_LABELS: Record<string, string> = {
  interested: "Interested / ready to move forward",
  needs_time: "Needs more time",
  declined: "Declined or not interested",
  wrong_contact: "Wrong contact or number",
  question: "Question — needs your answer",
  unknown: "Unclear — review manually",
};

export function formatClassificationLabel(classification: string | null) {
  if (!classification) {
    return null;
  }
  return CLASSIFICATION_LABELS[classification] ?? classification;
}
