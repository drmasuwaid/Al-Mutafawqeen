/** Collapse Arabic letter variants and strip diacritics for search. */
export function normalizeArabic(input: string) {
  return input
    .normalize("NFKC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function arabicMatches(haystack: string, query: string) {
  const needle = normalizeArabic(query);
  if (!needle) return true;
  const hay = normalizeArabic(haystack);
  if (!hay) return false;
  if (hay.includes(needle)) return true;
  return needle.split(" ").every((token) => token && hay.includes(token));
}

export function teacherMatchesQuery(
  teacher: { displayNameAr: string; username: string },
  query: string
) {
  return arabicMatches(teacher.displayNameAr, query) || arabicMatches(teacher.username, query);
}

export function normalizeUsername(input: string) {
  return normalizeArabic(input).replace(/\s+/g, "");
}

export function usernamesMatch(a: string, b: string) {
  return Boolean(normalizeUsername(a)) && normalizeUsername(a) === normalizeUsername(b);
}
