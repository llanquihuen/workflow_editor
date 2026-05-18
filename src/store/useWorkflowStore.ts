import { create } from 'zustand';
import type { Workflow, Task, Form } from '../types/workflow.types';

type ViewMode = 'flow' | 'forms';

interface WorkflowState {
  workflow: Workflow;
  updateWorkflow: (newWorkflow: Workflow) => void;
  
  // Navigation State
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  
  // Task State
  selectedTaskId: string | null;
  setSelectedTask: (id: string | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTasksPositions: (positions: { id: string, x: number, y: number }[]) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  reorderTask: (taskId: string, direction: 'up' | 'down') => void;
  
  // Form State
  selectedFormId: string | null;
  setSelectedForm: (id: string | null) => void;
  addForm: (form: Form) => void;
  updateForm: (formId: string, updates: Partial<Form>) => void;
  deleteForm: (formId: string) => void;
}

// Función auxiliar para recalcular el layout vertical y el orden
const recalculateLayout = (tasks: Task[]): Task[] => {
  return tasks.map((task, index) => ({
    ...task,
    order: index + 1,
    ui_metadata: {
      x: 250,
      y: index * 150 + 50
    }
  }));
};

const initialTasks: Task[] = recalculateLayout([
  {
    id: 'task-1',
    name: 'Paso Inicial',
    order: 1,
    formIds: ['form-1'],
    ui_metadata: { x: 0, y: 0 } // Se sobrescribe con recalculateLayout
  },
  {
    id: 'task-2',
    name: 'Revisión',
    order: 2,
    ui_metadata: { x: 0, y: 0 } // Se sobrescribe con recalculateLayout
  }
]);

const initialWorkflow: Workflow = {
  id: 'wf-001',
  name: 'Plantilla de Flujo de Trabajo',
  tasks: initialTasks,
  forms: [
    {
      id: 'form-1',
      title: 'Información Básica',
      questions: [
        {
          id: 'q-1',
          type: 'text',
          label: 'Nombre completo',
          required: true,
        },
        {
          id: 'q-2',
          type: 'dropdown',
          label: 'Rol',
          options: ['Administrador', 'Usuario', 'Invitado'],
          required: true,
        }
      ]
    }
  ]
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: initialWorkflow,
  currentView: 'flow',
  selectedTaskId: null,
  selectedFormId: null,
  theme: 'dark',

  updateWorkflow: (newWorkflow) => set({ workflow: newWorkflow }),
  
  setCurrentView: (view) => set({ currentView: view }),

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  updateTask: (taskId, updates) => set((state) => ({
    workflow: {
      ...state.workflow,
      tasks: state.workflow.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    },
  })),

  updateTasksPositions: (positions) => set((state) => {
    const newTasks = state.workflow.tasks.map(task => {
      const pos = positions.find(p => p.id === task.id);
      if (pos) {
        return { ...task, ui_metadata: { x: pos.x, y: pos.y } };
      }
      return task;
    });
    return { workflow: { ...state.workflow, tasks: newTasks } };
  }),

  addTask: (task) => set((state) => {
    const newTasks = [...state.workflow.tasks, task];
    return {
      workflow: {
        ...state.workflow,
        tasks: recalculateLayout(newTasks),
      },
      selectedTaskId: task.id
    };
  }),

  deleteTask: (taskId) => set((state) => {
    const tasks = state.workflow.tasks;
    const index = tasks.findIndex(t => t.id === taskId);
    
    // Proteger la tarea inicial (índice 0)
    if (index === 0) return state;

    const newTasks = tasks.filter(t => t.id !== taskId);
    
    return {
      workflow: {
        ...state.workflow,
        tasks: recalculateLayout(newTasks),
      },
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId
    };
  }),

  reorderTask: (taskId, direction) => set((state) => {
    const tasks = [...state.workflow.tasks];
    const index = tasks.findIndex(t => t.id === taskId);
    
    if (index === -1) return state;

    // Reglas de protección de la tarea inicial (índice 0)
    if (index === 0 && direction === 'down') return state; // La 0 no puede bajar
    if (index === 1 && direction === 'up') return state;   // La 1 no puede subir (reemplazar a la 0)

    // Restricciones lógicas de condiciones
    if (direction === 'up' && index > 1) { // Nota: > 1 para no afectar a la 0
      const taskToMove = tasks[index];
      if (taskToMove.condition) {
        const depIndex = tasks.findIndex(t => t.id === taskToMove.condition!.dependentTaskId);
        if (index - 1 <= depIndex) {
          return state; // No puede subir por encima (o al mismo nivel) de su dependencia
        }
      }
      
      const temp = tasks[index];
      tasks[index] = tasks[index - 1];
      tasks[index - 1] = temp;
    } else if (direction === 'down' && index > 0 && index < tasks.length - 1) {
      const taskToMove = tasks[index];
      const taskBelow = tasks[index + 1];
      if (taskBelow.condition && taskBelow.condition.dependentTaskId === taskToMove.id) {
         return state; // No puede bajar por debajo de una tarea que depende de ella
      }
      
      const temp = tasks[index];
      tasks[index] = tasks[index + 1];
      tasks[index + 1] = temp;
    } else {
      return state;
    }

    return {
      workflow: {
        ...state.workflow,
        tasks: recalculateLayout(tasks)
      }
    };
  }),

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  setSelectedForm: (id) => set({ selectedFormId: id }),

  addForm: (form) => set((state) => ({
    workflow: {
      ...state.workflow,
      forms: [...(state.workflow.forms || []), form]
    }
  })),

  updateForm: (formId, updates) => set((state) => ({
    workflow: {
      ...state.workflow,
      forms: (state.workflow.forms || []).map((form) =>
        form.id === formId ? { ...form, ...updates } : form
      )
    }
  })),

  deleteForm: (formId) => set((state) => ({
    workflow: {
      ...state.workflow,
      forms: (state.workflow.forms || []).filter(f => f.id !== formId),
      tasks: state.workflow.tasks.map(t => {
        if (t.formIds?.includes(formId)) {
          return { ...t, formIds: t.formIds.filter(id => id !== formId) };
        }
        return t;
      })
    },
    selectedFormId: state.selectedFormId === formId ? null : state.selectedFormId
  })),
}));
