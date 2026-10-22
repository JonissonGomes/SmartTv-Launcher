export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter((p): p is string => Boolean(p)).join(' ')
}
