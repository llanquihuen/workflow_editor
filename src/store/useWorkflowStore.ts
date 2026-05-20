import { create } from 'zustand';
import type { Workflow, Task, Form } from '../types/workflow.types';
import i18n from '../i18n';

import procurementWorkflowData from '../data/procurementWorkflow.json';
import onboardingWorkflowData from '../data/onboardingWorkflow.json';
import deploymentWorkflowData from '../data/deploymentWorkflow.json';
import expenseWorkflowData from '../data/expenseWorkflow.json';
import initialWorkflowData from '../data/initialWorkflow.json';

type ViewMode = 'dashboard' | 'flow' | 'forms';

interface WorkflowState {
  workflows: Workflow[];
  workflow: Workflow;
  updateWorkflow: (newWorkflow: Workflow) => void;

  // Navigation State
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;

  // Workflow CRUD State
  loadWorkflow: (id: string) => void;
  createNewWorkflow: (name: string) => void;
  duplicateWorkflow: (id: string) => void;
  deleteWorkflow: (id: string) => void;
  toggleWorkflowEnabled: (id: string) => void;

  // Task State
  selectedTaskId: string | null;
  setSelectedTask: (id: string | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTasksPositions: (positions: { id: string; x: number; y: number }[]) => void;
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

// Recalculates the vertical layout coordinates and task orders
const recalculateLayout = (tasks: Task[]): Task[] => {
  return tasks.map((task, index) => ({
    ...task,
    order: index + 1,
    ui_metadata: {
      x: 250,
      y: index * 150 + 50,
    },
  }));
};

// Helper to enrich raw JSON datasets with default metadata if not present
const enrichWorkflow = (wf: any, index: number): Workflow => {
  const id = wf.id || `WK12345${index + 1}`;
  const ownerId = wf.ownerId || `usr-${(index % 20) + 1}`;
  const updatedAt = wf.updatedAt || '05/18/2026';
  const version = wf.version || 'v 1';
  const rating = wf.rating || (5 - (index % 2));
  const enabled = wf.enabled !== undefined ? wf.enabled : true;

  return {
    ...wf,
    id,
    ownerId,
    updatedAt,
    version,
    rating,
    enabled,
    tasks: wf.tasks || [],
    forms: wf.forms || [],
  } as Workflow;
};

const rawWorkflowsData = [
  procurementWorkflowData,
  onboardingWorkflowData,
  deploymentWorkflowData,
  expenseWorkflowData,
  initialWorkflowData,
];

const initialWorkflows = rawWorkflowsData.map((wf, idx) => enrichWorkflow(wf, idx));
const initialActive = initialWorkflows[0];

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflows: initialWorkflows,
  workflow: initialActive,
  currentView: 'dashboard',
  selectedTaskId: initialActive.tasks?.[0]?.id || null,
  selectedFormId: initialActive.forms?.[0]?.id || null,
  theme: 'light',

  updateWorkflow: (newWorkflow) =>
    set((state) => ({
      workflow: newWorkflow,
      workflows: state.workflows.map((w) => (w.id === newWorkflow.id ? newWorkflow : w)),
    })),

  setCurrentView: (view) => set({ currentView: view }),

  loadWorkflow: (id) =>
    set((state) => {
      const wf = state.workflows.find((w) => w.id === id);
      if (!wf) return state;
      return {
        workflow: wf,
        currentView: 'flow',
        selectedTaskId: wf.tasks?.[0]?.id || null,
        selectedFormId: wf.forms?.[0]?.id || null,
      };
    }),

  createNewWorkflow: (name) =>
    set((state) => {
      const newId = `WK${Math.floor(100000 + Math.random() * 900000)}`;
      const taskName = i18n.t('tasks.new_task_default') || 'Paso 1';
      const newWorkflow: Workflow = {
        id: newId,
        name,
        ownerId: `usr-${Math.floor(Math.random() * 20) + 1}`,
        updatedAt: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        version: 'v 1',
        rating: 5,
        enabled: true,
        tasks: [
          {
            id: 'task-1',
            name: taskName,
            order: 1,
            ui_metadata: { x: 250, y: 50 },
            approverIds: [],
            formIds: [],
          },
        ],
        forms: [],
      };

      return {
        workflows: [...state.workflows, newWorkflow],
        workflow: newWorkflow,
        currentView: 'flow',
        selectedTaskId: 'task-1',
        selectedFormId: null,
      };
    }),

  duplicateWorkflow: (id) =>
    set((state) => {
      const target = state.workflows.find((wf) => wf.id === id);
      if (!target) return state;

      const newId = `WK${Math.floor(100000 + Math.random() * 900000)}`;
      const duplicated: Workflow = {
        ...target,
        id: newId,
        name: `${target.name} (Copia)`,
        ownerId: `usr-${Math.floor(Math.random() * 20) + 1}`,
        updatedAt: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        version: 'v 1',
        rating: 5,
        enabled: true,
        tasks: target.tasks.map((t) => ({ ...t })),
        forms: target.forms.map((f) => ({ ...f })),
      };

      return {
        workflows: [...state.workflows, duplicated],
      };
    }),

  deleteWorkflow: (id) =>
    set((state) => {
      const updatedWorkflows = state.workflows.filter((wf) => wf.id !== id);
      let nextActive = state.workflow;
      if (state.workflow.id === id) {
        nextActive = updatedWorkflows[0] || null;
      }
      return {
        workflows: updatedWorkflows,
        workflow: nextActive,
        selectedTaskId: nextActive?.tasks?.[0]?.id || null,
        selectedFormId: nextActive?.forms?.[0]?.id || null,
      };
    }),

  toggleWorkflowEnabled: (id) =>
    set((state) => {
      const updatedWorkflows = state.workflows.map((wf) =>
        wf.id === id ? { ...wf, enabled: !wf.enabled } : wf
      );
      const updatedActive =
        state.workflow.id === id
          ? { ...state.workflow, enabled: !state.workflow.enabled }
          : state.workflow;
      return {
        workflows: updatedWorkflows,
        workflow: updatedActive,
      };
    }),

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  updateTask: (taskId, updates) =>
    set((state) => {
      const updatedTasks = state.workflow.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      const updatedWorkflow = {
        ...state.workflow,
        tasks: updatedTasks,
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
      };
    }),

  updateTasksPositions: (positions) =>
    set((state) => {
      const newTasks = state.workflow.tasks.map((task) => {
        const pos = positions.find((p) => p.id === task.id);
        if (pos) {
          return { ...task, ui_metadata: { x: pos.x, y: pos.y } };
        }
        return task;
      });
      const updatedWorkflow = { ...state.workflow, tasks: newTasks };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
      };
    }),

