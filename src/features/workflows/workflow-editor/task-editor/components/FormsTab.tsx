import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../../store/useWorkflowStore';
import { IconClose } from '../../../../../components/ui/Icons';
import type { Task, Form } from '../../../../../types/workflow.types';

interface FormsTabProps {
  selectedTask: Task;
}

export const FormsTab = ({ selectedTask }: FormsTabProps) => {
  const { t } = useTranslation();
  const {
    workflow,
    updateTask,
    setSelectedForm,
    setCurrentView
  } = useWorkflowStore();

  const [formSearch, setFormSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [formToUnlink, setFormToUnlink] = useState<{ formId: string; formTitle: string; dependentTasks: Task[] } | null>(null);

  const prevFormRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const prevFormIdsRef = useRef<string[]>([]);
  const formsListRef = useRef<HTMLDivElement>(null);
  const lastTaskIdRef = useRef<string | null>(null);

  const forms = workflow.forms || [];

  useLayoutEffect(() => {
    if (!formsListRef.current || !selectedTask) return;

    if (lastTaskIdRef.current !== selectedTask.id) {
      prevFormRectsRef.current.clear();
      prevFormIdsRef.current = [];
      lastTaskIdRef.current = selectedTask.id;
    }

    const children = Array.from(formsListRef.current.children) as HTMLElement[];
    const prevRects = prevFormRectsRef.current;

    // Get current IDs
    const currentIds = children
      .map((child) => child.getAttribute('data-form-id'))
      .filter(Boolean) as string[];

    const prevIds = prevFormIdsRef.current;

    // Check if the order changed (same elements, different order)
    const setPrev = new Set(prevIds);
    const hasSameElements = currentIds.length === prevIds.length && currentIds.every((id) => setPrev.has(id));
    const isReordered = hasSameElements && currentIds.some((id, idx) => id !== prevIds[idx]);

    const currentRects = new Map<string, DOMRect>();

    // 1. Measure new positions ("Last")
    children.forEach((child) => {
      const formId = child.getAttribute('data-form-id');
      if (formId) {
        currentRects.set(formId, child.getBoundingClientRect());
      }
    });

    // 2. Apply FLIP only if there was an actual reordering of the same elements
    if (isReordered) {
      children.forEach((child) => {
        const formId = child.getAttribute('data-form-id');
        if (!formId) return;

        const firstRect = prevRects.get(formId);
        const lastRect = currentRects.get(formId);

        if (firstRect && lastRect) {
          const deltaY = firstRect.top - lastRect.top;
          if (deltaY !== 0) {
            // Snap back synchronously
            child.style.transform = `translateY(${deltaY}px)`;
            child.style.transition = 'none';

            // Force reflow
            child.offsetHeight;

            // Animate smoothly
            child.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)';
            child.style.transform = '';

            // Cleanup transition style
            setTimeout(() => {
              if (child) child.style.transition = '';
            }, 400);
          }
        }
      });
    }

    // 3. Save new positions
    prevFormRectsRef.current = currentRects;
    prevFormIdsRef.current = currentIds;
  });

  const usedFormIds = useMemo(() => {
    return workflow.tasks.flatMap(t => t.formIds || []);
  }, [workflow.tasks]);

  const otherTasksForms = useMemo(() => {
    const map = new Map<string, string>();
    workflow.tasks.forEach(t => {
      if (selectedTask && t.id !== selectedTask.id) {
        (t.formIds || []).forEach(fid => {
          map.set(fid, t.name);
        });
      }
    });
    return map;
  }, [workflow.tasks, selectedTask?.id]);

  const searchTerm = formSearch.toLowerCase().trim();

  // 1. Available forms (not linked to any task)
  const availableForms = useMemo(() => {
    return forms.filter(f => 
      !selectedTask?.formIds?.includes(f.id) && 
      !otherTasksForms.has(f.id) &&
      f.title.toLowerCase().includes(searchTerm)
    );
  }, [forms, selectedTask?.formIds, otherTasksForms, searchTerm]);

  // 2. Forms assigned to other tasks
  const linkedToOtherForms = useMemo(() => {
    return forms.filter(f =>
      otherTasksForms.has(f.id) &&
      f.title.toLowerCase().includes(searchTerm)
    );
  }, [forms, otherTasksForms, searchTerm]);

  // 3. Forms already linked to the current task
  const alreadyLinkedForms = useMemo(() => {
    return forms.filter(f =>
      selectedTask?.formIds?.includes(f.id) &&
      f.title.toLowerCase().includes(searchTerm)
    );
  }, [forms, selectedTask?.formIds, searchTerm]);

  // Total free available forms (without search filter, to check if all are assigned)
  const totalFreeFormsCount = useMemo(() => {
    return forms.filter(f => !usedFormIds.includes(f.id)).length;
  }, [forms, usedFormIds]);

  // Helper to validate cross-form question dependencies
  const getFormValidationError = (f: Form) => {
    const localQuestionIds = new Set(f.questions.map(fq => fq.id));
    for (const q of f.questions) {
      if (q.dependencyQuestion && !localQuestionIds.has(q.dependencyQuestion)) {
        // Find which form owns the dependency target
        let depFormId: string | undefined;
        let depForm: Form | undefined;
        for (const otherForm of forms) {
          if (otherForm.questions.some(oq => oq.id === q.dependencyQuestion)) {
            depFormId = otherForm.id;
            depForm = otherForm;
            break;
          }
        }
        
        if (!depFormId) {
          return t('tasks.validation_form_dep_not_assigned', {
            depFormTitle: 'Formulario Desconocido'
          });
        }

        // Find if this dependent form is assigned to any task
        const depTask = workflow.tasks.find(task => (task.formIds || []).includes(depFormId!));
        if (!depTask) {
          return t('tasks.validation_form_dep_not_assigned', {
            depFormTitle: depForm?.title || 'Formulario Desconocido'
          });
        }

        // If the dependent form is assigned to the SAME task
        if (depTask.id === selectedTask.id) {
          const currentFormIds = selectedTask.formIds || [];
          const thisFormIndexInSelected = currentFormIds.indexOf(f.id);
          const depFormIndexInSelected = currentFormIds.indexOf(depFormId!);

          if (depFormIndexInSelected === -1) {
            return t('tasks.validation_form_dep_same_task_not_linked', {
              depFormTitle: depForm?.title || 'Formulario Desconocido'
            });
          }

          if (thisFormIndexInSelected !== -1 && depFormIndexInSelected > thisFormIndexInSelected) {
            return t('tasks.validation_form_dep_after', {
              depFormTitle: depForm?.title || 'Formulario Desconocido',
              depTaskName: depTask.name
            });
          }
        } else {
          // If the dependent form is assigned to a DIFFERENT task
          const allTasks = workflow.tasks;
          const currentTaskIndex = allTasks.findIndex(task => task.id === selectedTask.id);
          const depTaskIndex = allTasks.findIndex(task => task.id === depTask.id);

          if (depTaskIndex > currentTaskIndex) {
            return t('tasks.validation_form_dep_after', {
              depFormTitle: depForm?.title || 'Formulario Desconocido',
              depTaskName: depTask.name
            });
          }
        }
      }
    }
    return null;
  };

  const isFormReorderDisabled = (formId: string, direction: 'up' | 'down') => {
    if (!selectedTask || !selectedTask.formIds) return true;
    const currentIds = selectedTask.formIds;
    const index = currentIds.indexOf(formId);
    if (index === -1) return true;

    if (direction === 'up' && index === 0) return true;
    if (direction === 'down' && index === currentIds.length - 1) return true;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const swappedIds = [...currentIds];
    const temp = swappedIds[index];
    swappedIds[index] = swappedIds[targetIndex];
    swappedIds[targetIndex] = temp;

    for (let i = 0; i < swappedIds.length; i++) {
      const fid = swappedIds[i];
      const formObj = forms.find(f => f.id === fid);
      if (!formObj) continue;
      
      for (const q of formObj.questions) {
        if (q.dependencyQuestion) {
          // Find which form owns the dependency target
          let depFormId: string | undefined;
          for (const searchForm of forms) {
            if (searchForm.questions.some(sq => sq.id === q.dependencyQuestion)) {
              depFormId = searchForm.id;
              break;
            }
          }
          if (depFormId && depFormId !== fid) {
            const depIndex = swappedIds.indexOf(depFormId);
            if (depIndex !== -1 && depIndex > i) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  const handleReorderForm = (formId: string, direction: 'up' | 'down') => {
    if (isFormReorderDisabled(formId, direction)) return;
    if (!selectedTask || !selectedTask.formIds) return;
    const currentIds = [...selectedTask.formIds];
    const index = currentIds.indexOf(formId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = currentIds[index];
    currentIds[index] = currentIds[targetIndex];
    currentIds[targetIndex] = temp;

    // Capture forms positions right before state update to ensure 100% stable pre-move coordinates
    if (formsListRef.current) {
      const children = Array.from(formsListRef.current.children) as HTMLElement[];
      const rects = new Map<string, DOMRect>();
      const ids: string[] = [];
      children.forEach((child) => {
        const fId = child.getAttribute('data-form-id');
        if (fId) {
          rects.set(fId, child.getBoundingClientRect());
          ids.push(fId);
        }
      });
      prevFormRectsRef.current = rects;
      prevFormIdsRef.current = ids;
    }

    updateTask(selectedTask.id, { formIds: currentIds });
  };

  const handleAddForm = (formId: string) => {
    const formToLink = forms.find(f => f.id === formId);
    if (formToLink && getFormValidationError(formToLink)) {
      return;
    }

    const currentIds = selectedTask.formIds || [];
    if (!currentIds.includes(formId)) {
      updateTask(selectedTask.id, { formIds: [...currentIds, formId] });
    }
    setFormSearch('');
    setShowFormModal(false);
  };

  const getTasksDependentOnForm = (formId: string) => {
    return (workflow.tasks || []).filter(task => 
      (task.condition && task.condition.formId === formId) || 
      (task.skipCondition && task.skipCondition.formId === formId)
    );
  };

  const unlinkFormDirectly = (formId: string) => {
    const currentIds = selectedTask.formIds || [];
    updateTask(selectedTask.id, { formIds: currentIds.filter(id => id !== formId) });
  };

  const handleRemoveForm = (formId: string) => {
    const formsList = workflow.forms || [];
    const targetForm = formsList.find(f => f.id === formId);
    const formTitle = targetForm ? targetForm.title : formId;

    const dependentTasks = getTasksDependentOnForm(formId);

    if (dependentTasks.length > 0) {
      setFormToUnlink({
        formId,
        formTitle,
        dependentTasks
      });
      return;
    }

    unlinkFormDirectly(formId);
  };

  const handleConfirmUnlinkForm = () => {
    if (!formToUnlink || !selectedTask) return;
    const { formId, dependentTasks } = formToUnlink;

    // Unlink the conditions of the dependent tasks
    dependentTasks.forEach(task => {
      const updates: Partial<Task> = {};
      if (task.condition && task.condition.formId === formId) {
        updates.condition = undefined;
      }
      if (task.skipCondition && task.skipCondition.formId === formId) {
        updates.skipCondition = undefined;
      }
      updateTask(task.id, updates);
    });

    // Unlink the form from the selected task
    unlinkFormDirectly(formId);

    // Clear modal state
    setFormToUnlink(null);
  };

  return (
    <>
      <div className="editor-section">
        <h4>{t('tasks.linked_forms')}</h4>
        {/* 📋 Associated Forms Summary */}
        <div className="associated-forms-summary">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
            <h5 style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('tasks.linked_forms_summary_title')}
            </h5>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: '600' }}>
              {(selectedTask.formIds || []).length} {t('tasks.linked_forms').toLowerCase()}
            </span>
          </div>

          {(!selectedTask.formIds || selectedTask.formIds.length === 0) ? (
            <div className="no-linked-forms-banner">
              <span style={{ fontSize: 'var(--text-lg)' }}>📋</span>
              <span>{t('tasks.no_linked_forms_yet')}</span>
            </div>
          ) : (
            <div ref={formsListRef} className="summary-cards-stack">
              {selectedTask.formIds.map((id) => {
                const form = forms.find(f => f.id === id);
                if (!form) return null;

                const questionCount = form.questions.length;
                const isUpDisabled = isFormReorderDisabled(form.id, 'up');
                const isDownDisabled = isFormReorderDisabled(form.id, 'down');

                return (
                  <div 
                    key={id} 
                    className="form-summary-card" 
                    data-form-id={form.id}
                    style={{ padding: 'var(--spacing-sm) var(--spacing-sm)', cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedForm(form.id);
                      setCurrentView('forms');
                    }}
                    title={t('tasks.click_to_edit_form')}
                  >
                    <div className="summary-card-header" style={{ marginBottom: 0, alignItems: 'center' }}>

                      <div className="summary-card-title-group" style={{ minWidth: 0, flex: 1, gap: 'var(--spacing-sm)' }}>
                        <span className="summary-card-icon" style={{ flexShrink: 0 }}>📄</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4
                              className="summary-card-title"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                marginBottom: '0px',
                                minWidth: 0,
                              }}
                          >
                            <span
                                style={{
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={form.title}
                            >
                              {form.title}
                            </span>
                            <span
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--text-muted)',
                                  fontWeight: '400',
                                  flexShrink: 0,
                                }}
                            >
                              ({questionCount} {questionCount === 1 ? t('tasks.questions_count_label') : t('tasks.questions_count_label_plural')})
                            </span>
                          </h4>
                          {form.description ? (
                              <p className="summary-card-desc" style={{ marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.description}</p>
                          ) : null}

                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        {/* Up Button */}
                        <button
                          type="button"
                          disabled={isUpDisabled}
                          onClick={() => handleReorderForm(form.id, 'up')}
                          title={t('common.up')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isUpDisabled ? 'var(--text-muted)' : 'var(--primary)',
                            opacity: isUpDisabled ? 0.25 : 0.8,
                            cursor: isUpDisabled ? 'not-allowed' : 'pointer',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-xs)',
                            borderRadius: '4px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => { if (!isUpDisabled) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          ▲
                        </button>
                        
                        {/* Down Button */}
                        <button
                          type="button"
                          disabled={isDownDisabled}
                          onClick={() => handleReorderForm(form.id, 'down')}
                          title={t('common.down')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isDownDisabled ? 'var(--text-muted)' : 'var(--primary)',
                            opacity: isDownDisabled ? 0.25 : 0.8,
                            cursor: isDownDisabled ? 'not-allowed' : 'pointer',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-xs)',
                            borderRadius: '4px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => { if (!isDownDisabled) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          ▼
                        </button>

                        {/* Separator line */}
                        <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.08)', margin: '0 2px' }}></span>

                        {/* Unlink Button */}
                        <button 
                          type="button" 
                          className="btn-unlink-form" 
                          onClick={() => handleRemoveForm(form.id)}
                          title={t('tasks.linked_forms_unlink_tooltip')}
                        >
                          <IconClose size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
          <button
            type="button"
            className="btn-premium-action"
            style={{ width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)' }}
            onClick={() => { setFormSearch(''); setShowFormModal(true); }}
          >
            📄 {t('tasks.link_forms_button')}
          </button>
        </div>
      </div>

      {showFormModal && selectedTask && (
        <div className="modal-overlay-clear" onClick={() => setShowFormModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-card-header">
              <h2>{t('tasks.link_forms_modal_title')}</h2>
              <button className="btn-close-modal" onClick={() => setShowFormModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-card-body" style={{ overflowY: 'auto', flex: 1, padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div className="editor-field" style={{ marginBottom: 0 }}>
                <label>{t('common.search')}</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder={t('tasks.search_form')}
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {forms.length === 0 ? (
                <div className="dropdown-info-card">
                  <span style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--spacing-xs)' }}>📝</span>
                  <strong>{t('tasks.no_forms_created_title')}</strong>
                  <p style={{ margin: 0, opacity: 0.8 }}>{t('tasks.no_forms_created_desc')}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', overflowY: 'auto', paddingRight: 'var(--spacing-xs)' }}>
                  
                  {/* 1. SECTION: Available Forms */}
                  <div>
                    <div className="dropdown-category-title" style={{ marginTop: 0, paddingLeft: 0, fontSize: 'var(--text-xs)' }}>
                      {t('tasks.available_forms_title')} ({availableForms.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                      {availableForms.length > 0 ? (
                        availableForms.map(f => {
                          const validationError = getFormValidationError(f);
                          const isDisabled = !!validationError;
                          return (
                            <div 
                              key={f.id} 
                              className={`form-dropdown-option available ${isDisabled ? 'disabled' : ''}`}
                              style={{ 
                                border: isDisabled ? '1px dashed rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)', 
                                padding: 'var(--spacing-sm) var(--spacing-md)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                borderRadius: '8px', 
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.65 : 1,
                                background: isDisabled ? 'rgba(239, 68, 68, 0.02)' : undefined
                              }}
                              onClick={() => { if (!isDisabled) handleAddForm(f.id); }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0, flex: 1 }}>
                                <span>{isDisabled ? '⚠️' : '📄'}</span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <span style={{ fontWeight: '600', display: 'block', fontSize: 'var(--text-sm)', color: isDisabled ? 'var(--danger)' : undefined }}>{f.title}</span>
                                  {isDisabled ? (
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: '600', display: 'block', marginTop: '2px' }}>
                                      {validationError}
                                    </span>
                                  ) : f.description ? (
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</span>
                                  ) : null}
                                </div>
                              </div>
                              <span className="option-badge available" style={{ marginLeft: 'var(--spacing-sm)', flexShrink: 0, backgroundColor: isDisabled ? 'rgba(239, 68, 68, 0.1)' : undefined, color: isDisabled ? 'var(--danger)' : undefined }}>
                                {f.questions.length} {f.questions.length === 1 ? t('tasks.questions_count_label') : t('tasks.questions_count_label_plural')}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        searchTerm !== '' ? (
                          <div style={{ padding: 'var(--spacing-sm) var(--spacing-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            🔍 {t('tasks.no_forms_matching', { searchTerm: formSearch })}
                          </div>
                        ) : (
                          totalFreeFormsCount === 0 ? (
                            <div className="dropdown-info-card warning" style={{ margin: 'var(--spacing-xs) 0', width: '100%' }}>
                              <span style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--spacing-xs)' }}>💡</span>
                              <strong style={{ color: '#d97706' }}>{t('tasks.all_forms_assigned_title')}</strong>
                              <p style={{ margin: 0, opacity: 0.85, fontSize: 'var(--text-xs)', lineHeight: '1.4' }}>
                                {t('tasks.all_forms_assigned_desc')}
                              </p>
                            </div>
                          ) : (
                            <div style={{ padding: 'var(--spacing-sm) var(--spacing-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {t('tasks.no_available_forms')}
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>

                  {/* 2. SECTION: Forms already linked to current task */}
                  {alreadyLinkedForms.length > 0 && (
                    <div>
                      <div className="dropdown-category-title" style={{ paddingLeft: 0, fontSize: 'var(--text-xs)' }}>
                        {t('tasks.linked_to_this_step')} ({alreadyLinkedForms.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        {alreadyLinkedForms.map(f => (
                          <div 
                            key={f.id} 
                            className="form-dropdown-option linked"
                            style={{ border: '1px solid rgba(59, 130, 246, 0.2)', padding: 'var(--spacing-sm) var(--spacing-md)', opacity: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px' }}
                            onClick={() => handleRemoveForm(f.id)}
                            title={t('tasks.linked_forms_unlink_tooltip')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0, flex: 1 }}>
                              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: 'var(--text-sm)', color: 'var(--primary)' }}>{f.title}</span>
                                {f.description && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</span>}
                              </div>
                            </div>
                            <span className="option-badge linked" style={{ marginLeft: 'var(--spacing-sm)', flexShrink: 0 }}>
                              {t('common.unlink')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. SECTION: Forms linked to other tasks */}
                  {linkedToOtherForms.length > 0 && (
                    <div>
                      <div className="dropdown-category-title" style={{ paddingLeft: 0, fontSize: 'var(--text-xs)' }}>
                        {t('tasks.assigned_to_other_steps')} ({linkedToOtherForms.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        {linkedToOtherForms.map(f => (
                          <div 
                            key={f.id} 
                            className="form-dropdown-option assigned-other"
                            style={{ border: '1px solid rgba(255, 255, 255, 0.05)', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px' }}
                            title={t('tasks.assigned_to_step', { stepName: otherTasksForms.get(f.id) })}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0, flex: 1 }}>
                              <span>🔒</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: 'var(--text-sm)' }}>{f.title}</span>
                                {f.description && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</span>}
                              </div>
                            </div>
                            <span className="option-badge assigned-other" style={{ marginLeft: 'var(--spacing-sm)', flexShrink: 0 }}>
                              {otherTasksForms.get(f.id)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setShowFormModal(false)}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {formToUnlink && (
        <div className="modal-overlay" onClick={() => { setFormToUnlink(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('tasks.unlink_form_title')}</h2>
              <button className="btn-close-modal" onClick={() => { setFormToUnlink(null); }}>
                ×
              </button>
            </div>

            <div className="modal-card-body">
              <p>{t('tasks.unlink_form_confirm', { name: formToUnlink.formTitle })}</p>
              {formToUnlink.dependentTasks.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <p style={{ color: 'var(--danger)', fontWeight: '600', marginBottom: 'var(--spacing-sm)', fontSize: 'var(--text-sm)' }}>
                    ⚠️ {t('tasks.unlink_form_warning_dependencies')}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 'var(--spacing-xl)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {formToUnlink.dependentTasks.map((depTask, idx) => (
                      <li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
                        <strong>{depTask.name}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => { setFormToUnlink(null); }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleConfirmUnlinkForm}
                style={{ backgroundColor: 'var(--danger)' }}
              >
                {t('common.delete') || t('common.confirm') || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
