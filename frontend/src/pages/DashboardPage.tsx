import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuthStore } from "../store/authStore";
import { useTaskStore } from "../store/taskStore";
import { useTasksQuery } from "../hooks/useTasks";
import { aiApi } from "../utils/api";
import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";
import Button from "../components/common/Button";

interface AiOptimizeResult {
  message?: string;
  advice?: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { tasks, selectedDate, setSelectedDate } = useTaskStore();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { isLoading, isError } = useTasksQuery(selectedDate);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAiOptimize = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const res = await aiApi.optimize(selectedDate);
      const data: AiOptimizeResult = res.data.data ?? res.data;
      setAiAdvice(data.message ?? data.advice ?? "最適化が完了しました。");
    } catch {
      setAiAdvice("AI最適化に失敗しました。再度お試しください。");
    } finally {
      setAiLoading(false);
    }
  };

  const todayLabel = format(new Date(selectedDate + "T00:00:00"), "M月d日 (E)", {
    locale: ja,
  });

  const pendingCount = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-bold text-gray-800">Tascal</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/calendar")}
              className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
            >
              カレンダー
            </button>
            <div className="text-sm text-gray-500">{user?.name ?? user?.email}</div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Date Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{todayLabel}</h2>
            <p className="text-sm text-gray-500">
              未完了: {pendingCount}件 / 完了: {completedCount}件
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* AI Optimize Button */}
        <Button
          variant="secondary"
          className="w-full border-dashed border-primary-500 text-primary-600 hover:bg-indigo-50"
          onClick={handleAiOptimize}
          loading={aiLoading}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AIでタスクを最適化
        </Button>

        {/* AI Advice Card */}
        {aiAdvice && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-700 mb-1">AIアドバイス</p>
                <p className="text-sm text-indigo-900 whitespace-pre-wrap">{aiAdvice}</p>
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">タスク一覧</h3>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowTaskForm(true)}
            >
              + 追加
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-red-500 text-sm">
              タスクの取得に失敗しました
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-500 text-sm">タスクがありません</p>
              <p className="text-gray-400 text-xs mt-1">「+ 追加」からタスクを作成しましょう</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
}
