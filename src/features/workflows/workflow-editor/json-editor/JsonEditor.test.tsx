import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JsonEditor } from './JsonEditor';
import { useWorkflowStore } from '../../store/useWorkflowStore';

// Mock de i18next para evitar depender de traducciones reales
vi.mock('react-i18next', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: '3rdParty', init: vi.fn() }
  };
});

// Mock del editor de código (Monaco) ya que es muy pesado y requiere un DOM real
vi.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: ({ onChange, value }: any) => (
      <textarea 
        data-testid="monaco-editor" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
      />
    )
  };
});

describe('JsonEditor Component', () => {
  const initialStoreState = useWorkflowStore.getState();

  beforeEach(() => {
    useWorkflowStore.setState(initialStoreState, true);
    vi.clearAllMocks();
  });

  it('debería renderizar el componente y cargar el JSON inicial del flujo', () => {
    render(<JsonEditor />);
    
    expect(screen.getByText('json.title')).toBeInTheDocument();
    
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor).toBeInTheDocument();
    
    // Verificamos que el JSON contiene algún dato del store
    expect(editor.value).toContain('v1.0');
  });

  it('debería mostrar un mensaje de error si el usuario ingresa un JSON inválido', async () => {
    render(<JsonEditor />);
    const editor = screen.getByTestId('monaco-editor');
    
    // Simulamos escribir texto que no es JSON válido
    fireEvent.change(editor, { target: { value: '{ "name": "Test", faltan_comillas }' } });
    
    // El componente tiene un "debounce" de 600ms antes de validar, por lo que esperamos
    await waitFor(() => {
      // Debería aparecer el banner de error
      expect(screen.getAllByText(/common.error/i).length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });

  it('debería actualizar el estado global (Store) si se ingresa un JSON válido', async () => {
    render(<JsonEditor />);
    const editor = screen.getByTestId('monaco-editor');
    
    const nuevoWorkflowApi = {
      id: 'test-wk-123',
      name: 'Flujo Desde JSON',
      version: 'v2.0',
      ownerId: 'admin',
      rating: 5,
      enabled: true,
      creationDate: '01/01/2026',
      makerId: 'admin',
      checkerId: '',
      ownerName: 'Admin',
      tasks: []
    };
    
    fireEvent.change(editor, { target: { value: JSON.stringify(nuevoWorkflowApi) } });
    
    await waitFor(() => {
      expect(screen.queryByText(/common.error/i)).not.toBeInTheDocument();
      // Verificamos que el cambio en el componente impactó directamente a Zustand
      expect(useWorkflowStore.getState().workflow.name).toBe('Flujo Desde JSON');
    }, { timeout: 1000 });
  });
});
