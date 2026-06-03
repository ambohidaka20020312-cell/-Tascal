import { useState } from "react";

interface Skill {
  id: number;
  skill_tag: string;
  level: number;
}

interface Props {
  userId: number;
  skills: Skill[];
  onAdd: (tag: string, level: number) => void;
  onUpdate: (skillId: number, level: number) => void;
  onDelete: (skillId: number) => void;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-lg leading-none focus:outline-none"
        >
          <span
            className={
              star <= (hover || value) ? "text-yellow-400" : "text-gray-300"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export default function MemberSkillEditor({ skills, onAdd, onUpdate, onDelete }: Props) {
  const [newTag, setNewTag] = useState("");
  const [newLevel, setNewLevel] = useState(1);

  const handleAdd = () => {
    const tag = newTag.trim();
    if (!tag) return;
    onAdd(tag, newLevel);
    setNewTag("");
    setNewLevel(1);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {skills.length === 0 && (
          <p className="text-sm text-gray-400">スキルがまだありません</p>
        )}
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2"
          >
            <span className="flex-1 text-sm font-medium text-gray-800">
              {skill.skill_tag}
            </span>
            <StarRating
              value={skill.level}
              onChange={(v) => onUpdate(skill.id, v)}
            />
            <button
              type="button"
              onClick={() => onDelete(skill.id)}
              className="text-gray-400 hover:text-red-500 transition-colors text-sm ml-1"
              aria-label="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">スキルを追加</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="スキル名"
            className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <StarRating value={newLevel} onChange={setNewLevel} />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTag.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
