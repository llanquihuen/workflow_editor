import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowList } from './WorkflowList';
import { useWorkflowStore } from '../store/useWorkflowStore';

vi.mock('react-i18next', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: '3rdParty', init: vi.fn() }
  };
});

vi.stubGlobal('confirm', vi.fn(() => true));

describe('WorkflowList Component', () => {
  const initialStoreState = useWorkflowStore.getState();

  beforeEach(() => {
    useWorkflowStore.setState({
      ...initialStoreState,
      workflows: [
        { id: 'w1', name: 'Flujo 1', tasks: [1, 2, 3], forms: [], enabled: true, ownerId: 'usr-1', version: 'v1' } as any,
        { id: 'w2', name: 'Flujo 2', tasks: [1, 2, 3, 4, 5], forms: [], enabled: false, ownerId: 'usr-2', version: 'v1' } as any
      ]
    }, true);
    vi.clearAllMocks();
  });

  it('renderiza la lista de workflows correctamente', () => {
    render(<WorkflowList />);
    expect(screen.getByText('Flujo 1')).toBeInTheDocument();
    expect(screen.getByText('Flujo 2')).toBeInTheDocument();
  });

  it('filtra workflows por nombre', () => {
    render(<WorkflowList />);
    
    const searchInput = screen.getByPlaceholderText('dashboard.search_placeholder');
    fireEvent.change(searchInput, { target: { value: 'Flujo 1' } });
    
    const applyBtn = screen.getByText('dashboard.apply');
    fireEvent.click(applyBtn);

    expect(screen.getByText('Flujo 1')).toBeInTheDocument();
    expect(screen.queryByText('Flujo 2')).not.toBeInTheDocument();
    
    // Reset filters
    const resetBtn = screen.getByText('dashboard.reset');
    fireEvent.click(resetBtn);
    expect(screen.getByText('Flujo 2')).toBeInTheDocument();
  });

  it('permite crear un workflow nuevo', () => {
    render(<WorkflowList />);
    
    // Abre modal
    const newBtn = screen.getByText('dashboard.new_workflow');
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('dashboard.create_modal_placeholder');
    fireEvent.change(input, { target: { value: 'Nuevo Flujo' } });

    const createBtn = screen.getByText('dashboard.create_modal_submit');
    fireEvent.click(createBtn);

    expect(useWorkflowStore.getState().workflows.some(w => w.name === 'Nuevo Flujo')).toBe(true);
  });

  it('muestra error si se intenta crear un workflow duplicado', () => {
    render(<WorkflowList />);
    
    const newBtn = screen.getByText('dashboard.new_workflow');
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('dashboard.create_modal_placeholder');
    fireEvent.change(input, { target: { value: 'Flujo 1' } });

    const createBtn = screen.getByText('dashboard.create_modal_submit');
    fireEvent.click(createBtn);

    expect(screen.getByText(/forms.duplicate_name_error/)).toBeInTheDocument();
  });

  it('permite duplicar un workflow', () => {
    render(<WorkflowList />);
    
    const duplicateBtns = screen.getAllByTitle('common.duplicate');
    fireEvent.click(duplicateBtns[0]); // Duplicar Flujo 1

    const createBtn = screen.getByText('common.duplicate');
    fireEvent.click(createBtn);

    expect(useWorkflowStore.getState().workflows.some(w => w.name === 'Flujo 1 (Copia)')).toBe(true);
  });

  it('filtra workflows por complejidad y estado', () => {
    render(<WorkflowList />);
    
    const selects = screen.getAllByRole('combobox');
    const complexitySelect = selects[0]; // Complejidad
    const statusSelect = selects[1]; // Estado

    // Flujo 1 tiene 3 tareas (low), Flujo 2 tiene 5 (medium)
    fireEvent.change(complexitySelect, { target: { value: 'low' } });
    fireEvent.change(statusSelect, { target: { value: 'enabled' } });
    
    const applyBtn = screen.getByText('dashboard.apply');
    fireEvent.click(applyBtn);

    expect(screen.getByText('Flujo 1')).toBeInTheDocument();
    expect(screen.queryByText('Flujo 2')).not.toBeInTheDocument();
  });

  it('permite eliminar un workflow tras confirmación', async () => {
    render(<WorkflowList />);
    
    const deleteBtns = screen.getAllByTitle('common.delete');
    fireEvent.click(deleteBtns[0]); // delete Flujo 1

    expect(useWorkflowStore.getState().workflows.length).toBe(1); // el mock de confirm retorna true
  });

  it('permite activar/desactivar un workflow', () => {
    render(<WorkflowList />);
    
    // Checkboxes son los inputs con type="checkbox"
    const checkboxes = screen.getAllByRole('checkbox');
    // Workflow 1 está enabled (true), lo desactivamos
    fireEvent.click(checkboxes[0]);
    
    expect(useWorkflowStore.getState().workflows[0].enabled).toBe(false);
  });
});
