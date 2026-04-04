'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { getTasks, createTask, updateTask, deleteTask, toggleTaskStatus, Task } from '@/lib/api/tasks';
import { TaskFormValues } from '@/validations/taskSchema';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Fetch Tasks
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tasks', { page, search, status: statusFilter === 'ALL' ? undefined : statusFilter }],
    queryFn: () => getTasks({
      page,
      search,
      status: statusFilter === 'ALL' ? undefined : statusFilter
    }),
  });

  // Create/Update Task Mutation
  const saveTaskMutation = useMutation({
    mutationFn: (variables: { id?: string; data: TaskFormValues }) => {
      if (variables.id) {
        return updateTask(variables.id, variables.data);
      }
      return createTask(variables.data);
    },
    onSuccess: (savedTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(variables.id ? 'Task updated!' : 'Task created!');
      setIsModalOpen(false);
      setTaskToEdit(null);
    },
    onError: () => toast.error('Failed to save task.'),
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task.'),
  });

  // Toggle Task Optimistically
  const toggleTaskMutation = useMutation({
    mutationFn: toggleTaskStatus,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const queryKey = ['tasks', { page, search, status: statusFilter === 'ALL' ? undefined : statusFilter }];
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((task: Task) =>
            task.id === taskId
              ? { ...task, status: task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' }
              : task
          )
        };
      });

      return { previousData, queryKey };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error('Failed to update status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleModalSubmit = (data: TaskFormValues, id?: string) => {
    saveTaskMutation.mutate({ id, data });
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Navbar />

      <div className="flex-1 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full">
        <main className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Today</h1>
            <Button onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </div>

          {/* Filters and Search Bar row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-2 rounded-lg border border-border/50">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks..."
                className="w-full bg-background pl-8 shadow-none"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-full sm:w-auto ml-auto">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || 'ALL'); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background shadow-none">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
             <div className="flex h-[400px] items-center justify-center text-destructive">
               Failed to load tasks.
             </div>
          ) : data?.data.length === 0 ? (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-card shadow-sm">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">You have no tasks</h3>
                <p className="text-sm text-muted-foreground">
                  You can start organizing your life right now.
                </p>
                <Button className="mt-4" onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}>
                  Add Task
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data?.data.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={(id) => toggleTaskMutation.mutate(id)}
                    onDelete={(id) => deleteTaskMutation.mutate(id)}
                    onEdit={openEditModal}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm font-medium">
                    Page {page} of {data.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= data.meta.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }}
        onSubmit={handleModalSubmit}
        taskToEdit={taskToEdit}
      />
    </div>
  );
}