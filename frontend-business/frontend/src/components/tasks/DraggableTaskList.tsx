import { useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task } from "../../store/taskStore";
import { taskApi } from "../../utils/api";
import TaskCard from "./TaskCard";

const ITEM_TYPE = "TASK_CARD";

interface DragItem {
  index: number;
  id: number;
}

interface DraggableCardProps {
  task: Task;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
}

function DraggableCard({ task, index, moveCard, onDrop }: DraggableCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: ITEM_TYPE,
    item: { id: task.id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (_item, monitor) => {
      if (monitor.didDrop()) onDrop();
    },
  });

  const [, drop] = useDrop<DragItem>({
    accept: ITEM_TYPE,
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMidY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMidY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMidY) return;

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`transition-opacity ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <TaskCard task={task} />
    </div>
  );
}

interface DraggableTaskListProps {
  tasks: Task[];
  onReorder: (tasks: Task[]) => void;
}

function InnerList({ tasks, onReorder }: DraggableTaskListProps) {
  // Local mutable copy for optimistic reorder during drag
  const localTasks = useRef<Task[]>(tasks);
  localTasks.current = tasks;

  const moveCard = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const updated = [...localTasks.current];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      onReorder(updated);
    },
    [onReorder]
  );

  const handleDrop = useCallback(async () => {
    // Persist the new sort_order to the backend
    const current = localTasks.current;
    await Promise.all(
      current.map((task, idx) =>
        taskApi.update(task.id, { sort_order: idx })
      )
    );
  }, []);

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <DraggableCard
          key={task.id}
          task={task}
          index={index}
          moveCard={moveCard}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

export default function DraggableTaskList({ tasks, onReorder }: DraggableTaskListProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <InnerList tasks={tasks} onReorder={onReorder} />
    </DndProvider>
  );
}
