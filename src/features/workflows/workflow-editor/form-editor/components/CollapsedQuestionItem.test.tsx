import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollapsedQuestionItem } from './CollapsedQuestionItem';

describe('CollapsedQuestionItem Component', () => {
  const mockOnExpand = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnMoveUp = vi.fn();
  const mockOnMoveDown = vi.fn();

  const defaultProps = {
    question: { id: 'q1', type: 'text', label: 'Pregunta de Prueba', required: false },
    questionNumber: 'Q1',
    requiredLabel: 'Campo Requerido',
    conditionalLabel: 'Tiene Condición',
    sensitiveLabel: 'Dato Sensible',
    onExpand: mockOnExpand,
    onDelete: mockOnDelete,
    onMoveUp: mockOnMoveUp,
    onMoveDown: mockOnMoveDown,
    isUpDisabled: false,
    isDownDisabled: false,
    moveUpLabel: 'Subir',
    moveDownLabel: 'Bajar'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar la pregunta básica correctamente', () => {
    render(<CollapsedQuestionItem {...defaultProps as any} />);
    expect(screen.getByText('Pregunta de Prueba')).toBeInTheDocument();
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('debería mostrar el indicador de requerido si la pregunta es obligatoria', () => {
    render(<CollapsedQuestionItem {...defaultProps as any} question={{ ...defaultProps.question, required: true }} />);
    expect(screen.getByTitle('Campo Requerido')).toBeInTheDocument();
  });

  it('debería mostrar el indicador de condicional si la pregunta tiene condiciones lógicas', () => {
    render(<CollapsedQuestionItem {...defaultProps as any} question={{ ...defaultProps.question, condition: { dependsOn: 'q2', expectedValue: 'Si' } }} />);
    expect(screen.getByTitle('Tiene Condición')).toBeInTheDocument();
  });

  it('debería mostrar el indicador de dato sensible si la propiedad isSensitive es verdadera', () => {
    render(<CollapsedQuestionItem {...defaultProps as any} question={{ ...defaultProps.question, isSensitive: true }} />);
    expect(screen.getByTitle('Dato Sensible')).toBeInTheDocument();
  });

  it('debería deshabilitar los botones de subir/bajar si se pasan las props correspondientes', () => {
    render(<CollapsedQuestionItem {...defaultProps as any} isUpDisabled={true} isDownDisabled={true} />);
    expect(screen.getByTitle('Subir')).toBeDisabled();
    expect(screen.getByTitle('Bajar')).toBeDisabled();
  });

  it('debería disparar los eventos correspondientes al hacer clic en los botones', () => {
    // Al renderizar, el primer botón con "▼" es el de expandir, el segundo es de bajar
    render(<CollapsedQuestionItem {...defaultProps as any} />);
    
    // Botón subir
    const upBtn = screen.getByTitle('Subir');
    fireEvent.click(upBtn);
    expect(mockOnMoveUp).toHaveBeenCalledTimes(1);

    // Botón bajar
    const downBtn = screen.getByTitle('Bajar');
    fireEvent.click(downBtn);
    expect(mockOnMoveDown).toHaveBeenCalledTimes(1);
    
    // El botón eliminar no tiene un título por texto, así que hacemos clic en el último botón
    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons[buttons.length - 1]; // El botón con ícono de basura
    fireEvent.click(deleteBtn);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});
