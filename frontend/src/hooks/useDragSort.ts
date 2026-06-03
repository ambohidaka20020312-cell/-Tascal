import { useState } from "react";

export function useDragSort<T extends { id: number }>(
  items: T[],
  onReorder: (items: T[]) => void
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handlers = (index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOverIndex(index);
    },
    onDragEnd: () => {
      if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
        const reordered = [...items];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(overIndex, 0, moved);
        onReorder(reordered);
      }
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  return { handlers, dragIndex, overIndex };
}
