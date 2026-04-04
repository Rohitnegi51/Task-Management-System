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
    <Card className={`transition-all ${isCompleted ? 'opacity-60 bg-muted/50' : 'hover:shadow-md'}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggle(task.id)}
            className="mt-1"
          />
          <div className="space-y-1">
            <CardTitle className={`text-base font-medium leading-none ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </CardTitle>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 pt-2">
          <Badge variant={task.priority === 'HIGH' ? 'destructive' : task.priority === 'MEDIUM' ? 'default' : 'secondary'}>
            {task.priority}
          </Badge>
          {task.status === 'IN_PROGRESS' && (
            <Badge variant="outline" className="border-blue-500 text-blue-500">In Progress</Badge>
          )}
        </div>
      </CardContent>
      {task.dueDate && (
        <CardFooter className="pt-0 text-xs text-muted-foreground">
          <CalendarIcon className="mr-1 h-3 w-3" />
          {new Date(task.dueDate).toLocaleDateString()}
        </CardFooter>
      )}
    </Card>
  );
}