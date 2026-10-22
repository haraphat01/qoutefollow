export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function uniqueSlug(base: string, suffix: string) {
  const slug = slugify(base);
  return slug ? `${slug}-${suffix}` : `org-${suffix}`;
}
