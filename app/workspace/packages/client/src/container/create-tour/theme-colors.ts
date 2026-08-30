export function isValidThemeColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color);
}
