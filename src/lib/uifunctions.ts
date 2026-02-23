export function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
