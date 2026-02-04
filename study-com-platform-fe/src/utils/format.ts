export const formatDateTime = (value?: string | number | Date) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString();
};
