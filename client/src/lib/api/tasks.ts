import apiClient from '../axios';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetTasksParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface TasksResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getTasks = async (params: GetTasksParams): Promise<TasksResponse> => {
  const { data } = await apiClient.get('/tasks', { params });
  return data;
};

export const createTask = async (
  taskData: Omit<Partial<Task>, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Task> => {
  const { data } = await apiClient.post('/tasks', taskData);
  return data;
};

export const updateTask = async (
  id: string,
  taskData: Partial<Task>
): Promise<Task> => {
  const { data } = await apiClient.patch(`/tasks/${id}`, taskData);
  return data;
};

export const toggleTaskStatus = async (id: string): Promise<Task> => {
  const { data } = await apiClient.patch(`/tasks/${id}/toggle`);
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await apiClient.delete(`/tasks/${id}`);
};

export const getMissedTasks = async (): Promise<{ data: Task[] }> => {
  const { data } = await apiClient.get('/tasks/missed');
  return data;
};

export const syncMissedTasks = async (action: 'MOVE' | 'ARCHIVE'): Promise<{ message: string, count: number }> => {
  const { data } = await apiClient.post('/tasks/missed/sync', { action });
  return data;
};