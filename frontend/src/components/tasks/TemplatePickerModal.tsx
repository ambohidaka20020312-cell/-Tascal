import { useState } from "react";
import Modal from "../common/Modal";
import { useTemplates, useCreateTemplate, useDeleteTemplate, TaskTemplate } from "../../hooks/useTemplates";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: number) => void;
}

const priorityLabel: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

const priorityClass: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TemplatePickerModal({ isOpen, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newMinutes, setNewMinutes] = useState("");

  const { data: templates = [] } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const filtered = templates.filter((t: TaskTemplate) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newName.trim() || !newTitle.trim()) return;
    createTemplate.mutate(
      {
        name: newName.trim(),
        title: newTitle.trim(),
        priority: newPriority,
        estimated_minutes: newMinutes ? parseInt(newMinutes, 10) : undefined,
      },
      {
        onSuccess: () => {
          setNewName("");
          setNewTitle("");
          setNewPriority("medium");
          setNewMinutes("");
          setShowCreate(false);
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="テンプレートから作成">
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="テンプレートを検索..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />

        <div className="max-h-72 overflow-y-auto space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">テンプレートがありません</p>
          )}
          {filtered.map((t: TaskTemplate) => (
            <div
              key={t.id}
              className="flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2.5 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-800 truncate">{t.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityClass[t.priority] ?? "bg-gray-100 text-gray-600"}`}>
                    {priorityLabel[t.priority] ?? t.priority}
                  </span>
                  {t.estimated_minutes != null && (
                    <span className="text-xs text-gray-400">{t.estimated_minutes}分</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.use_count}回使用</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { onSelect(t.id); onClose(); }}
                  className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
                >
                  使用
                </button>
                <button
                  onClick={() => deleteTemplate.mutate(t.id)}
                  className="text-xs px-2 py-1.5 text-gray-400 hover:text-red-500 transition"
                  aria-label="削除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {showCreate ? (
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">新規テンプレート作成</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="テンプレート名"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="タスクタイトル"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex gap-2">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
              <input
                type="number"
                min={1}
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                placeholder="推定分数"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 text-sm py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newTitle.trim() || createTemplate.isPending}
                className="flex-1 text-sm py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition font-medium"
              >
                作成
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full text-sm py-2 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 transition"
          >
            + 新規テンプレート作成
          </button>
        )}
      </div>
    </Modal>
  );
}
