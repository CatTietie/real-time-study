export const buildQuery = (
  params: Record<string, string | number | boolean | null | undefined>,
) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.append(key, String(value));
    }
  });
  return search.toString();
};
