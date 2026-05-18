import { useState, useMemo } from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { DUMMY_USERS } from '../utils/constants';
import type { FormQuestion } from '../types/workflow.types';

export const TaskEditorView = () => {
  const { workflow, selectedTaskId, setSelectedTask, updateTask, deleteTask, reorderTask } = useWorkflowStore();
  const [approverSearch, setApproverSearch] = useState('');
  const [showApproverDropdown, setShowApproverDropdown] = useState(false);

  const [formSearch, setFormSearch] = useState('');
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const selectedTask = workflow.tasks.find((t) => t.id === selectedTaskId);
  const selectedIndex = workflow.tasks.findIndex((t) => t.id === selectedTaskId);
  const forms = workflow.forms || [];

  const usedFormIds = useMemo(() => {
    return workflow.tasks.flatMap(t => t.formIds || []);
  }, [workflow.tasks]);

  const previousTasks = selectedIndex > 0 ? workflow.tasks.slice(0, selectedIndex) : [];
  const availableQuestions: { taskId: string, taskName: string, formId: string, formTitle: string, question: FormQuestion }[] = [];

  previousTasks.forEach(task => {
    (task.formIds || []).forEach(formId => {
      const form = forms.find(f => f.id === formId);
      if (form) {
        form.questions.forEach(q => {
          availableQuestions.push({
            taskId: task.id,
            taskName: task.name,
            formId: form.id,
            formTitle: form.title,
            question: q
          });
        });
      }
    });
  });

  const handleConditionChange = (field: string, value: string) => {
    if (!selectedTask) return;

    let currentCondition = selectedTask.condition;

    if (field === 'question') {
      if (value === '') {
        updateTask(selectedTask.id, { condition: undefined });
        return;
      }
      const [taskId, formId, questionId] = value.split('|');
      currentCondition = {
        dependentTaskId: taskId,
        formId,
        questionId,
        operator: 'equals',
        value: ''
      };
    } else if (currentCondition) {
      currentCondition = { ...currentCondition, [field]: value };
    }

    updateTask(selectedTask.id, { condition: currentCondition });
  };

  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTask(e.target.value === '' ? null : e.target.value);
  };

  const isDuplicateTaskName = (name: string, taskId?: string) => {
    return workflow.tasks.some(t => t.id !== taskId && t.name.toLowerCase() === name.toLowerCase().trim());
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask) return;
    const newName = e.target.value;
    setEditingName({ ...editingName, [selectedTask.id]: newName });

    if (!isDuplicateTaskName(newName, selectedTask.id) && newName.trim() !== '') {
      updateTask(selectedTask.id, { name: newName });
    }
  };

  const handleNameBlur = () => {
    if (!selectedTask) return;
    const currentEdit = editingName[selectedTask.id];
    if (currentEdit !== undefined) {
      const newEditing = { ...editingName };
      delete newEditing[selectedTask.id];
      setEditingName(newEditing);
    }
  };

  const handleAddApprover = (userId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.approverIds || [];
      if (!currentIds.includes(userId)) {
        updateTask(selectedTask.id, { approverIds: [...currentIds, userId] });
      }
      setApproverSearch('');
      setShowApproverDropdown(false);
    }
  };

  const handleRemoveApprover = (userId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.approverIds || [];
      updateTask(selectedTask.id, { approverIds: currentIds.filter(id => id !== userId) });
    }
  };

  const filteredUsers = DUMMY_USERS.filter(u =>
    u.name.toLowerCase().includes(approverSearch.toLowerCase()) &&
    !(selectedTask?.approverIds || []).includes(u.id)
  );

  const handleAddForm = (formId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.formIds || [];
      if (!currentIds.includes(formId)) {
        updateTask(selectedTask.id, { formIds: [...currentIds, formId] });
      }
      setFormSearch('');
      setShowFormDropdown(false);
    }
  };

  const handleRemoveForm = (formId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.formIds || [];
      updateTask(selectedTask.id, { formIds: currentIds.filter(id => id !== formId) });
    }
  };

  const filteredForms = forms.filter(f =>
    f.title.toLowerCase().includes(formSearch.toLowerCase()) &&
    !(selectedTask?.formIds || []).includes(f.id) &&
    !usedFormIds.includes(f.id)
  );

  const handleDeleteTask = () => {
    if (selectedTask) {
      if (confirm(`¿Estás seguro de eliminar la tarea "${selectedTask.name}"?`)) {
        deleteTask(selectedTask.id);
      }
    }
  };

  return (
    <div className="panel-container form-panel">
      <div className="panel-header">
        <h3>Editor de Tareas</h3>
      </div>

      <div className="panel-content padded-content">
        <div className="task-selector">
          <label>Seleccionar Tarea:</label>
          <select className="form-input" value={selectedTaskId || ''} onChange={handleTaskChange}>
            <option value="">-- Selecciona una tarea --</option>
            {workflow.tasks.map(t => (
              <option key={t.id} value={t.id}>{t.order}. {t.name}</option>
            ))}
          </select>
        </div>

        {!selectedTask ? (
          <div className="empty-state" style={{ marginTop: '20px' }}>
            <p>Selecciona una tarea del menú o haz clic en un nodo del canvas.</p>
          </div>
        ) : (
          <div className="editor-form">

            <div className="editor-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--panel-border)', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold' }}>Orden: {selectedTask.order}</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  className="btn-small"
                  disabled={selectedIndex <= 1}
                  onClick={() => reorderTask(selectedTask.id, 'up')}
                >
                  ⬆️ Subir
                </button>
                <button
                  className="btn-small"
                  disabled={selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1}
                  onClick={() => reorderTask(selectedTask.id, 'down')}
                >
                  ⬇️ Bajar
                </button>
              </div>
            </div>

            <div className="editor-section">
              <h4>Configuración Básica</h4>
              <div className="editor-field">
                <label>Nombre de la Tarea</label>
                <input
                  type="text"
                  className={`form-input ${editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) ? 'error' : ''}`}
                  value={editingName[selectedTask.id] !== undefined ? editingName[selectedTask.id] : selectedTask.name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  style={editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) ? { borderColor: '#ef4444' } : {}}
                />
                {editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) && (
                  <span className="error-text" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Este nombre de tarea ya existe.
                  </span>
                )}
              </div>
              <div className="editor-field relative">
                <label>Aprobadores</label>
                <div className="multiselect-container">
                  <div className="multiselect-pills">
                    {(selectedTask.approverIds || []).map(id => {
                      const user = DUMMY_USERS.find(u => u.id === id);
                      return (
                        <div key={id} className="multiselect-pill">
                          {user ? user.name : id}
                          <span className="pill-remove" onMouseDown={(e) => { e.preventDefault(); handleRemoveApprover(id); }}>×</span>
                        </div>
                      );
                    })}
                  </div>
                  <input
                    type="text" className="form-input multiselect-input" placeholder="Buscar aprobador..."
                    value={approverSearch}
                    onChange={(e) => { setApproverSearch(e.target.value); setShowApproverDropdown(true); }}
                    onFocus={() => setShowApproverDropdown(true)}
                    onBlur={() => setTimeout(() => setShowApproverDropdown(false), 200)}
                  />
                </div>
                {showApproverDropdown && filteredUsers.length > 0 && (
                  <div className="multiselect-dropdown">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="multiselect-option" onMouseDown={(e) => { e.preventDefault(); handleAddApprover(u.id); }}>
                        {u.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="editor-section">
              <h4>Formularios Vinculados</h4>
              <p className="form-desc" style={{ marginBottom: '10px' }}>Selecciona uno o más formularios globales.</p>

              <div className="editor-field relative">
                <div className="multiselect-container">
                  <div className="multiselect-pills">
                    {(selectedTask.formIds || []).map(id => {
                      const form = forms.find(f => f.id === id);
                      return (
                        <div key={id} className="multiselect-pill">
                          📄 {form ? form.title : id}
                          <span className="pill-remove" onMouseDown={(e) => { e.preventDefault(); handleRemoveForm(id); }}>×</span>
                        </div>
                      );
                    })}
                  </div>
                  <input
                    type="text" className="form-input multiselect-input" placeholder="Buscar formulario..."
                    value={formSearch}
                    onChange={(e) => { setFormSearch(e.target.value); setShowFormDropdown(true); }}
                    onFocus={() => setShowFormDropdown(true)}
                    onBlur={() => setTimeout(() => setShowFormDropdown(false), 200)}
                  />
                </div>
                {showFormDropdown && filteredForms.length > 0 && (
                  <div className="multiselect-dropdown">
                    {filteredForms.map(f => (
                      <div key={f.id} className="multiselect-option" onMouseDown={(e) => { e.preventDefault(); handleAddForm(f.id); }}>
                        📄 {f.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedIndex > 0 && (
              <div className="editor-section" style={{ marginTop: '30px', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
                <h4>Condición de Activación</h4>
                <p className="form-desc" style={{ marginBottom: '10px' }}>Selecciona una pregunta de un formulario previo para condicionar cuándo se ejecuta esta tarea.</p>

                <div className="editor-field">
                  <label>Depende de la pregunta:</label>
                  <select
                    className="form-input"
                    value={selectedTask.condition ? `${selectedTask.condition.dependentTaskId}|${selectedTask.condition.formId}|${selectedTask.condition.questionId}` : ''}
                    onChange={(e) => handleConditionChange('question', e.target.value)}
                  >
                    <option value="">-- Siempre ejecutar (Sin condición) --</option>
                    {availableQuestions.map((item) => (
                      <option key={`${item.taskId}|${item.formId}|${item.question.id}`} value={`${item.taskId}|${item.formId}|${item.question.id}`}>
                        {item.taskName} &gt; {item.formTitle} &gt; {item.question.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTask.condition && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <div className="editor-field" style={{ flex: 1, marginBottom: 0 }}>
                      <label>Operador</label>
                      <select
                        className="form-input"
                        value={selectedTask.condition.operator}
                        onChange={(e) => handleConditionChange('operator', e.target.value)}
                      >
                        <option value="equals">Es igual a</option>
                        <option value="not_equals">No es igual a</option>
                        <option value="contains">Contiene</option>
                      </select>
                    </div>
                    <div className="editor-field" style={{ flex: 2, marginBottom: 0 }}>
                      <label>Valor esperado</label>
                      {(() => {
                        const targetQ = availableQuestions.find(q => q.question.id === selectedTask.condition?.questionId)?.question;
                        if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
                          return (
                            <select
                              className="form-input"
                              value={selectedTask.condition.value}
                              onChange={(e) => handleConditionChange('value', e.target.value)}
                            >
                              <option value="">-- Selecciona un valor --</option>
                              {targetQ.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          );
                        }
                        return (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Escribe el valor..."
                            value={selectedTask.condition.value}
                            onChange={(e) => handleConditionChange('value', e.target.value)}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedIndex > 0 && (
              <div className="editor-section" style={{ marginTop: '30px', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
                <button
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--danger)', width: '100%' }}
                  onClick={handleDeleteTask}
                >
                  Eliminar Tarea
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
