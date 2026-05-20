import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { DUMMY_USERS } from '../utils/constants';
import type { FormQuestion, TaskCondition } from '../types/workflow.types';

export const TaskEditorView = () => {
  const { t } = useTranslation();
  const { workflow, selectedTaskId, setSelectedTask, updateTask, deleteTask, reorderTask, addTask } = useWorkflowStore();
  const [approverSearch, setApproverSearch] = useState('');
  const [showApproverDropdown, setShowApproverDropdown] = useState(false);

  const [formSearch, setFormSearch] = useState('');
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-dropdown-container')) {
        setShowTaskDropdown(false);
      }
    };

    if (showTaskDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskDropdown]);

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

  const handleConditionChange = (conditionType: 'condition' | 'skipCondition', field: string, value: string) => {
    if (!selectedTask) return;

    let currentCondition = selectedTask[conditionType] as TaskCondition | undefined;

    if (field === 'question') {
      if (value === '') {
        updateTask(selectedTask.id, { [conditionType]: undefined });
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

    updateTask(selectedTask.id, { [conditionType]: currentCondition });
  };

  const handleTaskChange = (taskId: string) => {
    setSelectedTask(taskId === '' ? null : taskId);
    setShowTaskDropdown(false);
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
      if (confirm(t('tasks.delete_confirm', { name: selectedTask.name }))) {
        deleteTask(selectedTask.id);
      }
    }
  };

  const handleAddNewTask = () => {
    let baseName = t('tasks.new_task');
    let newName = baseName;
    let counter = 1;
    while (isDuplicateTaskName(newName)) {
      newName = `${baseName} ${counter}`;
      counter++;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      name: newName,
      order: workflow.tasks.length + 1,
      ui_metadata: { x: 0, y: 0 }
    };
    addTask(newTask);
  };

  return (
    <div className="panel-container form-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{t('tasks.editor_title')}</h3>
        <button className="btn-small" onClick={handleAddNewTask}>{t('tasks.add_task')}</button>
      </div>

      <div className="panel-content padded-content">
        <div className="task-selector">
          <label>{t('tasks.select_task')}</label>
          <div className="custom-dropdown-container">
            <button 
              className={`custom-dropdown-trigger ${!selectedTask ? 'placeholder' : ''}`}
              onClick={() => setShowTaskDropdown(!showTaskDropdown)}
            >
              <div className="trigger-content">
                {selectedTask ? (
                  <>
                    <span className="task-order-badge">{selectedTask.order}</span>
                    <span className="task-name-text">{selectedTask.name}</span>
                  </>
                ) : (
                  <span className="placeholder-text">{t('tasks.select_task_placeholder')}</span>
                )}
              </div>
              <span className={`dropdown-arrow ${showTaskDropdown ? 'open' : ''}`}>▼</span>
            </button>

            {showTaskDropdown && (
              <div className="custom-dropdown-menu">
                <div 
                  className={`dropdown-item ${!selectedTaskId ? 'selected' : ''}`}
                  onClick={() => handleTaskChange('')}
                >
                  <span className="placeholder-text">{t('tasks.select_task_placeholder')}</span>
                </div>
                {workflow.tasks.map(t => (
                  <div 
                    key={t.id} 
                    className={`dropdown-item ${selectedTaskId === t.id ? 'selected' : ''}`}
                    onClick={() => handleTaskChange(t.id)}
                  >
                    <span className="task-order-badge">{t.order}</span>
                    <span className="task-name-text">{t.name}</span>
                    {selectedTaskId === t.id && <span className="selected-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!selectedTask ? (
          <div className="empty-state" style={{ marginTop: '20px' }}>
            <p>{t('tasks.empty_state')}</p>
          </div>
        ) : (
          <div className="editor-form">

            <div className="editor-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>{t('tasks.basic_config')}</h4>



                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Indicador de Condiciones */}
                  {selectedTask.condition ? (
                      <div title={t('tasks.has_conditions_tooltip', { defaultValue: 'Tiene condiciones de activación' })} style={{
                        display: 'flex',
                        backgroundColor: 'rgba(255, 165, 0, 0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--success)',
                        padding: '3px 6px',
                        borderRadius: '100px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'help'
                      }}>
                        🔀
                      </div>
                  ) : (
                      <div></div>
                  )}
                  {/* Indicador de Skip */}
                  {selectedTask.skipCondition ? (
                    <div title={t('tasks.skip_condition')} style={{
                      backgroundColor: 'rgba(255, 165, 0, 0.4)',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--danger)',
                      padding: '3px 3px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'help'
                    }}>
                      ⏭️
                    </div>
                  ) : (
                    <div></div>
                  )}
                  {/* Control del Orden del Paso */}
                  <div className="step-order-badge" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--primary)',
                    fontWeight: '600'
                  }}>
                    <span style={{ fontWeight: '700' }}>Reorder tasks</span>
                    <span>#{selectedTask.order}</span>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                      <button
                        disabled={selectedIndex <= 1}
                        onClick={() => reorderTask(selectedTask.id, 'up')}
                        title={t('common.up')}
                        style={{
                          background: selectedIndex <= 1 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.16)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          cursor: selectedIndex <= 1 ? 'not-allowed' : 'pointer',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          opacity: selectedIndex <= 1 ? 0.3 : 1,
                          color: 'var(--primary)',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700'
                        }}
                      >
                        ▲
                      </button>
                      <button
                        disabled={selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1}
                        onClick={() => reorderTask(selectedTask.id, 'down')}
                        title={t('common.down')}
                        style={{
                          background: (selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1)
                            ? 'rgba(59, 130, 246, 0.08)'
                            : 'rgba(59, 130, 246, 0.16)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          cursor: (selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1) ? 'not-allowed' : 'pointer',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          opacity: (selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1) ? 0.3 : 1,
                          color: 'var(--primary)',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700'
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>



                  {/* Botón de Borrar Tarea */}
                  {selectedIndex > 0 && (
                    <button
                      onClick={handleDeleteTask}
                      title={t('tasks.delete_task')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        lineHeight: 1,
                        fontWeight: '700',
                        padding:'17px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className="editor-field">
                <label>{t('tasks.task_name')}</label>
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
                    {t('tasks.duplicate_name_error')}
                  </span>
                )}
              </div>
              <div className="editor-field relative">
                <label>{t('tasks.approvers')}</label>
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
                    type="text" className="form-input multiselect-input" placeholder={t('tasks.search_approver')}
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
              <h4>{t('tasks.linked_forms')}</h4>
              <p className="form-desc" style={{ marginBottom: '10px' }}>{t('tasks.select_global_forms')}</p>

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
                    type="text" className="form-input multiselect-input" placeholder={t('tasks.search_form')}
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
              <div className="editor-section">
                <h4>{t('tasks.activation_condition')}</h4>
                <p className="form-desc" style={{ marginBottom: '15px' }}>{t('tasks.activation_desc')}</p>

                <div className="editor-field">
                  <label>{t('tasks.depends_on')}</label>
                  <select
                    className="form-input"
                    value={selectedTask.condition ? `${selectedTask.condition.dependentTaskId}|${selectedTask.condition.formId}|${selectedTask.condition.questionId}` : ''}
                    onChange={(e) => handleConditionChange('condition', 'question', e.target.value)}
                  >
                    <option value="">{t('tasks.always_execute')}</option>
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
                      <label>{t('tasks.operator')}</label>
                      <select
                        className="form-input"
                        value={selectedTask.condition.operator}
                        onChange={(e) => handleConditionChange('condition', 'operator', e.target.value)}
                      >
                        <option value="equals">{t('forms.operators.equals')}</option>
                        <option value="not_equals">{t('forms.operators.not_equals')}</option>
                        <option value="contains">{t('forms.operators.contains')}</option>
                        {(() => {
                          const targetQ = availableQuestions.find(q => q.question.id === selectedTask.condition?.questionId)?.question;
                          if (targetQ && targetQ.type === 'number') {
                            return (
                              <>
                                <option value="greater_than">{t('forms.operators.greater_than')}</option>
                                <option value="less_than">{t('forms.operators.less_than')}</option>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </select>
                    </div>
                    <div className="editor-field" style={{ flex: 2, marginBottom: 0 }}>
                      <label>{t('tasks.expected_value')}</label>
                      {(() => {
                        const targetQ = availableQuestions.find(q => q.question.id === selectedTask.condition?.questionId)?.question;
                        if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
                          return (
                            <select
                              className="form-input"
                              value={selectedTask.condition.value}
                              onChange={(e) => handleConditionChange('condition', 'value', e.target.value)}
                            >
                              <option value="">{t('common.select_option')}</option>
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
                            placeholder={t('tasks.expected_value')}
                            value={selectedTask.condition.value}
                            onChange={(e) => handleConditionChange('condition', 'value', e.target.value)}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedIndex > 0 && (
              <div className="editor-section">
                <h4>{t('tasks.skip_condition')}</h4>
                <p className="form-desc" style={{ marginBottom: '15px' }}>{t('tasks.skip_desc')}</p>

                <div className="editor-field">
                  <label>{t('tasks.skip_depends_on')}</label>
                  <select
                    className="form-input"
                    value={selectedTask.skipCondition ? `${selectedTask.skipCondition.dependentTaskId}|${selectedTask.skipCondition.formId}|${selectedTask.skipCondition.questionId}` : ''}
                    onChange={(e) => handleConditionChange('skipCondition', 'question', e.target.value)}
                  >
                    <option value="">{t('tasks.never_skip')}</option>
                    {availableQuestions.map((item) => (
                      <option key={`skip-${item.taskId}|${item.formId}|${item.question.id}`} value={`${item.taskId}|${item.formId}|${item.question.id}`}>
                        {item.taskName} &gt; {item.formTitle} &gt; {item.question.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTask.skipCondition && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <div className="editor-field" style={{ flex: 1, marginBottom: 0 }}>
                      <label>{t('tasks.operator')}</label>
                      <select
                        className="form-input"
                        value={selectedTask.skipCondition.operator}
                        onChange={(e) => handleConditionChange('skipCondition', 'operator', e.target.value)}
                      >
                        <option value="equals">{t('forms.operators.equals')}</option>
                        <option value="not_equals">{t('forms.operators.not_equals')}</option>
                        <option value="contains">{t('forms.operators.contains')}</option>
                        {(() => {
                          const targetQ = availableQuestions.find(q => q.question.id === selectedTask.skipCondition?.questionId)?.question;
                          if (targetQ && targetQ.type === 'number') {
                            return (
                              <>
                                <option value="greater_than">{t('forms.operators.greater_than')}</option>
                                <option value="less_than">{t('forms.operators.less_than')}</option>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </select>
                    </div>
                    <div className="editor-field" style={{ flex: 2, marginBottom: 0 }}>
                      <label>{t('tasks.expected_value')}</label>
                      {(() => {
                        const targetQ = availableQuestions.find(q => q.question.id === selectedTask.skipCondition?.questionId)?.question;
                        if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
                          return (
                            <select
                              className="form-input"
                              value={selectedTask.skipCondition.value}
                              onChange={(e) => handleConditionChange('skipCondition', 'value', e.target.value)}
                            >
                              <option value="">{t('common.select_option')}</option>
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
                            placeholder={t('tasks.expected_value')}
                            value={selectedTask.skipCondition.value}
                            onChange={(e) => handleConditionChange('skipCondition', 'value', e.target.value)}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
