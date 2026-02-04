export const hasPermission = (
  permissions: string[],
  required: string,
): boolean => {
  return permissions.includes(required);
};
