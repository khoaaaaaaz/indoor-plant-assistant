// src/components/care/CareTaskItem.tsx
import React from 'react';
import { Check, Droplets, Sparkles, RotateCcw, Sprout, Lock } from 'lucide-react';
import type { DerivedCareTask } from '@/store/taskStore';

interface CareTaskItemProps {
  task: DerivedCareTask;
  onComplete: (taskId: string) => void;
  allowComplete?: boolean;
}

const actionConfig = {
  water:     { icon: Droplets,  bg: 'bg-blue-100',    text: 'text-blue-600',    label: 'Watering' },
  mist:      { icon: Sparkles,  bg: 'bg-cyan-100',    text: 'text-cyan-600',    label: 'Misting' },
  fertilize: { icon: Sprout,    bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Fertilizing' },
  rotate:    { icon: RotateCcw, bg: 'bg-amber-100',   text: 'text-amber-600',   label: 'Rotating' },
};

// Wrapped in React.memo: prevents re-render when sibling tasks change state
// but this task's props remain the same.
export const CareTaskItem = React.memo(function CareTaskItem({ task, onComplete, allowComplete = true }: CareTaskItemProps) {
  const config = actionConfig[task.actionType] || actionConfig.water;
  const Icon = config.icon;
  const canInteract = allowComplete && !task.isCompleted;

  return (
    <div
      className={`bg-card rounded-xl p-4 shadow-sm border border-border/50
        flex items-center gap-4 transition-all
        ${task.isCompleted
          ? 'opacity-60'
          : !allowComplete
            ? 'opacity-70'
            : 'hover:shadow-md cursor-pointer'
        }`}
      onClick={() => canInteract && onComplete(task.id)}
    >
      {/* Checkbox circle */}
      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center
        justify-center transition-colors ${task.isCompleted
          ? 'bg-primary'
          : !allowComplete
            ? 'border-2 border-border/50'
            : 'border-2 border-border hover:border-primary'
        }`}
      >
        {task.isCompleted ? (
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        ) : !allowComplete ? (
          <Lock className="h-2.5 w-2.5 text-muted-foreground/40" />
        ) : null}
      </div>

      {/* Task info */}
      <div className={`flex-1 ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
        <h5 className="text-label-sm font-semibold text-primary mb-0.5 capitalize">
          {config.label}
        </h5>
        <p className="text-body-md text-sm text-muted-foreground">
          {task.plantName}
          {task.isOverdue && !task.isCompleted && (
            <span className="text-destructive ml-1">(overdue)</span>
          )}
        </p>
      </div>

      {/* Action icon — themed background */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${task.isCompleted
        ? 'bg-muted text-muted-foreground'
        : `${config.bg} ${config.text}`
        }`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
});
