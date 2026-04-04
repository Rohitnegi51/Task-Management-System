'use client';

import { useAuthStore } from '@/store/useAuthStore';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string;
  createdAt: string;
}

interface DailyProgress {
  id: string;
  date: string;
  completedTasks: number;
  failedTasks: number;
}

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  // Tabs: TODAY, SCHEDULED, PROGRESS
  const [activeTab, setActiveTab] = useState<'TODAY' | 'SCHEDULED' | 'PROGRESS'>('TODAY');

  // Task States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Progress States
  const [progressRecords, setProgressRecords] = useState<DailyProgress[]>([]);

  // Rollover States
  const [rolloverTasks, setRolloverTasks] = useState<Task[]>([]);
  const [showRollover, setShowRollover] = useState(false);

  // Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  
  // Today's date String YYYY-MM-DD
  const [todayStr] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  
  // Scheduled Selected Date
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Check Yesterday's Tasks ONCE on mount
  useEffect(() => {
    if (!user) return;
    const initDashboard = async () => {
      try {
        // Run cleanup silently first
        await apiClient.post('/tasks/cleanup');

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        
        const res = await apiClient.get(`/tasks?date=${yStr}`);
        const tasksFromYesterday: Task[] = res.data.data || [];
        const incomplete = tasksFromYesterday.filter(t => t.status !== 'COMPLETED');
        
        if (incomplete.length > 0) {
          setRolloverTasks(incomplete);
          setShowRollover(true);
        }
      } catch (err) {
        console.error("Init failed", err);
      }
    };
    initDashboard();
  }, [user]);

  // Fetch Tasks for the active tab
  const fetchTasksData = useCallback(async () => {
    if (activeTab === 'PROGRESS') {
      try {
        const res = await apiClient.get('/progress');
        setProgressRecords(res.data.progress || []);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      setLoadingTasks(true);
      const queryDate = activeTab === 'TODAY' ? todayStr : selectedDate;
      const res = await apiClient.get(`/tasks?date=${queryDate}`);
      setTasks(res.data.data || []);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoadingTasks(false);
    }
  }, [activeTab, todayStr, selectedDate]);

  useEffect(() => {
    if (user && !showRollover) {
      fetchTasksData();
    }
  }, [user, fetchTasksData, showRollover]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const targetDate = activeTab === 'TODAY' ? todayStr : selectedDate;
      // create proper iso string for due date
      const isoDate = new Date(targetDate).toISOString();
      
      const res = await apiClient.post('/tasks', {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        dueDate: isoDate
      });
      setTasks([...tasks, res.data]);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('MEDIUM');
    } catch (error) {
      console.error('Error creating task', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { 
      ...t, 
      status: currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED' 
    } : t));

    try {
      await apiClient.patch(`/tasks/${taskId}/toggle`);
    } catch (error) {
      fetchTasksData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setTasks(tasks.filter(t => t.id !== taskId));

    try {
      await apiClient.delete(`/tasks/${taskId}`);
    } catch (error) {
      fetchTasksData();
    }
  };

  const handleRolloverChoice = async (rolloverOption: boolean) => {
    setShowRollover(false);
    if (!rolloverOption) {
      // User said NO: skip tasks and update progress failure
      try {
        const taskIds = rolloverTasks.map(t => t.id);
        await apiClient.post('/progress/skip', { taskIds });
      } catch(e) { console.error(e) }
    } else {
      // User said YES: update due dates to today
      try {
        const isoDate = new Date(todayStr).toISOString();
        const promises = rolloverTasks.map(t => 
          apiClient.patch(`/tasks/${t.id}`, { dueDate: isoDate })
        );
        await Promise.all(promises);
      } catch(e) { console.error(e) }
    }
    // Now fetch today's tasks
    fetchTasksData();
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'text-red-700 bg-red-50 ring-red-600/20';
    if (priority === 'MEDIUM') return 'text-yellow-800 bg-yellow-50 ring-yellow-600/20';
    return 'text-green-700 bg-green-50 ring-green-600/20';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      
      {/* ROLLOVER MODAL */}
      {showRollover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative m-4">
            <h3 className="text-xl font-bold text-gray-900">Wait a second...</h3>
            <p className="mt-4 text-gray-600">
              You have {rolloverTasks.length} incomplete tasks from yesterday. Would you like to move them to today's list?
            </p>
            <p className="mt-2 text-sm text-gray-500 italic">
              If you say no, they will be deleted and recorded as failed tasks in your progress.
            </p>
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => handleRolloverChoice(false)}
                className="flex-1 rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-200"
              >
                No, skip them ❌
              </button>
              <button
                onClick={() => handleRolloverChoice(true)}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm"
              >
                Yes, move to today! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, <span className="font-semibold text-indigo-600">{user?.name || user?.email || 'User'}</span>!
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-4">
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['TODAY', 'SCHEDULED', 'PROGRESS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab === 'TODAY' && '☀️ Today\'s Tasks'}
                {tab === 'SCHEDULED' && '📅 Scheduled'}
                {tab === 'PROGRESS' && '📈 Progress Record'}
              </button>
            ))}
          </nav>
        </div>

        {/* PROGRESS TAB CONTENT */}
        {activeTab === 'PROGRESS' && (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 overflow-hidden p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Daily Progress</h2>
            {progressRecords.length === 0 ? (
               <p className="text-gray-500">No progress recorded yet. Start doing tasks!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {progressRecords.map(record => (
                  <div key={record.id} className="rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="font-semibold text-gray-900 mb-4">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Completed:</span>
                         <span className="font-bold text-green-600 px-2 bg-green-50 rounded-md">{record.completedTasks}</span>
                       </div>
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Failed/Skipped:</span>
                         <span className="font-bold text-red-600 px-2 bg-red-50 rounded-md">{record.failedTasks}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TODAY / SCHEDULED CONTENT */}
        {activeTab !== 'PROGRESS' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            
            {/* Create Task Form (Sidebar) */}
            <div className="lg:col-span-1">
              <form onSubmit={handleCreateTask} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Create New Task</h2>
                
                {activeTab === 'SCHEDULED' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium leading-6 text-indigo-600">
                      Scheduling For Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-indigo-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm px-3 font-semibold"
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">Task Title <span className="text-red-500">*</span></label>
                    <div className="mt-2">
                      <input type="text" id="title" required value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm px-3" placeholder="E.g., Complete project proposal" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">Description (Optional)</label>
                    <div className="mt-2">
                      <textarea id="description" rows={3} value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm px-3" placeholder="Add more details..." />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium leading-6 text-gray-900">Priority</label>
                    <div className="mt-2 text-gray-900">
                      <select id="priority" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm px-3 bg-white">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button type="submit" disabled={isSubmitting || !newTaskTitle.trim()} className="flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {isSubmitting ? 'Creating...' : `Add Task for ${activeTab === 'TODAY' ? 'Today' : selectedDate}`}
                  </button>
                </div>
              </form>
            </div>

            {/* Task List (Main Content) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
                <div className="border-b border-gray-200 bg-white px-6 py-5">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    {activeTab === 'TODAY' ? 'Tasks for Today' : `Tasks for ${selectedDate}`}
                  </h3>
                </div>
                
                <ul role="list" className="divide-y divide-gray-100 p-0 m-0">
                  {loadingTasks ? (
                    <li className="p-6 text-center text-sm text-gray-500">Loading your tasks...</li>
                  ) : tasks.length === 0 ? (
                    <li className="p-10 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks</h3>
                      <p className="mt-1 text-sm text-gray-500">Enjoy your free time or add a new task!</p>
                    </li>
                  ) : (
                    tasks.map((task) => (
                      <li key={task.id} className={`flex items-start justify-between gap-x-6 p-6 transition-colors hover:bg-gray-50 ${task.status === 'COMPLETED' ? 'bg-gray-50/50' : ''}`}>
                        <div className="flex min-w-0 gap-x-4">
                          <div className="mt-1 flex items-center h-5">
                            <input type="checkbox" checked={task.status === 'COMPLETED'} onChange={() => handleToggleStatus(task.id, task.status)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer" />
                          </div>
                          <div className="min-w-0 flex-auto">
                            <p className={`text-base font-semibold leading-6 ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="mt-1 truncate text-sm leading-5 text-gray-500">{task.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-y-2">
                          <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete Task">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
