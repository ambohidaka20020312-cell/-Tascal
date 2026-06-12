interface Member {
  id: number;
  name: string;
  totalMinutes: number;
  taskCount: number;
}

interface Props {
  members: Member[];
  maxMinutes?: number;
}

function barColor(pct: number): string {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-green-500";
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MemberLoadBar({ members, maxMinutes = 480 }: Props) {
  return (
    <div className="space-y-3">
      {members.map((m) => {
        const pct = Math.min((m.totalMinutes / maxMinutes) * 100, 100);
        const color = barColor(pct);
        return (
          <div key={m.id} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
              {initials(m.name)}
            </div>
            <div className="w-24 flex-shrink-0">
              <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${color}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <div className="flex-shrink-0 text-xs text-gray-500 whitespace-nowrap">
              {formatTime(m.totalMinutes)} / {m.taskCount}件
            </div>
          </div>
        );
      })}
    </div>
  );
}
