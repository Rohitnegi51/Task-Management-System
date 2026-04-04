'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMissedTasks, syncMissedTasks } from '@/lib/api/tasks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

export function MissedTasksModal() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'missed'],
    queryFn: getMissedTasks,
    staleTime: 1000 * 60 * 5, // Check once every 5 minutes at most
  });

  const syncMutation = useMutation({
    mutationFn: syncMissedTasks,
    onSuccess: (res, action) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (action === 'MOVE') {
        toast.success(`Moved ${res.count} missed tasks to today!`);
      } else {
        toast.success(`Archived ${res.count} missed tasks.`);
      }
    },
    onError: () => {
      toast.error('Failed to sync missed tasks.');
    },
  });

  const missedCount = data?.data.length || 0;
  const isOpen = missedCount > 0 && !isLoading && !syncMutation.isPending && !syncMutation.isSuccess;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have missed tasks!</AlertDialogTitle>
          <AlertDialogDescription>
            You have {missedCount} unfinished task{missedCount !== 1 ? 's' : ''} from yesterday or earlier.
            Would you like to move them to Today, or archive them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => syncMutation.mutate('ARCHIVE')}
            disabled={syncMutation.isPending}
          >
            Archive Them
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => syncMutation.mutate('MOVE')}
            disabled={syncMutation.isPending}
          >
            Move to Today
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}