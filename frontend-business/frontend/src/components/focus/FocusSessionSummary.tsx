interface FocusSummaryProps {
  pomodorosCompleted: number;
  totalMinutes: number;
  taskTitle: string;
  onClose: () => void;
  onLogTime: (minutes: number) => void;
}

export default function FocusSessionSummary({
  pomodorosCompleted,
  totalMinutes,
  taskTitle,
  onClose,
  onLogTime,
}: FocusSummaryProps) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;

  return (
    <div className="fixed inset-0 z-[10000] bg-gray-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Heading */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gray-500 mb-3">
            セッション完了
          </p>
          <h2 className="text-2xl font-light tracking-wide text-white">
            お疲れ様でした！
          </h2>
        </div>

        {/* Task name */}
        <p className="text-sm text-gray-400 tracking-wide truncate px-4">
          {taskTitle}
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-10 border-t border-b border-gray-800 py-6">
          <div className="text-center">
            <p className="text-3xl font-light tracking-tight text-white">
              🍅 {pomodorosCompleted}
            </p>
            <p className="text-[10px] tracking-[0.2em] text-gray-500 mt-1">
              POMODOROS
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-light tracking-tight text-white">
              {timeStr}
            </p>
            <p className="text-[10px] tracking-[0.2em] text-gray-500 mt-1">
              集中時間
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {totalMinutes > 0 && (
            <button
              onClick={() => onLogTime(totalMinutes)}
              className="w-full py-3 border border-gray-400 text-gray-200 text-sm tracking-wide hover:border-white hover:text-white transition-colors rounded-lg"
            >
              時間を記録する
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 text-sm tracking-wide hover:text-gray-300 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
