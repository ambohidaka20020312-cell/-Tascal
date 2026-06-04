import { Category } from "../../hooks/useCategories";

interface CategoryFilterProps {
  categories: Category[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
      <button
        onClick={() => onSelect(null)}
        className={[
          "shrink-0 px-2.5 py-1 rounded-full text-[10px] tracking-wide transition-colors",
          selected === null
            ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
            : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]",
        ].join(" ")}
      >
        すべて
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={[
            "shrink-0 px-2.5 py-1 rounded-full text-[10px] tracking-wide transition-colors",
            selected === cat.id
              ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
              : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]",
          ].join(" ")}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
