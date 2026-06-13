import { create } from 'zustand';
import type { Workflow, Task, Form } from '../../../types/workflow.types';
import { api, getAuthToken, getAuthUsername, removeAuthToken } from '../../../utils/api';

import procurementWorkflowData from '../../../data/procurementWorkflow.json';
import onboardingWorkflowData from '../../../data/onboardingWorkflow.json';
import deploymentWorkflowData from '../../../data/deploymentWorkflow.json';
import expenseWorkflowData from '../../../data/expenseWorkflow.json';
import initialWorkflowData from '../../../data/initialWorkflow.json';

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
  duplicateWorkflow: (id: string, customName?: string) => void;
  deleteWorkflow: (id: string) => Promise<void>;
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

  // Backend Sync State
  isAuthenticated: boolean;
  authUsername: string | null;
  loading: boolean;
  errorMessage: string | null;
  workflowHistory: any[];
  savedWorkflowSnapshot: Workflow | null;
  
  isOfflineMode: boolean;
  enableOfflineMode: () => void;
  checkAuth: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchWorkflowsFromDb: () => Promise<void>;
  saveWorkflowToDb: (changeSummary: string, newVersion?: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  rollbackToVersion: (version: string) => Promise<void>;
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
  const version = wf.version || 'v1.0';
  const rating = wf.rating || (5 - (index % 2));
  const enabled = wf.enabled !== undefined ? wf.enabled : true;

  const ownerName = wf.ownerName || 'System Administrator';

  const enriched = {
    ...wf,
    id,
    ownerId,
    updatedAt,
    version,
    rating,
    enabled,
    creationDate: wf.creationDate || '05/18/2026',
    makerId: wf.makerId || 'admin',
    checkerId: wf.checkerId || 'usr-20', // Gabriel Herrera (Dirección)
    ownerName,
    tasks: wf.tasks || [],
    forms: wf.forms || [],
  };

  return mapApiToFrontend(enriched);
};

// Mappers between API models and Frontend models
export const mapApiToFrontend = (apiWf: any): Workflow => {
  const extractedForms: Form[] = [];
  const seenFormIds = new Set<string>();

  const mappedTasks = (apiWf.tasks || []).map((task: any) => {
    const formIds = [...(task.formIds || [])];
    if (task.forms && Array.isArray(task.forms)) {
      task.forms.forEach((form: any) => {
        if (form && form.id) {
          if (!seenFormIds.has(form.id)) {
            extractedForms.push(form);
            seenFormIds.add(form.id);
          }
          if (!formIds.includes(form.id)) {
            formIds.push(form.id);
          }
        }
      });
    }
    const { forms, ...taskRest } = task;
    return {
      ...taskRest,
      formIds
    };
  });

  if (apiWf.forms && Array.isArray(apiWf.forms)) {
    apiWf.forms.forEach((form: any) => {
      if (form && form.id && !seenFormIds.has(form.id)) {
        extractedForms.push(form);
        seenFormIds.add(form.id);
      }
    });
  }

  return {
    id: apiWf.id,
    name: apiWf.name,
    version: apiWf.version || 'v1.0',
    ownerId: apiWf.ownerId || 'admin',
    updatedAt: apiWf.updatedAt || new Date().toLocaleDateString('en-US'),
    rating: apiWf.rating || 5,
    enabled: apiWf.enabled !== undefined ? apiWf.enabled : true,
    creationDate: apiWf.creationDate || new Date().toLocaleDateString('en-US'),
    makerId: apiWf.makerId || 'admin',
    checkerId: apiWf.checkerId || '',
    ownerName: apiWf.ownerName || 'System Administrator',
    tasks: mappedTasks,
    forms: extractedForms
  };
};

