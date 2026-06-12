import { Task } from "../../store/taskStore";

interface Props {
  tasks: Task[];
  onTaskClick: (taskId: number) => void;
}

interface Quadrant {
  label: string;
  sublabel: string;
  bg: string;
  border: string;
  textColor: string;
  dotColor: string;
  priorities: Task["priority"][];
}

const quadrants: Quadrant[] = [
  {
    label: "今すぐやる",
    sublabel: "緊急 × 重要",
    bg: "bg-red-50",
    border: "border-red-200",
    textColor: "text-red-700",
    dotColor: "bg-red-500",
    priorities: ["urgent"],
  },
  {
    label: "計画する",
    sublabel: "非緊急 × 重要",
    bg: "bg-blue-50",
    border: "border-blue-200",
    textColor: "text-blue-700",
    dotColor: "bg-blue-500",
    priorities: ["high"],
  },
  {
    label: "委任する",
    sublabel: "緊急 × 非重要",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    textColor: "text-yellow-700",
    dotColor: "bg-yellow-500",
    priorities: ["medium"],
  },
  {
    label: "削除検討",
    sublabel: "非緊急 × 非重要",
    bg: "bg-gray-50",
    border: "border-gray-200",
    textColor: "text-gray-600",
    dotColor: "bg-gray-400",
    priorities: ["low"],
  },
];

export default function PriorityMatrix({ tasks, onTaskClick }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {quadrants.map((q) => {
        const filtered = tasks.filter((t) => q.priorities.includes(t.priority));
        return (
          <div
            key={q.label}
            className={`rounded-xl border-2 ${q.bg} ${q.border} p-4 min-h-36`}
          >
            <div className="mb-3">
              <p className={`font-semibold text-sm ${q.textColor}`}>{q.label}</p>
              <p className="text-xs text-gray-400">{q.sublabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filtered.length === 0 && (
                <p className="text-xs text-gray-300">タスクなし</p>
              )}
              {filtered.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className={`flex items-center gap-1.5 max-w-full px-2 py-1 rounded-full bg-white border ${q.border} hover:shadow-sm transition-shadow text-left`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${q.dotColor}`} />
                  <span className="text-xs text-gray-700 truncate max-w-[120px]">
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
