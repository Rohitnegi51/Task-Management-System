'use client';

import { Task } from '@/lib/api/tasks';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MoreVertical, Trash, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function TaskCard({ task, onToggle, onDelete, onEdit }: TaskCardProps) {
  const isCompleted = task.status === 'COMPLETED';

  return (
    <Card className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 transition-all duration-200 hover:shadow-md border-l-4 ${
      isCompleted
        ? 'opacity-60 bg-muted/50 border-l-muted'
        : task.priority === 'HIGH' ? 'border-l-destructive' : task.priority === 'MEDIUM' ? 'border-l-primary' : 'border-l-secondary'
    }`}>

      <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggle(task.id)}
          className="mt-1 sm:mt-0 h-5 w-5 rounded-full"
        />

        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </span>
            {task.status === 'IN_PROGRESS' && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-950/50">
                In Progress
              </Badge>
            )}
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase font-semibold">
              {task.priority}
            </Badge>
          </div>

          {task.description && (
            <p className={`text-sm line-clamp-1 ${isCompleted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
              {task.description}
            </p>
          )}

          {task.dueDate && (
            <div className="flex items-center text-xs text-muted-foreground mt-1 sm:hidden">
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop / Right Side Info */}
      <div className="flex items-center gap-4 mt-4 sm:mt-0 ml-9 sm:ml-0 w-full sm:w-auto justify-between sm:justify-end">
        {task.dueDate && (
          <div className="hidden sm:flex items-center text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        )}

        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(task)}>
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Edit task</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(task.id)}>
            <Trash className="h-4 w-4" />
            <span className="sr-only">Delete task</span>
          </Button>
        </div>
      </div>

    </Card>
  );
}