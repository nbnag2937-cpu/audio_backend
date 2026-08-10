export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RankingPeriod = "today" | "month" | "year" | "all";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getPeriodStartDate(period: RankingPeriod): Date | undefined {
  const nowVN = new Date(Date.now() + VN_OFFSET_MS);

  switch (period) {
    case "today": {
      const startVN = Date.UTC(
        nowVN.getUTCFullYear(),
        nowVN.getUTCMonth(),
        nowVN.getUTCDate(),
      );
      return new Date(startVN - VN_OFFSET_MS);
    }
    case "month": {
      const startVN = Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), 1);
      return new Date(startVN - VN_OFFSET_MS);
    }
    case "year": {
      const startVN = Date.UTC(nowVN.getUTCFullYear(), 0, 1);
      return new Date(startVN - VN_OFFSET_MS);
    }
    case "all":
      return undefined;
  }
}
