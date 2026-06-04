interface CategoryBadgeProps {
  name: string;
}

export default function CategoryBadge({ name }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] tracking-wide border border-[var(--border)] text-[var(--text-subtle)]"
    >
      {name}
    </span>
  );
}
