import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkflowStore } from './useWorkflowStore';
import * as apiUtils from '../../../utils/api';

// Mock de la API para no hacer llamadas reales durante los tests
vi.mock('../../../utils/api', () => ({
  api: {
    login: vi.fn(),
    getWorkflows: vi.fn(),
    saveWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    getHistory: vi.fn(),
    getHistoryVersionJson: vi.fn(),
  },
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  getAuthUsername: vi.fn(),
  setAuthUsername: vi.fn(),
  removeAuthToken: vi.fn(),
}));

describe('useWorkflowStore (Zustand Global State)', () => {
  const initialStoreState = useWorkflowStore.getState();

  beforeEach(() => {
    // Restaurar el estado inicial antes de cada prueba
    useWorkflowStore.setState(initialStoreState, true);
    vi.clearAllMocks();
  });

  describe('Acciones Generales y de Navegación', () => {
    it('setCurrentView - debería cambiar la vista actual', () => {
      useWorkflowStore.getState().setCurrentView('forms');
      expect(useWorkflowStore.getState().currentView).toBe('forms');
    });

    it('toggleTheme - debería alternar entre tema oscuro y claro', () => {
      const startTheme = useWorkflowStore.getState().theme; // por defecto 'light'
      useWorkflowStore.getState().toggleTheme();
      expect(useWorkflowStore.getState().theme).toBe(startTheme === 'light' ? 'dark' : 'light');
    });
  });

  describe('Gestión de Flujos (Workflows)', () => {
    it('createNewWorkflow - debería crear un flujo nuevo con nombre único', () => {
      const initialCount = useWorkflowStore.getState().workflows.length;
      useWorkflowStore.getState().createNewWorkflow('Mi Nuevo Flujo');
      
      const { workflows, workflow } = useWorkflowStore.getState();
      expect(workflows.length).toBe(initialCount + 1);
      expect(workflow.name).toBe('Mi Nuevo Flujo');
      expect(workflow.tasks.length).toBe(1); // Debería tener una tarea por defecto
    });

    it('duplicateWorkflow - debería duplicar un flujo existente', () => {
      const state = useWorkflowStore.getState();
      const firstWorkflow = state.workflows[0];
      const initialCount = state.workflows.length;

      state.duplicateWorkflow(firstWorkflow.id);
      
      const newState = useWorkflowStore.getState();
      expect(newState.workflows.length).toBe(initialCount + 1);
      // El nombre del duplicado debería contener "Copia"
      const duplicated = newState.workflows[newState.workflows.length - 1];
      expect(duplicated.name).toContain(firstWorkflow.name);
      expect(duplicated.name).toContain('Copia');
    });

    it('toggleWorkflowEnabled - debería activar/desactivar un flujo', () => {
      const state = useWorkflowStore.getState();
      const activeWfId = state.workflow.id;
      const initialStatus = state.workflow.enabled;

      state.toggleWorkflowEnabled(activeWfId);
      
      expect(useWorkflowStore.getState().workflow.enabled).toBe(!initialStatus);
    });
  });

  describe('Gestión de Tareas (Tasks)', () => {
    it('addTask - debería agregar una tarea al flujo activo y recalcular posiciones', () => {
      const newTask = { id: 'test-task', name: 'Nueva Tarea', order: 99, approverIds: [], formIds: [] };
      const initialTaskCount = useWorkflowStore.getState().workflow.tasks.length;
      
      useWorkflowStore.getState().addTask(newTask as any);
      
      const state = useWorkflowStore.getState();
      expect(state.workflow.tasks.length).toBe(initialTaskCount + 1);
      expect(state.selectedTaskId).toBe('test-task');
    });

    it('deleteTask - debería eliminar una tarea (si no es la primera)', () => {
      const state = useWorkflowStore.getState();
      const uniqueId = 'unique-test-task-12345';
      state.addTask({ id: uniqueId, name: 'T2', order: 99, approverIds: [], formIds: [] } as any);
      
      const initialCount = useWorkflowStore.getState().workflow.tasks.length;
      useWorkflowStore.getState().deleteTask(uniqueId);
      
      expect(useWorkflowStore.getState().workflow.tasks.length).toBe(initialCount - 1);
    });

    it('updateTask - debería actualizar propiedades de una tarea específica', () => {
      const firstTaskId = useWorkflowStore.getState().workflow.tasks[0].id;
      useWorkflowStore.getState().updateTask(firstTaskId, { name: 'Nombre Actualizado' });
      
      const updatedTask = useWorkflowStore.getState().workflow.tasks.find(t => t.id === firstTaskId);
      expect(updatedTask?.name).toBe('Nombre Actualizado');
    });

    it('updateTasksPositions - actualiza la posición UI de las tareas', () => {
      const firstTaskId = useWorkflowStore.getState().workflow.tasks[0].id;
      useWorkflowStore.getState().updateTasksPositions([{ id: firstTaskId, x: 500, y: 500 }]);
      
      const updatedTask = useWorkflowStore.getState().workflow.tasks.find(t => t.id === firstTaskId);
      expect(updatedTask?.ui_metadata?.x).toBe(500);
    });

    it('setSelectedTask y setSelectedForm - actualizan los IDs seleccionados', () => {
      useWorkflowStore.getState().setSelectedTask('fake-task-123');
      expect(useWorkflowStore.getState().selectedTaskId).toBe('fake-task-123');

      useWorkflowStore.getState().setSelectedForm('fake-form-123');
      expect(useWorkflowStore.getState().selectedFormId).toBe('fake-form-123');
    });

    it('reorderTask - casos límite', () => {
      // index -1
      useWorkflowStore.getState().reorderTask('no-existe', 'up');
      
      // index 0 up no se puede (ni down en realidad para el index 0 si es Inicial)
      const firstTaskId = useWorkflowStore.getState().workflow.tasks[0].id;
      useWorkflowStore.getState().reorderTask(firstTaskId, 'up');
    });
  });

  describe('Gestión de Formularios (Forms)', () => {
    it('addForm - debería agregar un formulario al flujo', () => {
      const newForm = { id: 'form-test', title: 'Formulario 1', description: '', questions: [] };
      const initialFormsCount = useWorkflowStore.getState().workflow.forms?.length || 0;
      
      useWorkflowStore.getState().addForm(newForm);
      
      expect(useWorkflowStore.getState().workflow.forms?.length).toBe(initialFormsCount + 1);
    });

    it('deleteForm - debería eliminar el formulario y limpiar referencias en tareas', () => {
      const newForm = { id: 'form-test', title: 'Formulario 1', description: '', questions: [] };
      useWorkflowStore.getState().addForm(newForm);
      
      useWorkflowStore.getState().deleteForm('form-test');
      
      const forms = useWorkflowStore.getState().workflow.forms || [];
      expect(forms.find(f => f.id === 'form-test')).toBeUndefined();
    });

    it('updateForm - actualiza las propiedades de un formulario existente', () => {
      useWorkflowStore.getState().addForm({ id: 'f1', title: 'A', description: '', questions: [] });
      useWorkflowStore.getState().updateForm('f1', { title: 'B' });
      const f = useWorkflowStore.getState().workflow.forms?.find(x => x.id === 'f1');
      expect(f?.title).toBe('B');
    });
  });

  describe('Autenticación y Backend (Modo Offline)', () => {
    it('enableOfflineMode - debería establecer la app en modo local', () => {
      useWorkflowStore.getState().enableOfflineMode();
      const state = useWorkflowStore.getState();
      expect(state.isOfflineMode).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.authUsername).toBe('Demo Local');
    });

    it('logout - debería limpiar el estado de autenticación', () => {
      useWorkflowStore.getState().enableOfflineMode(); // Log in fake
      useWorkflowStore.getState().logout(); // Log out
      
      const state = useWorkflowStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.authUsername).toBeNull();
    });

    it('checkAuth - auto login si hay token en storage', () => {
      (apiUtils.getAuthToken as any).mockReturnValueOnce('abc');
      (apiUtils.getAuthUsername as any).mockReturnValueOnce('def');
      useWorkflowStore.getState().checkAuth();
      expect(useWorkflowStore.getState().isAuthenticated).toBe(true);
      expect(useWorkflowStore.getState().authUsername).toBe('def');
    });

    it('login - exitoso', async () => {
      (apiUtils.api.login as any).mockResolvedValueOnce({ token: '1', username: 'usr' });
      (apiUtils.api.getWorkflows as any).mockResolvedValueOnce([]);
      await useWorkflowStore.getState().login('user', 'pass');
      expect(useWorkflowStore.getState().isAuthenticated).toBe(true);
      expect(useWorkflowStore.getState().authUsername).toBe('usr');
    });

    it('login - error', async () => {
      (apiUtils.api.login as any).mockRejectedValueOnce(new Error('fail login'));
      await expect(useWorkflowStore.getState().login('user', 'pass')).rejects.toThrow('fail login');
      expect(useWorkflowStore.getState().errorMessage).toBe('fail login');
    });

    it('deleteWorkflow - elimina en base de datos si esta autenticado', async () => {
      useWorkflowStore.setState({ isAuthenticated: true, isOfflineMode: false });
      (apiUtils.api.deleteWorkflow as any).mockResolvedValueOnce(true);
      const wfId = useWorkflowStore.getState().workflow.id;
      await useWorkflowStore.getState().deleteWorkflow(wfId);
      expect(apiUtils.api.deleteWorkflow).toHaveBeenCalledWith(wfId);
    });

    it('saveWorkflowToDb - guarda online', async () => {
      useWorkflowStore.setState({ isAuthenticated: true, isOfflineMode: false });
      const currentWf = useWorkflowStore.getState().workflow;
      (apiUtils.api.saveWorkflow as any).mockResolvedValueOnce({ ...currentWf, name: 'Saved Online' });
      await useWorkflowStore.getState().saveWorkflowToDb('Test change');
      expect(apiUtils.api.saveWorkflow).toHaveBeenCalled();
      expect(useWorkflowStore.getState().workflow.name).toBe('Saved Online');
    });
    
    it('saveWorkflowToDb - lanza error si hay formularios huérfanos', async () => {
      // agregamos form huerfano (sin estar en ninguna tarea)
      useWorkflowStore.getState().addForm({ id: 'huérfano', title: 'Huérfano', questions: [] });
      
      await expect(useWorkflowStore.getState().saveWorkflowToDb('test')).rejects.toThrow(/formularios huérfanos/i);
      
      // cleanup
      useWorkflowStore.getState().deleteForm('huérfano');
    });

    it('rollbackToVersion - lanza error si falla', async () => {
      vi.spyOn(apiUtils.api, 'getHistoryVersionJson').mockRejectedValueOnce(new Error('Rollback fail'));
      await expect(useWorkflowStore.getState().rollbackToVersion('v1.0')).rejects.toThrow('Rollback fail');
    });

    it('fetchHistory - se maneja correctamente', async () => {
      vi.spyOn(apiUtils.api, 'getHistory').mockResolvedValueOnce([{ id: 1, version: 'v1.0' } as any]);
      await useWorkflowStore.getState().fetchHistory('mock-id');
      expect(useWorkflowStore.getState().workflowHistory.length).toBeGreaterThan(0);
    });
    
    it('fetchWorkflowsFromDb - carga workflows', async () => {
      useWorkflowStore.setState({ isOfflineMode: false });
      (apiUtils.api.getWorkflows as any).mockResolvedValueOnce([
        { id: 'wf1', name: 'W1', tasks: [], forms: [] }
      ]);
      await useWorkflowStore.getState().fetchWorkflowsFromDb();
      expect(useWorkflowStore.getState().workflows.length).toBe(1);
      expect(useWorkflowStore.getState().workflows[0].id).toBe('wf1');
    });
  });
});
