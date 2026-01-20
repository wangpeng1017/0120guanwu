import { create } from 'zustand';
import { Task, TaskStatus, DeclarationData, Material } from '@/types';

interface TaskStore {
  tasks: Task[];
  currentTask: Task | null;
  addTask: (task: Omit<Task, 'id' | 'taskNo' | 'preEntryNo' | 'customsNo' | 'createdAt' | 'updatedAt' | 'materials' | 'declarations' | 'generatedFiles' | 'operationLogs'>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setCurrentTask: (task: Task | null) => void;
  getTaskById: (id: string) => Task | undefined;
  setTasks: (tasks: Task[]) => void;
}

// 生成任务编号
function generateTaskNo(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TSK${timestamp}${random}`;
}

// 生成预录入编号
function generatePreEntryNo(): string {
  const year = new Date().getFullYear().toString();
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `ED${year}${random}`;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTask: null,

  addTask: (taskData) => {
    const now = new Date();
    const taskNo = generateTaskNo();
    const preEntryNo = generatePreEntryNo();

    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      taskNo,
      preEntryNo,
      customsNo: null,
      materials: [],
      declarations: [],
      generatedFiles: [],
      operationLogs: [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ tasks: [...state.tasks, newTask] }));
    return newTask;
  },

  updateTask: (id, data) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, ...data, updatedAt: new Date() }
          : task
      ),
      currentTask:
        state.currentTask?.id === id
          ? { ...state.currentTask, ...data, updatedAt: new Date() }
          : state.currentTask,
    }));
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      currentTask: state.currentTask?.id === id ? null : state.currentTask,
    }));
  },

  setCurrentTask: (task) => {
    set({ currentTask: task });
  },

  getTaskById: (id) => {
    return get().tasks.find((task) => task.id === id);
  },

  setTasks: (tasks) => {
    set({ tasks });
  },
}));

// UI 状态管理
interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
