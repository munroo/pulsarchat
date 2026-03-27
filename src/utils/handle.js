const HANDLE_BODY_LENGTH = 8;
const HANDLE_PREFIX_LENGTH = 4;

export function formatHandleInput(value = "") {
  const compact = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, HANDLE_BODY_LENGTH);

  if (compact.length <= HANDLE_PREFIX_LENGTH) return compact;

  return `${compact.slice(0, HANDLE_PREFIX_LENGTH)}-${compact.slice(HANDLE_PREFIX_LENGTH)}`;
}

export function normalizeHandle(value = "") {
  return formatHandleInput(value.trim());
}
