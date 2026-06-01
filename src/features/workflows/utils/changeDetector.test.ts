import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectWorkflowChanges } from './changeDetector';
import type { Workflow, Task, Form } from '../../../types/workflow.types';

describe('detectWorkflowChanges', () => {
  // Mock para la función de traducción (i18n). 
  // Nos permite verificar qué claves de traducción y qué datos se envían sin depender de textos reales.
  const mockT = vi.fn((key: string, options?: any) => {
    if (options) {
      return `${key}|${JSON.stringify(options)}`;
    }
    return key;
  });

  beforeEach(() => {
    mockT.mockClear();
  });

  const baseTask: Task = {
    id: 't-1',
    name: 'Base Task',
    order: 1,
    approverIds: [],
    formIds: [],
    condition: undefined,
    ui_metadata: { x: 0, y: 0 }
  };

  const baseForm: Form = {
    id: 'f-1',
    title: 'Base Form',
    description: 'Desc',
    questions: []
  };

  const baseWorkflow: Workflow = {
    id: 'w-1',
    name: 'Base Workflow',
    enabled: true,
    tasks: [],
    forms: [],
    version: '1'
  };

  it('debería retornar el mensaje inicial si no hay flujo original', () => {
    const result = detectWorkflowChanges(null, baseWorkflow, mockT);
    expect(result).toBe('changes.init');
  });

  it('debería detectar cambio en el nombre del flujo', () => {
    const current = { ...baseWorkflow, name: 'New Workflow Name' };
    const result = detectWorkflowChanges(baseWorkflow, current, mockT);
    expect(result).toContain('changes.rename_workflow');
  });

  it('debería detectar si el flujo es habilitado o deshabilitado', () => {
    const currentDisabled = { ...baseWorkflow, enabled: false };
    expect(detectWorkflowChanges(baseWorkflow, currentDisabled, mockT)).toBe('changes.disable_workflow');

    const originalDisabled = { ...baseWorkflow, enabled: false };
    const currentEnabled = { ...baseWorkflow, enabled: true };
    expect(detectWorkflowChanges(originalDisabled, currentEnabled, mockT)).toBe('changes.enable_workflow');
  });

  it('debería detectar cuando se agrega una nueva tarea', () => {
    const current = { ...baseWorkflow, tasks: [baseTask] };
    const result = detectWorkflowChanges(baseWorkflow, current, mockT);
    expect(result).toContain('changes.add_task');
  });

  it('debería detectar cuando se elimina una tarea', () => {
    const original = { ...baseWorkflow, tasks: [baseTask] };
    const result = detectWorkflowChanges(original, baseWorkflow, mockT);
    expect(result).toContain('changes.delete_task');
  });

  it('debería detectar modificaciones en campos de una tarea (nombre, orden, aprobadores)', () => {
    const original = { ...baseWorkflow, tasks: [baseTask] };
    const modifiedTask = { 
      ...baseTask, 
      name: 'Modified Task', 
      order: 2, 
      approverIds: ['usr-1'] 
    };
    const current = { ...baseWorkflow, tasks: [modifiedTask] };
    
    const result = detectWorkflowChanges(original, current, mockT);
    expect(result).toContain('changes.modify_task');
    expect(result).toContain('changes.task_fields.name');
    expect(result).toContain('changes.task_fields.order');
    expect(result).toContain('changes.task_fields.approvers');
  });

  it('debería detectar cuando se agrega un nuevo formulario', () => {
    const current = { ...baseWorkflow, forms: [baseForm] };
    const result = detectWorkflowChanges(baseWorkflow, current, mockT);
    expect(result).toContain('changes.add_form');
  });

  it('debería detectar cuando se elimina un formulario', () => {
    const original = { ...baseWorkflow, forms: [baseForm] };
    const result = detectWorkflowChanges(original, baseWorkflow, mockT);
    expect(result).toContain('changes.delete_form');
  });

  it('debería detectar modificaciones en un formulario (título, descripción, preguntas)', () => {
    const original = { ...baseWorkflow, forms: [baseForm] };
    const modifiedForm: Form = { 
      ...baseForm, 
      title: 'New Title',
      description: 'New Desc',
      questions: [{ id: 'q-1', label: 'Q1?', type: 'text', required: true }]
    };
    const current = { ...baseWorkflow, forms: [modifiedForm] };
    
    const result = detectWorkflowChanges(original, current, mockT);
    expect(result).toContain('changes.modify_form');
    expect(result).toContain('changes.form_fields.title');
    expect(result).toContain('changes.form_fields.description');
    expect(result).toContain('changes.form_fields.questions');
  });

  it('debería retornar que no hay cambios si ambos flujos son idénticos', () => {
    const result = detectWorkflowChanges(baseWorkflow, baseWorkflow, mockT);
    expect(result).toBe('changes.no_changes');
  });
});
