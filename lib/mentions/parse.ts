export type MentionableMember = {
  id: string;
  name: string;
  email: string;
};

export function parseMentionedUserIds(
  body: string,
  members: MentionableMember[],
): string[] {
  const lower = body.toLowerCase();
  const mentioned = new Set<string>();

  for (const member of members) {
    const first = member.name.trim().split(/\s+/)[0]?.toLowerCase();
    const emailLocal = member.email.split("@")[0]?.toLowerCase();
    if (first && lower.includes(`@${first}`)) {
      mentioned.add(member.id);
    }
    if (emailLocal && lower.includes(`@${emailLocal}`)) {
      mentioned.add(member.id);
    }
  }

  return [...mentioned];
}

export function highlightMentions(body: string) {
  return body.replace(
    /@([\w.-]+)/g,
    '<span class="font-semibold text-primary">@$1</span>',
  );
}
