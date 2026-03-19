/**
 * News Type Constants
 */
export const NewsType = {
  Support: "hotro",
  Promotion: "khuyenmai",
  News: "tintuc",
} as const;

/**
 * News Type Labels (Vietnamese)
 */
export const NewsTypeLabels: Record<string, string> = {
  [NewsType.Support]: "Tin hỗ trợ",
  [NewsType.Promotion]: "Tin khuyến mãi",
  [NewsType.News]: "Tin tức",
};

/**
 * Array of all news types
 */
export const AllNewsTypes = [
  NewsType.Support,
  NewsType.Promotion,
  NewsType.News,
] as const;

/**
 * Type guard to check if a string is a valid NewsType
 */
export function isValidNewsType(type: string): type is typeof NewsType[keyof typeof NewsType] {
  return AllNewsTypes.includes(type as any);
}

/**
 * Get label for a news type
 */
export function getNewsTypeLabel(type: string): string {
  return NewsTypeLabels[type] || type;
}
