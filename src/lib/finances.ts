export type Schedule =
  | { type: "monthly";   dayOfMonth: number }
  | { type: "weekly";    dayOfWeek: number }
  | { type: "biweekly";  anchorDate: string }
  | { type: "yearly";    month: number; day: number }
  | { type: "quarterly"; anchorDate: string }
  | { type: "once";      date: string };

export type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  schedule: Schedule;
  category: string;
  endDate?: string;
  active: boolean;
};

export function itemAppliesToDate(item: RecurringItem, dateStr: string): boolean {
  if (!item.active) return false;
  if (item.endDate && dateStr > item.endDate) return false;
  const date = new Date(dateStr + "T00:00:00");
  switch (item.schedule.type) {
    case "monthly":   return date.getDate() === item.schedule.dayOfMonth;
    case "weekly":    return date.getDay()  === item.schedule.dayOfWeek;
    case "biweekly": {
      const anchor = new Date(item.schedule.anchorDate + "T00:00:00");
      const diff   = Math.round((date.getTime() - anchor.getTime()) / 86400000);
      return diff >= 0 && diff % 14 === 0;
    }
    case "yearly":    return (date.getMonth() + 1) === item.schedule.month && date.getDate() === item.schedule.day;
    case "quarterly": {
      const anchor = new Date(item.schedule.anchorDate + "T00:00:00");
      const diff   = Math.round((date.getTime() - anchor.getTime()) / 86400000);
      return diff >= 0 && diff % 91 === 0;
    }
    case "once": return dateStr === item.schedule.date;
  }
}