export const mapFrontendToApi = (wf: Workflow): any => {
  const mappedTasks = (wf.tasks || []).map((task) => {
    const nestedForms = (task.formIds || [])
      .map((fid) => (wf.forms || []).find((f) => f.id === fid))
      .filter((f): f is Form => !!f);

    return {
      ...task,
      forms: nestedForms
    };
  });

  return {
    id: wf.id,
    name: wf.name,
    version: wf.version || 'v1.0',
    ownerId: wf.ownerId || 'admin',
    rating: wf.rating || 5,
    enabled: wf.enabled,
    creationDate: wf.creationDate || new Date().toLocaleDateString('en-US'),
    makerId: wf.makerId || 'admin',
    checkerId: wf.checkerId || '',
    ownerName: wf.ownerName || 'System Administrator',
    tasks: mappedTasks
    // forms en la raíz ha sido eliminado por completo para cumplir con la nueva estructura
  };
};

const getUniqueWorkflowName = (name: string, workflows: Workflow[], excludeId?: string): string => {
  const cleanName = name.trim();
  const isDuplicate = (candidate: string) => {
    return workflows.some(
      (w) => w.id !== excludeId && w.name.trim().toLowerCase() === candidate.trim().toLowerCase()
    );
  };

  if (!isDuplicate(cleanName)) {
    return cleanName;
  }

  // Find first available counter
  let counter = 1;
  const match = cleanName.match(/(.*)\s\(Copia\s*(\d*)\)$/i);
  let baseName = cleanName;
  if (match) {
    baseName = match[1].trim();
    counter = match[2] ? parseInt(match[2], 10) + 1 : 2;
  } else {
    const firstCopyName = `${cleanName} (Copia)`;
    if (!isDuplicate(firstCopyName)) {
      return firstCopyName;
    }
    baseName = cleanName;
    counter = 2;
  }

  while (true) {
    const candidate = `${baseName} (Copia ${counter})`;
    if (!isDuplicate(candidate)) {
      return candidate;
    }
    counter++;
  }
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

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: initialWorkflows,
  workflow: initialActive,
  currentView: 'dashboard',
  selectedTaskId: initialActive.tasks?.[0]?.id || null,
  selectedFormId: initialActive.forms?.[0]?.id || null,
  theme: 'light',

  // Backend sync states
  isAuthenticated: false,
  isOfflineMode: false,
  authUsername: null,
  loading: false,
  errorMessage: null,
  workflowHistory: [],
  savedWorkflowSnapshot: null,

  enableOfflineMode: () => set({
    isAuthenticated: true,
    isOfflineMode: true,
    authUsername: 'Demo Local',
    workflows: initialWorkflows,
    workflow: initialActive,
    loading: false,
    errorMessage: null
  }),

  checkAuth: () => {
    const token = getAuthToken();
    const username = getAuthUsername();
    if (token && username) {
      set({ isAuthenticated: true, authUsername: username });
      get().fetchWorkflowsFromDb();
    }
  },

  login: async (username, password) => {
    set({ loading: true, errorMessage: null });
    try {
      const data = await api.login(username, password);
      set({ isAuthenticated: true, authUsername: data.username, loading: false });
      await get().fetchWorkflowsFromDb();
    } catch (e: any) {
      set({ loading: false, errorMessage: e.message || 'Error de autenticación' });
      throw e;
    }
  },

  logout: () => {
    removeAuthToken();
    localStorage.removeItem('bank_workflow_username');
    set({ isAuthenticated: false, isOfflineMode: false, authUsername: null, workflows: initialWorkflows, workflow: initialActive });
  },

  fetchWorkflowsFromDb: async () => {
    if (get().isOfflineMode) return;
    set({ loading: true, errorMessage: null });
    try {
      const apiWorkflows = await api.getWorkflows();
      const mapped = apiWorkflows.map(mapApiToFrontend);
      
      set({
        workflows: mapped.length > 0 ? mapped : initialWorkflows,
        workflow: mapped.length > 0 ? mapped[0] : initialActive,
        savedWorkflowSnapshot: mapped.length > 0 ? JSON.parse(JSON.stringify(mapped[0])) : JSON.parse(JSON.stringify(initialActive)),
        loading: false
      });
    } catch (e: any) {
      set({ loading: false, errorMessage: 'Error al conectar con la base de datos local' });
    }
  },

  saveWorkflowToDb: async (changeSummary, newVersion) => {
    set({ loading: true, errorMessage: null });
    const active = get().workflow;
    const assignedFormIds = new Set((active.tasks || []).flatMap((t) => t.formIds || []));
    const unassignedForms = (active.forms || []).filter((f) => !assignedFormIds.has(f.id));
    if (unassignedForms.length > 0) {
      const errorMsg = `No se pueden guardar los cambios. Existen formularios huérfanos sin asignar a ningún paso del flujo: ${unassignedForms.map(f => `"${f.title}"`).join(', ')}. Por favor vincula estos formularios a alguna tarea o elimínalos antes de continuar.`;
      set({ loading: false, errorMessage: errorMsg });
      throw new Error(errorMsg);
    }

    if (get().isOfflineMode) {
      const activeWithVersion = newVersion ? { ...active, version: newVersion } : active;
      setTimeout(() => {
        set((state) => ({
          workflow: activeWithVersion,
          savedWorkflowSnapshot: JSON.parse(JSON.stringify(activeWithVersion)),
          workflows: state.workflows.map((w) => (w.id === activeWithVersion.id ? activeWithVersion : w)),
          loading: false
        }));
      }, 300);
      return;
    }
    
    try {
      const active = get().workflow;
      const activeWithVersion = newVersion ? { ...active, version: newVersion } : active;
      const apiPayload = mapFrontendToApi(activeWithVersion);
      const savedApi = await api.saveWorkflow(apiPayload, changeSummary);
      const savedFrontend = mapApiToFrontend(savedApi);

      set((state) => ({
        workflow: savedFrontend,
        savedWorkflowSnapshot: JSON.parse(JSON.stringify(savedFrontend)),
        workflows: state.workflows.map((w) => (w.id === savedFrontend.id ? savedFrontend : w)),
        loading: false
      }));
      
      // Refresh history list
      await get().fetchHistory(savedFrontend.id);
    } catch (e: any) {
      set({ loading: false, errorMessage: e.message || 'Error al persistir cambios' });
      throw e;
    }
  },

  fetchHistory: async (id) => {
    try {
      const history = await api.getHistory(id);
      set({ workflowHistory: history });
    } catch (e) {
      // ignore
    }
  },

  rollbackToVersion: async (version) => {
    set({ loading: true, errorMessage: null });
    try {
      const active = get().workflow;
      const snapshot = await api.getHistoryVersionJson(active.id, version);
      const rolledBack = mapApiToFrontend(snapshot);

      // Increment version code for the new save operation
      const currentVerNum = parseFloat((active.version || 'v1.0').replace(/[^\d.]/g, '')) || 1.0;
      const nextVer = `v${(currentVerNum + 0.1).toFixed(1)}`;
      const updatedRollback = {
        ...rolledBack,
        version: nextVer
      };

      set((state) => ({
        workflow: updatedRollback,
        savedWorkflowSnapshot: JSON.parse(JSON.stringify(updatedRollback)),
        workflows: state.workflows.map((w) => (w.id === active.id ? updatedRollback : w)),
        loading: false
      }));

      // Automatically persist rollback to DB as a new audit version
      await get().saveWorkflowToDb(`Restaurada versión anterior ${version}`);
    } catch (e: any) {
      set({ loading: false, errorMessage: e.message || 'Error en rollback' });
      throw e;
    }
  },

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
      
      // Proactively fetch history if authenticated
      if (state.isAuthenticated) {
        get().fetchHistory(id);
      }

      return {
        workflow: wf,
        savedWorkflowSnapshot: JSON.parse(JSON.stringify(wf)),
        currentView: 'flow',
        selectedTaskId: wf.tasks?.[0]?.id || null,
        selectedFormId: wf.forms?.[0]?.id || null,
      };
    }),

  createNewWorkflow: (name) =>
    set((state) => {
      const uniqueName = getUniqueWorkflowName(name, state.workflows);
      const newId = `WK-${Math.floor(100000 + Math.random() * 900000)}`;
      const newWorkflow: Workflow = {
        id: newId,
        name: uniqueName,
        ownerId: state.authUsername || 'admin',
        ownerName: state.authUsername || 'System Administrator',
        creationDate: new Date().toLocaleDateString('en-US'),
        makerId: state.authUsername || 'admin',
        checkerId: '',
        updatedAt: new Date().toLocaleDateString('en-US'),
        version: 'v1.0',
        rating: 5,
        enabled: true,
        tasks: [
          {
            id: `${newId}-T-1`,
            name: 'Request Submit',
            order: 1,
            taskType: 'system',
            ui_metadata: { x: 250, y: 50 },
            approverIds: [],
            formIds: [],
          },
        ],
        forms: [],
      };

      // Automatically persist newly created workflow to database
      if (state.isAuthenticated) {
        setTimeout(() => {
          get().saveWorkflowToDb('Inicialización del flujo');
        }, 100);
      }

      return {
        workflows: [...state.workflows, newWorkflow],
        workflow: newWorkflow,
        savedWorkflowSnapshot: JSON.parse(JSON.stringify(newWorkflow)),
        currentView: 'flow',
        selectedTaskId: `${newId}-T-1`,
        selectedFormId: null,
      };
    }),

  duplicateWorkflow: (id, customName) =>
    set((state) => {
      const target = state.workflows.find((wf) => wf.id === id);
      if (!target) return state;

      const newId = `WK-${Math.floor(100000 + Math.random() * 900000)}`;
      const baseName = customName || `${target.name} (Copia)`;
      const uniqueName = getUniqueWorkflowName(baseName, state.workflows);
      const duplicated: Workflow = {
        ...target,
        id: newId,
        name: uniqueName,
        ownerId: state.authUsername || 'admin',
        ownerName: state.authUsername || target.ownerName || 'System Administrator',
        creationDate: new Date().toLocaleDateString('en-US'),
        makerId: state.authUsername || 'admin',
        checkerId: target.checkerId || '',
        updatedAt: new Date().toLocaleDateString('en-US'),
        version: 'v1.0',
        rating: 5,
        enabled: true,
        tasks: target.tasks.map((t, idx) => ({ 
          ...t, 
          id: `${newId}-T-${idx + 1}` 
        })),
        forms: target.forms.map((f) => ({ ...f })),
      };

      if (state.isAuthenticated) {
        setTimeout(() => {
          // Select duplicated workflow and save
          set({ workflow: duplicated, savedWorkflowSnapshot: JSON.parse(JSON.stringify(duplicated)) });
          get().saveWorkflowToDb(`Copiado desde ${target.name}`);
        }, 100);
      }

      return {
        workflows: [...state.workflows, duplicated],
      };
    }),

  deleteWorkflow: async (id) => {
    if (get().isOfflineMode) {
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
      });
      return;
    }

    if (get().isAuthenticated) {
      set({ loading: true, errorMessage: null });
      try {
        await api.deleteWorkflow(id);
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
            loading: false,
          };
        });
      } catch (e: any) {
        set({ loading: false, errorMessage: e.message || 'Error al eliminar el workflow de la base de datos' });
        throw e;
      }
    } else {
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
      });
    }
  },

  toggleWorkflowEnabled: (id) =>
    set((state) => {
      const updatedWorkflows = state.workflows.map((wf) =>
        wf.id === id ? { ...wf, enabled: !wf.enabled } : wf
      );
      const updatedActive =
        state.workflow.id === id
          ? { ...state.workflow, enabled: !state.workflow.enabled }
          : state.workflow;

      setTimeout(() => {
        if (state.isAuthenticated) {
          get().saveWorkflowToDb('Cambiado estado de activación');
        }
      }, 50);

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
