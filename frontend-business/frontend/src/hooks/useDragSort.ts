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
      e.dataTransfer.setData("application/x-tascal-drag", String(items[index].id));
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

  const onKeyDown = (id: number, e: KeyboardEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    const newIndex = e.key === "ArrowUp" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered);
  };

  const isDragging = dragIndex !== null;
  const draggedId = dragIndex !== null ? items[dragIndex]?.id ?? null : null;

  return { handlers, dragIndex, overIndex, isDragging, draggedId, onKeyDown };
}
