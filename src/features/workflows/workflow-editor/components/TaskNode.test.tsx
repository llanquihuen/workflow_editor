import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskNode } from './TaskNode';
import { useWorkflowStore } from '../../store/useWorkflowStore';

vi.mock('react-i18next', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: '3rdParty', init: vi.fn() }
  };
});

// Mock para @xyflow/react ya que no necesitamos renderizar el canvas completo
vi.mock('@xyflow/react', () => ({
  Handle: () => <div data-testid="xyflow-handle" />,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' }
}));

// Mock del método window.confirm
vi.stubGlobal('confirm', vi.fn(() => true));

describe('TaskNode Component', () => {
  const initialStoreState = useWorkflowStore.getState();

  beforeEach(() => {
    useWorkflowStore.setState(initialStoreState, true);
    vi.clearAllMocks();
  });

  it('debería renderizar la tarea con sus datos básicos', () => {
    // Configurar estado global para que contenga esta tarea
    useWorkflowStore.setState({
      workflow: {
        ...initialStoreState.workflow,
        tasks: [{ id: 't1', name: 'Tarea de Prueba', order: 1, approverIds: [], formIds: [] } as any]
      }
    });

    const mockData = {
      label: 'Tarea de Prueba',
      order: 1,
      approvers: ['usr-1', 'usr-2'],
      formTitles: ['Form 1'],
      taskType: 'normal'
    };
    
    render(<TaskNode {...({ id: "t1", data: mockData, selected: false, type: "task", xPos: 0, yPos: 0, zIndex: 1, isConnectable: true } as any)} />);
    
    expect(screen.getByText('Tarea de Prueba')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText('forms.title (1)')).toBeInTheDocument();
    expect(screen.getByText('2 tasks.approver_count')).toBeInTheDocument();
  });

  it('debería mostrar estado dinámico', () => {
    useWorkflowStore.setState({
      workflow: {
        ...initialStoreState.workflow,
        tasks: [{ id: 't1', name: 'T1', order: 1, approverIds: [], formIds: [] } as any]
      }
    });

    const mockData = { label: 'T1', order: 1, approvers: [], formTitles: [], taskType: 'dynamic' };
    render(<TaskNode {...({ id: "t1", data: mockData, selected: false, type: "task", xPos: 0, yPos: 0, zIndex: 1, isConnectable: true } as any)} />);
    
    expect(screen.getByText('tasks.task_type_dynamic')).toBeInTheDocument();
  });

  it('debería mostrar estado ISO', () => {
    useWorkflowStore.setState({
      workflow: {
        ...initialStoreState.workflow,
        tasks: [{ id: 't1', name: 'T1', order: 1, approverIds: [], formIds: [] } as any]
      }
    });

    const mockData = { label: 'T1', order: 1, approvers: [], formTitles: [], taskType: 'iso' };
    render(<TaskNode {...({ id: "t1", data: mockData, selected: false, type: "task", xPos: 0, yPos: 0, zIndex: 1, isConnectable: true } as any)} />);
    
    expect(screen.getByText('tasks.task_type_iso')).toBeInTheDocument();
  });

  it('debería llamar a los métodos de store al hacer clic en los controles', () => {
    // Espiamos los métodos del store
    const reorderSpy = vi.spyOn(useWorkflowStore.getState(), 'reorderTask');
    const deleteSpy = vi.spyOn(useWorkflowStore.getState(), 'deleteTask');

    useWorkflowStore.setState({
      workflow: {
        ...initialStoreState.workflow,
        tasks: [
          { id: 't0', name: 'T0', order: 1, approverIds: [], formIds: [] } as any,
          { id: 't1', name: 'T1', order: 2, approverIds: [], formIds: [] } as any,
          { id: 't2', name: 'T2', order: 3, approverIds: [], formIds: [] } as any,
          { id: 't3', name: 'T3', order: 4, approverIds: [], formIds: [] } as any
        ]
      }
    });

    // Renderizamos t2 (índice 2) que puede subir y bajar
    const mockData = { label: 'T2', order: 3, approvers: [], formTitles: [], taskType: 'normal' };
    render(<TaskNode {...({ id: "t2", data: mockData, selected: false, type: "task", xPos: 0, yPos: 0, zIndex: 1, isConnectable: true } as any)} />);
    
    // Los botones son el de Subir, Bajar y Eliminar. Usamos los title para encontrarlos.
    const upBtn = screen.getByTitle('common.up');
    const downBtn = screen.getByTitle('common.down');
    const deleteBtn = screen.getByTitle('common.delete');

    fireEvent.click(upBtn);
    expect(reorderSpy).toHaveBeenCalledWith('t2', 'up');

    fireEvent.click(downBtn);
    expect(reorderSpy).toHaveBeenCalledWith('t2', 'down');

    fireEvent.click(deleteBtn);
    expect(deleteSpy).toHaveBeenCalledWith('t2');
  });
});
