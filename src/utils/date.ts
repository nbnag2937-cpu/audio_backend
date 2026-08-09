export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RankingPeriod = "today" | "month" | "year" | "all";

export function getPeriodStartDate(period: RankingPeriod): Date | undefined {
  const now = new Date();

  switch (period) {
    case "today":
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
    case "month":
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    case "year":
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    case "all":
      return undefined;
  }
}
