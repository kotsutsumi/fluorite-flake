// 組織名などからスラッグを生成するユーティリティ。
export function toSlug(input: string) {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^(-)+|(-)+$/g, "");

  if (!normalized) {
    return `organization-${Date.now()}`;
  }

  return normalized;
}

// EOF
