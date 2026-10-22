export function assertSameOrganization(
  resourceOrganizationId: string,
  sessionOrganizationId: string,
) {
  if (resourceOrganizationId !== sessionOrganizationId) {
    throw new Error("ORG_FORBIDDEN");
  }
}
