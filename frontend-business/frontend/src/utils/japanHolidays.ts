/**
 * Japan public holidays.
 * Fixed holidays + computed moveable ones (Happy Monday, spring/autumnal equinox approximations).
 * Returns a Set of "YYYY-MM-DD" strings for the requested year.
 */

// Vernal equinox: roughly March 20-21, autumnal: September 22-23
// Using Cabinet Office published formulas (simplified)
function vernalEquinox(year: number): number {
  if (year <= 1979) return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  if (year <= 2099) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return Math.floor(21.8510 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinox(year: number): number {
  if (year <= 1979) return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  if (year <= 2099) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return Math.floor(24.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// nth Monday of a month (n=1 is first)
function nthMonday(year: number, month: number, n: number): number {
  const first = new Date(year, month - 1, 1);
  const firstMonday = first.getDay() === 1 ? 1 : 1 + ((8 - first.getDay()) % 7);
  return firstMonday + (n - 1) * 7;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function d(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getJapanHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  const addHoliday = (month: number, day: number) => {
    holidays.add(d(year, month, day));
  };

  // Fixed holidays
  addHoliday(1, 1);   // 元日
  addHoliday(2, 11);  // 建国記念の日
  addHoliday(2, 23);  // 天皇誕生日
  addHoliday(4, 29);  // 昭和の日
  addHoliday(5, 3);   // 憲法記念日
  addHoliday(5, 4);   // みどりの日
  addHoliday(5, 5);   // こどもの日
  addHoliday(8, 11);  // 山の日
  addHoliday(11, 3);  // 文化の日
  addHoliday(11, 23); // 勤労感謝の日

  // Happy Monday holidays
  addHoliday(1, nthMonday(year, 1, 2));   // 成人の日 (2nd Monday of Jan)
  addHoliday(7, nthMonday(year, 7, 3));   // 海の日 (3rd Monday of Jul)
  addHoliday(9, nthMonday(year, 9, 3));   // 敬老の日 (3rd Monday of Sep)
  addHoliday(10, nthMonday(year, 10, 2)); // スポーツの日 (2nd Monday of Oct)

  // Equinoxes
  addHoliday(3, vernalEquinox(year));     // 春分の日
  addHoliday(9, autumnalEquinox(year));   // 秋分の日

  // Substitute holidays: if a holiday falls on Sunday, next weekday is a holiday
  for (const dateStr of [...holidays]) {
    const date = new Date(dateStr);
    if (date.getDay() === 0) {
      const sub = new Date(date);
      sub.setDate(sub.getDate() + 1);
      while (holidays.has(d(sub.getFullYear(), sub.getMonth() + 1, sub.getDate()))) {
        sub.setDate(sub.getDate() + 1);
      }
      holidays.add(d(sub.getFullYear(), sub.getMonth() + 1, sub.getDate()));
    }
  }

  return holidays;
}

export function isJapanHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4), 10);
  return getJapanHolidays(year).has(dateStr);
}

export const HOLIDAY_NAMES: Record<string, string> = {
  "01-01": "元日",
  "02-11": "建国記念の日",
  "02-23": "天皇誕生日",
  "04-29": "昭和の日",
  "05-03": "憲法記念日",
  "05-04": "みどりの日",
  "05-05": "こどもの日",
  "08-11": "山の日",
  "11-03": "文化の日",
  "11-23": "勤労感謝の日",
};

export function getHolidayName(dateStr: string): string | null {
  const mmdd = dateStr.slice(5);
  return HOLIDAY_NAMES[mmdd] ?? null;
}
