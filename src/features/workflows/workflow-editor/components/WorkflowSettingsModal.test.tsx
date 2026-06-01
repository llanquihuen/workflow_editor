import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowSettingsModal } from './WorkflowSettingsModal';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { DUMMY_USERS } from '../../../../utils/constants';

vi.mock('react-i18next', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: '3rdParty', init: vi.fn() }
  };
});

describe('WorkflowSettingsModal Component', () => {
  const initialStoreState = useWorkflowStore.getState();

  beforeEach(() => {
    useWorkflowStore.setState(initialStoreState, true);
    vi.clearAllMocks();
  });

  it('no debería renderizar nada si isOpen es false', () => {
    const { container } = render(<WorkflowSettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('debería renderizarse correctamente y mostrar datos del flujo si isOpen es true', () => {
    render(<WorkflowSettingsModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getAllByText(/dashboard.workflow_settings/i).length).toBeGreaterThan(0);
    
    // Verifica que esté mostrando el ID del flujo y versión
    const wf = useWorkflowStore.getState().workflow;
    expect(screen.getByText(wf.id)).toBeInTheDocument();
  });

  it('debería actualizar el estado del flujo con los nuevos dueños y cerrar el modal', () => {
    const mockOnClose = vi.fn();
    render(<WorkflowSettingsModal isOpen={true} onClose={mockOnClose} />);
    
    // El combobox de "Dueño"
    const ownerSelect = screen.getByText('dashboard.workflow_settings_owner').nextElementSibling as HTMLSelectElement;
    fireEvent.change(ownerSelect, { target: { value: DUMMY_USERS[1].id } }); 
    
    // El combobox de "Verificador"
    const checkerSelect = screen.getByText('dashboard.workflow_settings_checker').nextElementSibling as HTMLSelectElement;
    fireEvent.change(checkerSelect, { target: { value: DUMMY_USERS[2].id } }); 
    
    // Hacer clic en Guardar
    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);
    
    // Verificaciones
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    const updatedWf = useWorkflowStore.getState().workflow;
    expect(updatedWf.ownerId).toBe(DUMMY_USERS[1].id);
    expect(updatedWf.checkerId).toBe(DUMMY_USERS[2].id);
    // El cleanOwnerName se quita la parte entre paréntesis
    const expectedCleanName = DUMMY_USERS[1].name.split(' (')[0];
    expect(updatedWf.ownerName).toBe(expectedCleanName);
  });
});
