import { useState, useEffect, useRef } from "react";

const EMOJIS: Record<string, string[]> = {
  "よく使う": ["👍","👎","❤️","🙏","😊","😂","🔥","✅","⚡","💪","🎉","👀","💡","⚠️","📌","🚀"],
  "表情": ["😀","😊","😂","🥹","😅","😆","🤣","😍","🥰","😘","😎","🤔","😤","😭","😱","🙄"],
  "ジェスチャー": ["👍","👎","👌","✌️","🤞","🙏","👏","🤝","💪","🫶","☝️","👇","👈","👉"],
  "記号": ["✅","❌","⚠️","💡","📌","🔥","⚡","🎯","💯","🚀","⭐","🏆","🔑","📎","🗓️","💬"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState("よく使う");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ width: 280, maxHeight: 240, bottom: "100%", marginBottom: 8 }}
      className="absolute left-0 z-50 flex flex-col bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border)] shrink-0 scrollbar-none">
        {Object.keys(EMOJIS).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs whitespace-nowrap transition-colors shrink-0 ${
              activeCategory === cat
                ? "text-[var(--text-primary)] border-b-2 border-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS[activeCategory].map((emoji, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