  addTask: (task) =>
    set((state) => {
      const newTasks = [...state.workflow.tasks, task];
      const updatedWorkflow = {
        ...state.workflow,
        tasks: recalculateLayout(newTasks),
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
        selectedTaskId: task.id,
      };
    }),

  deleteTask: (taskId) =>
    set((state) => {
      const tasks = state.workflow.tasks;
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index === 0) return state; // Protect initial task

      const newTasks = tasks.filter((t) => t.id !== taskId);
      const updatedWorkflow = {
        ...state.workflow,
        tasks: recalculateLayout(newTasks),
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
        selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
      };
    }),

  reorderTask: (taskId, direction) =>
    set((state) => {
      const tasks = [...state.workflow.tasks];
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index === -1) return state;

      if (index === 0 && direction === 'down') return state;
      if (index === 1 && direction === 'up') return state;

      if (direction === 'up' && index > 1) {
        const taskToMove = tasks[index];
        if (taskToMove.condition) {
          const depIndex = tasks.findIndex((t) => t.id === taskToMove.condition!.dependentTaskId);
          if (index - 1 <= depIndex) return state;
        }
        const temp = tasks[index];
        tasks[index] = tasks[index - 1];
        tasks[index - 1] = temp;
      } else if (direction === 'down' && index > 0 && index < tasks.length - 1) {
        const taskToMove = tasks[index];
        const taskBelow = tasks[index + 1];
        if (taskBelow.condition && taskBelow.condition.dependentTaskId === taskToMove.id) {
          return state;
        }
        const temp = tasks[index];
        tasks[index] = tasks[index + 1];
        tasks[index + 1] = temp;
      } else {
        return state;
      }

      const updatedWorkflow = {
        ...state.workflow,
        tasks: recalculateLayout(tasks),
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
      };
    }),

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  setSelectedForm: (id) => set({ selectedFormId: id }),

  addForm: (form) =>
    set((state) => {
      const updatedWorkflow = {
        ...state.workflow,
        forms: [...(state.workflow.forms || []), form],
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
      };
    }),

  updateForm: (formId, updates) =>
    set((state) => {
      const updatedWorkflow = {
        ...state.workflow,
        forms: (state.workflow.forms || []).map((form) =>
          form.id === formId ? { ...form, ...updates } : form
        ),
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
      };
    }),

  deleteForm: (formId) =>
    set((state) => {
      const updatedWorkflow = {
        ...state.workflow,
        forms: (state.workflow.forms || []).filter((f) => f.id !== formId),
        tasks: state.workflow.tasks.map((t) => {
          if (t.formIds?.includes(formId)) {
            return { ...t, formIds: t.formIds.filter((id) => id !== formId) };
          }
          return t;
        }),
      };
      return {
        workflow: updatedWorkflow,
        workflows: state.workflows.map((w) => (w.id === state.workflow.id ? updatedWorkflow : w)),
        selectedFormId: state.selectedFormId === formId ? null : state.selectedFormId,
      };
    }),
}));
