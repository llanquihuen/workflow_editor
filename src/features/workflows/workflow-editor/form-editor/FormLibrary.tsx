import React, { useState, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { CollapsedQuestionItem } from './components/CollapsedQuestionItem';
import { QuestionAlternativesEditor } from './components/QuestionAlternativesEditor';
import type { FormQuestion, QuestionType, Form } from '../../../../types/workflow.types';
import { IconDelete } from '../../../../components/ui/Icons';

import {
  getQuestionNumberMap,
  buildQuestionTree,
  findNodeAndParentList,
  flattenQuestionTree,
  sortQuestionsHierarchically
} from '../../utils/formHierarchy';

const IconForm = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ minWidth: size }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const FormLibrary = () => {
  const { t } = useTranslation();
  const { workflow, selectedFormId, setSelectedForm, addForm, updateForm, deleteForm } = useWorkflowStore();
  const forms = workflow.forms || [];
  const selectedForm = forms.find(f => f.id === selectedFormId);
  const ownerTask = selectedForm
    ? workflow.tasks.find(task => task.formIds?.includes(selectedForm.id))
    : undefined;

  const getFormRank = React.useCallback((formId: string) => {
    for (let i = 0; i < workflow.tasks.length; i++) {
      const task = workflow.tasks[i];
      const fIndex = (task.formIds || []).indexOf(formId);
      if (fIndex !== -1) {
        return i * 1000 + fIndex;
      }
    }
    return Infinity;
  }, [workflow.tasks]);
  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());
  const [questionToDelete, setQuestionToDelete] = useState<FormQuestion | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [prevFormId, setPrevFormId] = useState<string | null>(null);
  const [questionToDeleteDeps, setQuestionToDeleteDeps] = useState<{ formTitle: string; questionLabel: string; formId: string; questionId: string }[]>([]);
  const [alternativeWarning, setAlternativeWarning] = useState<{ title: string; message: string } | null>(null);
  const [showOtherFormsForQuestions, setShowOtherFormsForQuestions] = useState<Set<string>>(new Set());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const prevIdsRef = useRef<string[]>([]);
  const questionsListRef = useRef<HTMLDivElement>(null);
  const lastFormIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!questionsListRef.current || !selectedForm) return;

    if (lastFormIdRef.current !== selectedForm.id) {
      prevRectsRef.current.clear();
      prevIdsRef.current = [];
      lastFormIdRef.current = selectedForm.id;
    }

    const children = Array.from(questionsListRef.current.children) as HTMLElement[];
    const prevRects = prevRectsRef.current;

    // Get current IDs
    const currentIds = children
      .map((child) => child.getAttribute('data-q-id'))
      .filter(Boolean) as string[];

    const prevIds = prevIdsRef.current;

    // Check if the order changed (same elements, different order)
    const setPrev = new Set(prevIds);
    const hasSameElements = currentIds.length === prevIds.length && currentIds.every((id) => setPrev.has(id));
    const isReordered = hasSameElements && currentIds.some((id, idx) => id !== prevIds[idx]);

    const currentRects = new Map<string, DOMRect>();

    // 1. Measure new positions ("Last")
    children.forEach((child) => {
      const qId = child.getAttribute('data-q-id');
      if (qId) {
        currentRects.set(qId, child.getBoundingClientRect());
      }
    });

    // 2. Apply FLIP only if there was an actual reordering of the same elements
    if (isReordered) {
      children.forEach((child) => {
        const qId = child.getAttribute('data-q-id');
        if (!qId) return;

        const firstRect = prevRects.get(qId);
        const lastRect = currentRects.get(qId);

        if (firstRect && lastRect) {
          const deltaY = firstRect.top - lastRect.top;
          if (deltaY !== 0) {
            // Snap back synchronously
            child.style.transform = `translateY(${deltaY}px)`;
            child.style.transition = 'none';

            // Force reflow
            child.offsetHeight;

            // Animate smoothly
            child.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)';
            child.style.transform = '';

            // Cleanup transition after animation completes
            setTimeout(() => {
              if (child) child.style.transition = '';
            }, 400);
          }
        }
      });
    }

    // 3. Save new positions for the next change
    prevRectsRef.current = currentRects;
    prevIdsRef.current = currentIds;
  });

  const getDependentQuestions = (targetQuestionId: string, formId: string) => {
    const list: { formTitle: string; questionLabel: string; formId: string; questionId: string }[] = [];
    forms.forEach(form => {
      form.questions.forEach(q => {
        if (q.condition && q.condition.questionId === targetQuestionId) {
          const condFormId = q.condition.formId || form.id;
          if (condFormId === formId) {
            list.push({
              formTitle: form.title,
              questionLabel: q.label,
              formId: form.id,
              questionId: q.id
            });
          }
        }
      });
    });
    return list;
  };

  // Colapsar preguntas por defecto durante el renderizado si hay más de una al cambiar de formulario o cargar la vista
  if (selectedFormId !== prevFormId) {
    setPrevFormId(selectedFormId);
    setPreviewAnswers({});
    if (selectedForm && selectedForm.questions.length > 1) {
      setCollapsedQuestions(new Set(selectedForm.questions.map(q => q.id)));
    } else {
      setCollapsedQuestions(new Set());
    }
  }

  const externalDependencies = React.useMemo(() => {
    if (!selectedForm) return [];
    const deps: { form: Form; question: FormQuestion }[] = [];
    selectedForm.questions.forEach(q => {
      const cond = q.condition;
      if (cond && cond.formId && cond.formId !== selectedForm.id) {
        const otherForm = forms.find(f => f.id === cond.formId);
        const otherQuestion = otherForm?.questions.find(pq => pq.id === cond.questionId);
        if (otherForm && otherQuestion) {
          if (!deps.some(d => d.question.id === otherQuestion.id)) {
            deps.push({ form: otherForm, question: otherQuestion });
          }
        }
      }
    });
    return deps;
  }, [selectedForm, forms]);

  const questionNumberMap = selectedForm ? getQuestionNumberMap(selectedForm.questions) : new Map<string, string>();

  const evaluateCondition = (condition?: import('../../../../types/workflow.types').FormQuestionCondition) => {
    if (!condition) return true;
    const { questionId, operator, value } = condition;
    const answer = previewAnswers[questionId];
    if (answer === undefined || answer === null || answer === '') return false;

    const answerStr = String(answer).toLowerCase();
    const valueStr = String(value).toLowerCase();

    switch (operator) {
      case 'equals': return answerStr === valueStr;
      case 'not_equals': return answerStr !== valueStr;
      case 'contains': return answerStr.includes(valueStr);
      case 'greater_than': return Number(answer) > Number(value);
      case 'less_than': return Number(answer) < Number(value);
      default: return false;
    }
  };

  const isDuplicateName = (title: string, formId?: string) => {
    return forms.some(f => f.id !== formId && f.title.toLowerCase() === title.toLowerCase().trim());
  };

  const handleCreateForm = () => {
    const baseName = t('forms.new_form_title');
    let newTitle = baseName;
    let counter = 1;
    while (isDuplicateName(newTitle)) {
      newTitle = `${baseName} ${counter}`;
      counter++;
    }

    const newForm: Form = {
      id: `q-${crypto.randomUUID()}`,
      title: newTitle,
      questions: []
    };
    addForm(newForm);
    setSelectedForm(newForm.id);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedForm) return;
    const newTitle = e.target.value;
    setEditingTitle({ ...editingTitle, [selectedForm.id]: newTitle });

    if (!isDuplicateName(newTitle, selectedForm.id) && newTitle.trim() !== '') {
      updateForm(selectedForm.id, { title: newTitle });
    }
  };

  const handleTitleBlur = () => {
    if (!selectedForm) return;
    const currentEdit = editingTitle[selectedForm.id];
    if (currentEdit !== undefined) {
      const newEditing = { ...editingTitle };
      delete newEditing[selectedForm.id];
      setEditingTitle(newEditing);
    }
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedForm) updateForm(selectedForm.id, { description: e.target.value });
  };

  const capturePositions = () => {
    if (questionsListRef.current) {
      const children = Array.from(questionsListRef.current.children) as HTMLElement[];
      const rects = new Map<string, DOMRect>();
      const ids: string[] = [];
      children.forEach((child) => {
        const qId = child.getAttribute('data-q-id');
        if (qId) {
          rects.set(qId, child.getBoundingClientRect());
          ids.push(qId);
        }
      });
      prevRectsRef.current = rects;
      prevIdsRef.current = ids;
    }
  };

  const assignDisplayNumbers = (questions: FormQuestion[]): FormQuestion[] => {
    const numberMap = getQuestionNumberMap(questions);
    return questions.map(q => ({ ...q, displayNumber: numberMap.get(q.id) }));
  };

  const handleQuestionUpdate = (questionId: string, updates: Partial<FormQuestion>) => {
    if (!selectedForm) return;
    let updatedQuestions = selectedForm.questions.map(q =>
      q.id === questionId ? { ...q, ...updates } : q
    );
    if ('condition' in updates) {
      capturePositions();
      updatedQuestions = sortQuestionsHierarchically(updatedQuestions);
    } else {
      // Re-assign display numbers even if condition hasn't changed just in case
      updatedQuestions = assignDisplayNumbers(updatedQuestions);
    }
    updateForm(selectedForm.id, { questions: updatedQuestions });
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    if (!selectedForm) return;
    const tree = buildQuestionTree(selectedForm.questions);
    const match = findNodeAndParentList(tree, questionId);
    if (!match) return;

    const { list, index } = match;
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }

    const flatQuestions = flattenQuestionTree(tree);
    capturePositions();
    updateForm(selectedForm.id, { questions: assignDisplayNumbers(flatQuestions) });
  };

  const isDuplicateQuestionLabel = (label: string, questionId: string) => {
    if (!selectedForm) return false;
    return selectedForm.questions.some(q => q.id !== questionId && q.label.toLowerCase().trim() === label.toLowerCase().trim());
  };

  const getUniqueQuestionLabel = (baseLabel: string) => {
    if (!selectedForm) return baseLabel;
    let label = baseLabel;
    let counter = 1;
    while (selectedForm.questions.some(q => q.label.toLowerCase().trim() === label.toLowerCase().trim())) {
      label = `${baseLabel} ${counter}`;
      counter++;
    }
    return label;
  };

  const handleAddQuestion = () => {
    if (!selectedForm) return;
    const newQuestion: FormQuestion = {
      id: `q-${crypto.randomUUID()}`,
      type: 'text',
      label: getUniqueQuestionLabel(t('forms.new_question')),
      required: false
    };
    const newQuestions = [...selectedForm.questions, newQuestion];
    updateForm(selectedForm.id, { questions: assignDisplayNumbers(newQuestions) });
  };

  const handleAddDisclaimer = () => {
    if (!selectedForm) return;
    const newDisclaimer: FormQuestion = {
      id: `q-${crypto.randomUUID()}`,
      type: 'disclaimer',
      label: getUniqueQuestionLabel(t('forms.new_disclaimer_title')),
      description: t('forms.new_disclaimer_text'),
      required: false
    };
    const newQuestions = [...selectedForm.questions, newDisclaimer];
    updateForm(selectedForm.id, { questions: assignDisplayNumbers(newQuestions) });
  };

  const deleteQuestionById = (questionId: string) => {
    if (!selectedForm) return;

    const deps = getDependentQuestions(questionId, selectedForm.id);

    // Group dependencies by form ID to perform a single updateForm call per form
    const formUpdates: Record<string, string[]> = {};
    deps.forEach(dep => {
      if (!formUpdates[dep.formId]) formUpdates[dep.formId] = [];
      formUpdates[dep.formId].push(dep.questionId);
    });

    // Unlink conditions in other forms
    Object.entries(formUpdates).forEach(([depFormId, depQuestionIds]) => {
      const f = forms.find(form => form.id === depFormId);
      if (f) {
        let updatedQuestions = f.questions.map(q => {
          if (depQuestionIds.includes(q.id)) {
            const { condition, ...rest } = q;
            return rest;
          }
          return q;
        });
        // We might want to assign display numbers here if this is the same logic
        updatedQuestions = assignDisplayNumbers(updatedQuestions);
        updateForm(depFormId, { questions: updatedQuestions });
      }
    });

    // Remove from current form and unlink any internal dependencies in the same form
    let updatedSelectedQuestions = selectedForm.questions
      .filter(q => q.id !== questionId)
      .map(q => {
        if (q.condition && q.condition.questionId === questionId) {
          const { condition, ...rest } = q;
          return rest;
        }
        return q;
      });

    updatedSelectedQuestions = assignDisplayNumbers(updatedSelectedQuestions);

    updateForm(selectedForm.id, {
      questions: updatedSelectedQuestions
    });
  };

  const questionHasInformation = (question: FormQuestion) => {
    const hasCustomLabel = question.label.trim() !== '' && question.label.trim() !== t('forms.new_question').trim();
    const hasOptions = (question.options || []).some(option => option.trim() !== '');

    return (
      hasCustomLabel ||
      question.type !== 'text' ||
      question.required === true ||
      question.isSensitive === true ||
      hasOptions ||
      !!question.condition
    );
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!selectedForm) return;
    const question = selectedForm.questions.find(q => q.id === questionId);
    if (!question) return;

    const deps = getDependentQuestions(questionId, selectedForm.id);

    if (deps.length > 0 || questionHasInformation(question)) {
      setQuestionToDelete(question);
      setQuestionToDeleteDeps(deps);
      return;
    }

    deleteQuestionById(questionId);
  };

  const handleConfirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    deleteQuestionById(questionToDelete.id);
    setQuestionToDelete(null);
    setQuestionToDeleteDeps([]);
  };

  const handleToggleCollapse = (questionId: string) => {
    setCollapsedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedQuestions(new Set());
  };

  const handleCollapseAll = () => {
    if (!selectedForm) return;
    setCollapsedQuestions(new Set(selectedForm.questions.map(q => q.id)));
  };

  const handleDeleteForm = (formId: string) => {
    const formToDelete = forms.find(f => f.id === formId);
    if (!formToDelete) return;

    if (formToDelete.questions.length > 0) {
      setFormToDelete(formToDelete);
      return;
    }

    deleteForm(formId);
  };

  const handleConfirmDeleteForm = () => {
    if (!formToDelete) return;
    deleteForm(formToDelete.id);
    setFormToDelete(null);
  };

  return (
    <div className="form-library-layout">
      {/* Sidebar de Formularios */}
      <div className={`library-sidebar ${isCollapsed ? 'library-sidebar-min' : ''}`}>
        <div className="sidebar-header" style={{ padding: 'var(--spacing-md) var(--spacing-sm) var(--spacing-md) var(--spacing-md)' }}>
          {!isCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontWeight: 800, fontSize: '12px', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {t('forms.title')}
                </span>
                <span style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  lineHeight: '1.2'
                }}>
                  {forms.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                <button
                  className="btn-new-form"
                  onClick={handleCreateForm}
                  title={t('forms.new_form_title')}
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  {t('forms.new_form')}
                </button>
                <button className="btn-icon" onClick={() => setIsCollapsed(true)} title={t('common.collapse')} style={{ color: '#c5c5c5', marginLeft: 'var(--spacing-xs)', alignSelf: 'center' }}>
                  ◀
                </button>
              </div>
            </>
          ) : (
            <div>
              <button className="btn-icon" onClick={() => setIsCollapsed(false)} title={t('common.expand')} style={{ color: '#c5c5c5', position: 'relative', right: '-25px', top: '-7px' }}>
                ▶
              </button>
              <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>{t('forms.title')}</h3>
            </div>
          )}
        </div>
        <div className="forms-list">
          {forms.map(f => (
            <div
              key={f.id}
              className={`form-list-item ${f.id === selectedFormId ? 'active' : ''}`}
              onClick={() => setSelectedForm(f.id)}
              title={isCollapsed ? f.title : undefined}
            >
              {isCollapsed ? (
                <div className="min-form-item" style={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                  <span className="form-avatar" style={{
                    width: '85%',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: f.id === selectedFormId ? 'var(--primary)' : 'var(--panel-border)',
                    color: f.id === selectedFormId ? 'white' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: 'var(--text-xs)',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}>
                    {f.title.substring(0, 5).toUpperCase()}{f.title.charAt(15) ? '...' : ''}
                  </span>
                </div>
              ) : (
                <>
                  <div className="form-item-icon" style={{
                    color: f.id === selectedFormId ? 'var(--primary)' : 'var(--text-muted)'
                  }}>
                    <IconForm size={18} />
                  </div>
                  <div className="form-item-content">
                    <div className="form-item-title" style={{
                      color: f.id === selectedFormId ? 'var(--primary)' : 'var(--text-main)'
                    }}>
                      {f.title}
                    </div>
                    <div className="form-item-subtitle">
                      {f.questions.length} {f.questions.length === 1 ? t('tasks.questions_count_label') : t('tasks.questions_count_label_plural')}
                    </div>
                  </div>
                  <button
                    className="btn-icon danger form-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteForm(f.id); }}
                    title={t('forms.delete_form')}
                    aria-label={t('forms.delete_form')}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IconDelete size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
          {forms.length === 0 && (
            isCollapsed ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }} title={t('forms.empty_list')}>∅</div>
            ) : (
              <p className="form-desc" style={{ padding: 'var(--spacing-md)' }}>{t('forms.empty_list')}</p>
            )
          )}
        </div>
      </div>

      {/* Área del Formulario Seleccionado */}
      <div className="library-editor-area">
        <PanelGroup orientation="horizontal">
          <Panel defaultSize={showPreview ? 60 : 100} minSize={30}>
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              {selectedForm && !showPreview && (
                <button
                  className="btn-discreet"
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 10,
                    boxShadow: '0 2px 8px var(--shadow-color)',
                    backgroundColor: 'var(--panel-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                  }}
                  onClick={() => setShowPreview(true)}
                  title={t('common.preview')}
                >
                  👁️ {t('common.preview')}
                </button>
              )}

              <div className="library-editor panel-content padded-content" style={{ height: '100%', overflowY: 'auto' }}>
                {!selectedForm ? (
                  <div className="empty-state">
                    <p>{t('forms.select_or_create')}</p>
                  </div>
                ) : (
                  <div className="editor-form">
                    <div className="editor-section config-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{t('forms.config')}</h4>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteForm(selectedForm.id)}
                          title={t('forms.delete_form')}
                        >
                          ×
                        </button>
                      </div>
                      <div className="editor-field">
                        <label>{t('forms.form_title')}</label>
                        <input
                          type="text"
                          className={`form-input ${editingTitle[selectedForm.id] !== undefined && isDuplicateName(editingTitle[selectedForm.id], selectedForm.id) ? 'error' : ''}`}
                          value={editingTitle[selectedForm.id] !== undefined ? editingTitle[selectedForm.id] : selectedForm.title}
                          onChange={handleTitleChange}
                          onBlur={handleTitleBlur}
                          style={editingTitle[selectedForm.id] !== undefined && isDuplicateName(editingTitle[selectedForm.id], selectedForm.id) ? { borderColor: '#ef4444' } : {}}
                        />
                        {editingTitle[selectedForm.id] !== undefined && isDuplicateName(editingTitle[selectedForm.id], selectedForm.id) && (
                          <span className="error-text" style={{ color: '#ef4444', fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                            {t('forms.duplicate_name_error')}
                          </span>
                        )}
                      </div>
                      <div className="editor-field">
                        <label>{t('forms.description')}</label>
                        <textarea className="form-input textarea" value={selectedForm.description || ''} onChange={handleDescChange} />
                      </div>
                      {ownerTask && (
                        <p className="form-desc" style={{ marginTop: 'var(--spacing-sm)', fontWeight:"bold" }}>
                          {t('forms.occupied_by_task', { taskName: ownerTask.name })}
                        </p>
                      )}
                    </div>

                    <div className="editor-section">
                      <div className="section-header-row" style={{ justifyContent: 'start', gap: 'var(--spacing-sm)' }}>
                        <h4>{t('forms.questions')}</h4>
                        {selectedForm.questions.length > 0 && (
                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button className="btn-discreet" onClick={handleExpandAll} title={t('common.expand_all')} style={{backgroundColor:'white'}}>
                              ⏷ {t('common.expand_all')}
                            </button>
                            <button className="btn-discreet" onClick={handleCollapseAll} title={t('common.collapse_all')} style={{backgroundColor:'white'}}>
                              ⏶ {t('common.collapse_all')}
                            </button>
                          </div>
                        )}
                      </div>

                      {selectedForm.questions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                          <p className="form-desc" style={{ marginBottom: 'var(--spacing-md)' }}>{t('forms.no_questions')}</p>
                          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                            <button
                              className="btn-add-question"
                              onClick={handleAddQuestion}
                              style={{ width: 'auto', padding: 'var(--spacing-md) var(--spacing-lg)' }}
                            >
                              <span className="add-icon">+</span>
                              {t('forms.add_question')}
                            </button>
                            <button
                              className="btn-add-disclaimer"
                              onClick={handleAddDisclaimer}
                              style={{ width: 'auto', padding: 'var(--spacing-md) var(--spacing-lg)' }}
                            >
                              <span className="add-icon">+</span>
                              {t('forms.add_disclaimer')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div ref={questionsListRef} className="questions-editor-list">
                          {selectedForm.questions.map((q, index) => {
                            const isQuestionCollapsed = collapsedQuestions.has(q.id);

                            const qTree = buildQuestionTree(selectedForm.questions);
                            const qMatch = findNodeAndParentList(qTree, q.id);
                            const isUpDisabled = qMatch ? qMatch.index === 0 : true;
                            const isDownDisabled = qMatch ? qMatch.index === qMatch.list.length - 1 : true;

                            if (isQuestionCollapsed) {
                              return (
                                <CollapsedQuestionItem
                                  key={q.id}
                                  question={q}
                                  questionNumber={questionNumberMap.get(q.id) || `${index + 1}`}
                                  requiredLabel={t('common.required')}
                                  conditionalLabel={t('common.conditional')}
                                  sensitiveLabel={t('common.sensitive_info')}
                                  onExpand={() => handleToggleCollapse(q.id)}
                                  onDelete={() => handleDeleteQuestion(q.id)}
                                  onMoveUp={() => handleMoveQuestion(q.id, 'up')}
                                  onMoveDown={() => handleMoveQuestion(q.id, 'down')}
                                  isUpDisabled={isUpDisabled}
                                  isDownDisabled={isDownDisabled}
                                  moveUpLabel={t('common.move_up') || 'Mover arriba'}
                                  moveDownLabel={t('common.move_down') || 'Mover abajo'}
                                />
                              );
                            }

                            if (q.type === 'disclaimer') {
                              return (
                                <div key={q.id} className="question-editor-card disclaimer-card" data-q-id={q.id}>
                                  <div className="card-header" style={{ alignItems: 'center' }}>
                                    <div className="question-number-chip" style={{ backgroundColor: '#0f766e', color: 'white' }}>
                                      {questionNumberMap.get(q.id) || `D${index + 1}`}
                                    </div>
                                    <button
                                      className="btn-icon btn-collapse"
                                      onClick={() => handleToggleCollapse(q.id)}
                                      style={{ marginTop: 'var(--spacing-xs)', alignSelf: 'start' }}
                                    >
                                      ▼
                                    </button>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', width: '100%', position: 'relative' }}>
                                          <textarea
                                            className={`form-input label-input ${isDuplicateQuestionLabel(q.label, q.id) ? 'error' : ''}`}
                                            value={q.label}
                                            onChange={(e) => handleQuestionUpdate(q.id, { label: e.target.value })}
                                            style={{ flex: 1, minHeight: '60px', resize: 'vertical', paddingBottom: '20px', borderColor: isDuplicateQuestionLabel(q.label, q.id) ? '#ef4444' : '' }}
                                            rows={2}
                                            maxLength={500}
                                          />
                                          <span style={{
                                            position: 'absolute',
                                            bottom: '5px',
                                            right: '10px',
                                            fontSize: '9px',
                                            color: 'var(--text-muted)'
                                          }}>
                                            {q.label.length} / 500
                                          </span>
                                        </div>
                                        {isDuplicateQuestionLabel(q.label, q.id) && (
                                          <span className="error-text" style={{ color: '#ef4444', fontSize: 'var(--text-xs)', marginTop: '2px', display: 'block' }}>
                                            {t('forms.duplicate_question_error')}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                        <span className="node-badge badge-disclaimer">DISCLAIMER</span>
                                      </div>
                                    </div>
                                    {/* Up / Down Reorder Buttons */}
                                    <button
                                      type="button"
                                      className="btn-icon"
                                      disabled={isUpDisabled}
                                      onClick={(e) => { e.stopPropagation(); handleMoveQuestion(q.id, 'up'); }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '34px',
                                        height: '34px',
                                        minWidth: '34px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--panel-border)',
                                        background: 'transparent',
                                        color: isUpDisabled ? 'var(--text-muted)' : 'var(--primary)',
                                        opacity: isUpDisabled ? 0.25 : 1,
                                        cursor: isUpDisabled ? 'not-allowed' : 'pointer',
                                        padding: 0,
                                        fontSize: 'var(--text-sm)',
                                        alignSelf: 'start',
                                        marginRight: 'var(--spacing-xs)'
                                      }}
                                      title={t('common.move_up') || 'Mover arriba'}
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon"
                                      disabled={isDownDisabled}
                                      onClick={(e) => { e.stopPropagation(); handleMoveQuestion(q.id, 'down'); }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '34px',
                                        height: '34px',
                                        minWidth: '34px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--panel-border)',
                                        background: 'transparent',
                                        color: isDownDisabled ? 'var(--text-muted)' : 'var(--primary)',
                                        opacity: isDownDisabled ? 0.25 : 1,
                                        cursor: isDownDisabled ? 'not-allowed' : 'pointer',
                                        padding: 0,
                                        fontSize: 'var(--text-sm)',
                                        alignSelf: 'start',
                                        marginRight: 'var(--spacing-xs)'
                                      }}
                                      title={t('common.move_down') || 'Mover abajo'}
                                    >
                                      ▼
                                    </button>
                                    <button
                                      className="btn-icon danger question-delete-btn"
                                      onClick={() => handleDeleteQuestion(q.id)}
                                      title={t('common.delete')}
                                      aria-label={t('common.delete')}
                                      style={{
                                        alignSelf: 'start',
                                        width: '34px',
                                        height: '34px',
                                        minWidth: '34px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '8px',
                                        fontSize: 'var(--text-md)',
                                        lineHeight: 1,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <IconDelete size={14} />
                                    </button>
                                  </div>

                                  <div className="card-body" style={{ marginTop: 'var(--spacing-md)' }}>
                                    <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', position: 'relative', width: '100%' }}>
                                      <label style={{ fontWeight: 'bold', color: 'black', marginBottom: '2px' }}>
                                        {t('forms.disclaimer_text')}
                                      </label>
                                      <textarea
                                        className="form-input textarea"
                                        value={q.description || ''}
                                        onChange={(e) => handleQuestionUpdate(q.id, { description: e.target.value })}
                                        style={{ minHeight: '100px', resize: 'vertical', paddingBottom: '20px', width: '100%' }}
                                        maxLength={1000}
                                        rows={4}
                                      />
                                      <span style={{
                                        position: 'absolute',
                                        bottom: '5px',
                                        right: '10px',
                                        fontSize: '9px',
                                        color: 'var(--text-muted)'
                                      }}>
                                        {(q.description || '').length} / 1000
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                            <div key={q.id} className={`question-editor-card ${q.condition ? 'conditional-card' : ''}`} data-q-id={q.id}>
                              <div className="card-header" style={{ alignItems: 'center' }}>
                                <div className="question-number-chip">{questionNumberMap.get(q.id) || `${index + 1}`}</div>
                                <button
                                  className="btn-icon btn-collapse"
                                  onClick={() => handleToggleCollapse(q.id)}
                                  style={{ marginTop: 'var(--spacing-xs)', alignSelf: 'start' }}
                                >
                                  ▼
                                </button>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', width: '100%', position: 'relative' }}>
                                      <textarea
                                        className={`form-input label-input ${isDuplicateQuestionLabel(q.label, q.id) ? 'error' : ''}`}
                                        value={q.label}
                                        onChange={(e) => handleQuestionUpdate(q.id, { label: e.target.value })}
                                        style={{ flex: 1, minHeight: '60px', resize: 'vertical', paddingBottom: '20px', borderColor: isDuplicateQuestionLabel(q.label, q.id) ? '#ef4444' : '' }}
                                        rows={2}
                                        maxLength={500}
                                      />
                                      <span style={{
                                        position: 'absolute',
                                        bottom: '5px',
                                        right: '10px',
                                        fontSize: '9px',
                                        color: 'var(--text-muted)'
                                      }}>
                                        {q.label.length} / 500
                                      </span>
                                    </div>
                                    {isDuplicateQuestionLabel(q.label, q.id) && (
                                      <span className="error-text" style={{ color: '#ef4444', fontSize: 'var(--text-xs)', marginTop: '2px', display: 'block' }}>
                                        {t('forms.duplicate_question_error')}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                    {q.required && <span className="node-badge badge-required">{t('common.required')}</span>}
                                    {q.condition && (() => {
                                      const cond = q.condition!;
                                      const condForm = cond.formId ? forms.find(f => f.id === cond.formId) : selectedForm;
                                      const condQuestion = condForm?.questions.find(pq => pq.id === cond.questionId);
                                      const locationText = cond.formId && condForm ? `[${condForm.title}] ` : '';
                                      return (
                                        <span className="node-badge badge-conditional-q" style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                          {t('common.conditional')}
                                          <span style={{ fontWeight: 'bold', opacity: 0.8, fontSize: 'var(--text-xs)' }}>
                                            ({t('tasks.depends_on')} {locationText}{condQuestion?.label || 'Desconocida'})
                                          </span>
                                        </span>
                                      );
                                    })()}
                                    {q.isSensitive && <span className="node-badge badge-sensitive">{t('common.sensitive_info')}</span>}
                                  </div>
                                </div>
                                {/* Up / Down Reorder Buttons */}
                                <button
                                  type="button"
                                  className="btn-icon"
                                  disabled={isUpDisabled}
                                  onClick={(e) => { e.stopPropagation(); handleMoveQuestion(q.id, 'up'); }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '34px',
                                    height: '34px',
                                    minWidth: '34px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--panel-border)',
                                    background: 'transparent',
                                    color: isUpDisabled ? 'var(--text-muted)' : 'var(--primary)',
                                    opacity: isUpDisabled ? 0.25 : 1,
                                    cursor: isUpDisabled ? 'not-allowed' : 'pointer',
                                    padding: 0,
                                    fontSize: 'var(--text-sm)',
                                    alignSelf: 'start',
                                    marginRight: 'var(--spacing-xs)'
                                  }}
                                  title={t('common.move_up') || 'Mover arriba'}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  disabled={isDownDisabled}
                                  onClick={(e) => { e.stopPropagation(); handleMoveQuestion(q.id, 'down'); }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '34px',
                                    height: '34px',
                                    minWidth: '34px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--panel-border)',
                                    background: 'transparent',
                                    color: isDownDisabled ? 'var(--text-muted)' : 'var(--primary)',
                                    opacity: isDownDisabled ? 0.25 : 1,
                                    cursor: isDownDisabled ? 'not-allowed' : 'pointer',
                                    padding: 0,
                                    fontSize: 'var(--text-sm)',
                                    alignSelf: 'start',
                                    marginRight: 'var(--spacing-xs)'
                                  }}
                                  title={t('common.move_down') || 'Mover abajo'}
                                >
                                  ▼
                                </button>
                                <button
                                  className="btn-icon danger question-delete-btn"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  title={t('common.delete')}
                                  aria-label={t('common.delete')}
                                  style={{
                                    alignSelf: 'start',
                                    width: '34px',
                                    height: '34px',
                                    minWidth: '34px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    fontSize: 'var(--text-md)',
                                    lineHeight: 1,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <IconDelete size={14} />
                                </button>
                              </div>

                              <div className="card-body">
                                <div className="field-group">
                                  <label style={{ fontWeight: 'bold', color: 'black', marginBottom: '2px' }}>{t('forms.type')}</label>
                                  <select style={{ marginRight: '25px', paddingRight: 'var(--spacing-sm)' }}
                                    className="form-input" value={q.type}
                                    onChange={(e) => handleQuestionUpdate(q.id, { type: e.target.value as QuestionType })}
                                  >
                                    <option value="text">{t('forms.types.text')}</option>
                                    <option value="textarea">{t('forms.types.textarea')}</option>
                                    <option value="number">{t('forms.types.number')}</option>
                                    <option value="dropdown">{t('forms.types.dropdown')}</option>
                                    <option value="radio">{t('forms.types.radio')}</option>
                                    <option value="checkbox">{t('forms.types.checkbox')}</option>
                                  </select>
                                </div>

                                {(index > 0 || forms.length > 1) && (
                                  <div className="field-group" style={{ display: 'block', width: '100%' }}>
                                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: 'var(--spacing-sm)', display: 'block' }}>{t('forms.visibility')}</label>
                                    <select
                                      className="form-input"
                                      style={{ marginBottom: 'var(--spacing-sm)' }}
                                      value={q.condition ? `${q.condition.formId || selectedForm.id}|${q.condition.questionId}` : ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'SHOW_OTHER_FORMS') {
                                          setShowOtherFormsForQuestions(prev => {
                                            const next = new Set(prev);
                                            next.add(q.id);
                                            return next;
                                          });
                                          return;
                                        }
                                        if (val === 'HIDE_OTHER_FORMS') {
                                          setShowOtherFormsForQuestions(prev => {
                                            const next = new Set(prev);
                                            next.delete(q.id);
                                            return next;
                                          });
                                          if (q.condition && q.condition.formId) {
                                            handleQuestionUpdate(q.id, { condition: undefined });
                                          }
                                          return;
                                        }
                                        if (!val) {
                                          handleQuestionUpdate(q.id, { condition: undefined });
                                        } else {
                                          const [formId, questionId] = val.split('|');
                                          handleQuestionUpdate(q.id, {
                                            condition: {
                                              formId: formId === selectedForm.id ? undefined : formId,
                                              questionId,
                                              operator: 'equals',
                                              value: ''
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <option value="">{t('forms.always_visible')}</option>
                                      {index > 0 && (
                                        <optgroup label={selectedForm.title}>
                                          {selectedForm.questions.slice(0, index).map(prevQ => (
                                            <option key={prevQ.id} value={`${selectedForm.id}|${prevQ.id}`}>{t('forms.show_if')}{prevQ.label}</option>
                                          ))}
                                        </optgroup>
                                      )}
                                      
                                      {(() => {
                                        const isOtherFormsVisible = showOtherFormsForQuestions.has(q.id) || (q.condition && q.condition.formId !== undefined);
                                        const otherAvailableForms = forms.filter(f => f.id !== selectedForm.id && getFormRank(f.id) < getFormRank(selectedForm.id));
                                        const hasOtherFormsWithQuestions = otherAvailableForms.some(f => f.questions.length > 0);

                                        if (!hasOtherFormsWithQuestions) return null;

                                        if (isOtherFormsVisible) {
                                          return (
                                            <>
                                              <option value="HIDE_OTHER_FORMS">◀ {t('forms.hide_other_forms_options')}</option>
                                              {otherAvailableForms.map(otherForm => {
                                                if (otherForm.questions.length === 0) return null;
                                                return (
                                                  <optgroup key={otherForm.id} label={otherForm.title}>
                                                    {otherForm.questions.map(otherQ => (
                                                      <option key={otherQ.id} value={`${otherForm.id}|${otherQ.id}`}>{t('forms.show_if')}{otherQ.label}</option>
                                                    ))}
                                                  </optgroup>
                                                );
                                              })}
                                            </>
                                          );
                                        } else {
                                          return (
                                            <option value="SHOW_OTHER_FORMS">🌐 {t('forms.show_other_forms_options')}</option>
                                          );
                                        }
                                      })()}
                                    </select>

                                    {q.condition && (
                                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                        <select
                                          className="form-input"
                                          style={{ flex: 1 }}
                                          value={q.condition.operator}
                                          onChange={(e) => handleQuestionUpdate(q.id, { condition: { ...q.condition!, operator: e.target.value as any } })}
                                        >
                                          <option value="equals">{t('forms.operators.equals')}</option>
                                          <option value="not_equals">{t('forms.operators.not_equals')}</option>
                                          <option value="contains">{t('forms.operators.contains')}</option>
                                          {(() => {
                                            const cond = q.condition!;
                                            const condForm = cond.formId ? forms.find(f => f.id === cond.formId) : selectedForm;
                                            const targetQ = condForm?.questions.find(pq => pq.id === cond.questionId);
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

                                        {(() => {
                                          const cond = q.condition!;
                                          const condForm = cond.formId ? forms.find(f => f.id === cond.formId) : selectedForm;
                                          const targetQ = condForm?.questions.find(pq => pq.id === cond.questionId);
                                          if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
                                            return (
                                              <select
                                                className="form-input"
                                                style={{ flex: 1 }}
                                                value={cond.value}
                                                onChange={(e) => handleQuestionUpdate(q.id, { condition: { ...cond, value: e.target.value } })}
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
                                              style={{ flex: 1 }}
                                              placeholder={t('forms.expected_value')}
                                              value={cond.value}
                                              onChange={(e) => handleQuestionUpdate(q.id, { condition: { ...cond, value: e.target.value } })}
                                            />
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="field-group row-align" style={{ gap: 'var(--spacing-xl)', alignItems: 'center', display: 'flex' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                  <input
                                    type="checkbox" id={`req-${q.id}`} checked={!!q.required}
                                    onChange={(e) => handleQuestionUpdate(q.id, { required: e.target.checked })}
                                  />
                                  <label htmlFor={`req-${q.id}`} style={{ marginBottom: 0 }}>{t('common.required')}</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                  <input
                                    type="checkbox" id={`sens-${q.id}`} checked={!!q.isSensitive}
                                    onChange={(e) => handleQuestionUpdate(q.id, { isSensitive: e.target.checked })}
                                  />
                                  <label htmlFor={`sens-${q.id}`} style={{ marginBottom: 0 }}>{t('common.sensitive_info')}</label>
                                </div>
                              </div>
                              {(q.type === 'dropdown' || q.type === 'radio' || q.type === 'checkbox') && (
                                <QuestionAlternativesEditor
                                  question={q}
                                  onUpdateOptions={(opts) => handleQuestionUpdate(q.id, { options: opts })}
                                  t={t}
                                  formId={selectedForm.id}
                                  forms={forms}
                                  onShowWarning={(title, message) => setAlternativeWarning({ title, message })}
                                />
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedForm.questions.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-xl)' }}>
                          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button
                              className="btn-add-question"
                              onClick={handleAddQuestion}
                              style={{ flex: 1 }}
                            >
                              <span className="add-icon">+</span>
                              {t('forms.add_question')}
                            </button>
                            <button
                              className="btn-add-disclaimer"
                              onClick={handleAddDisclaimer}
                              style={{ flex: 1 }}
                            >
                              <span className="add-icon">+</span>
                              {t('forms.add_disclaimer')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Previsualización */}
          {selectedForm && showPreview && (
            <>
              <PanelResizeHandle className="resize-handle">
                <div className="resize-handle-inner" />
              </PanelResizeHandle>
              <Panel defaultSize={40} minSize={20}>
                <div className="library-preview panel-content padded-content" style={{ height: '100%', overflowY: 'auto' }}>
                  <div className="preview-container">
                    <div className="preview-header" style={{ position: 'relative', marginBottom: 'var(--spacing-xl)' }}>
                      <h4 style={{ margin: 0, textAlign: 'center' }}>{t('common.preview')}</h4>
                      <button
                        className="btn-icon"
                        onClick={() => setShowPreview(false)}
                        title={t('common.close')}
                        style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                      >
                        ✕
                      </button>
                    </div>

                    {externalDependencies.length > 0 && (
                      <div className="preview-card" style={{ marginBottom: 'var(--spacing-lg)', border: '1px dashed var(--primary)', background: 'rgba(59, 130, 246, 0.03)', padding: 'var(--spacing-md)' }}>
                        <h5 style={{ margin: '0 0 var(--spacing-sm) 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                          {t('forms.simulation.title')}
                        </h5>
                        <p style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {t('forms.simulation.description')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                          {externalDependencies.map(({ form, question }) => (
                            <div key={question.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                              <label style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-main)' }}>
                                [{form.title}] {question.label}
                              </label>
                              {question.type === 'dropdown' || question.type === 'radio' ? (
                                <select
                                  className="form-input"
                                  style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)' }}
                                  value={previewAnswers[question.id] || ''}
                                  onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                                >
                                  <option value="">{t('forms.simulation.select_option')}</option>
                                  {(question.options || []).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={question.type === 'number' ? 'number' : 'text'}
                                  className="form-input"
                                  style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)' }}
                                  placeholder={t('forms.simulation.test_value_placeholder')}
                                  value={previewAnswers[question.id] || ''}
                                  onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="preview-card">
                      <h2>{selectedForm.title}</h2>
                      {selectedForm.description && <p className="preview-desc">{selectedForm.description}</p>}

                      <div className="preview-form">
                        {selectedForm.questions.length === 0 ? (
                          <p className="form-desc" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>{t('forms.no_questions')}</p>
                        ) : (
                          selectedForm.questions.filter(q => evaluateCondition(q.condition)).map(q => {
                            if (q.type === 'disclaimer') {
                              return (
                                <div key={q.id} className="preview-disclaimer" style={{ marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid var(--panel-border)', paddingBottom: 'var(--spacing-md)' }}>
                                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', margin: '0 0 var(--spacing-sm) 0', color: 'var(--text-main)' }}>
                                    {q.label}
                                  </h3>
                                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {q.description}
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div key={q.id} className="preview-question">
                                <label className="question-label">
                                  {`${questionNumberMap.get(q.id) || ''}.- ${q.label}`.trim()} {q.required && <span className="req">*</span>}
                                </label>

                                {q.type === 'text' && (
                                  <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('forms.types.text')}
                                    value={previewAnswers[q.id] || ''}
                                    maxLength={200}
                                    onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  />
                                )}
                                {q.type === 'textarea' && (
                                  <textarea
                                    className="form-input textarea"
                                    placeholder={t('forms.types.textarea')}
                                    value={previewAnswers[q.id] || ''}
                                    maxLength={1000}
                                    onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  />
                                )}
                                {q.type === 'number' && <input type="number" className="form-input" placeholder="0" value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />}

                                {q.type === 'dropdown' && (
                                  <select className="form-input" value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}>
                                    <option value="">{t('common.select_option')}</option>
                                    {(q.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                  </select>
                                )}

                                {q.type === 'radio' && (
                                  <div className="options-group">
                                    {(q.options || []).map((opt, i) => (
                                      <label key={i} className="option-label">
                                        <input type="radio" name={`preview-radio-${q.id}`} value={opt} checked={previewAnswers[q.id] === opt} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} /> {opt}
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {q.type === 'checkbox' && (
                                  <div className="options-group">
                                    {(q.options || []).map((opt, i) => {
                                      const checkedArray = previewAnswers[q.id] || [];
                                      return (
                                        <label key={i} className="option-label">
                                          <input type="checkbox" value={opt} checked={checkedArray.includes(opt)} onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setPreviewAnswers(prev => {
                                              const current = prev[q.id] || [];
                                              return { ...prev, [q.id]: isChecked ? [...current, opt] : current.filter((x: string) => x !== opt) };
                                            });
                                          }} /> {opt}
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {questionToDelete && (
        <div className="modal-overlay" onClick={() => { setQuestionToDelete(null); setQuestionToDeleteDeps([]); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('forms.delete_question_title')}</h2>
              <button className="btn-close-modal" onClick={() => { setQuestionToDelete(null); setQuestionToDeleteDeps([]); }}>
                ×
              </button>
            </div>

            <div className="modal-card-body">
              <p>{t('forms.delete_question_confirm', { name: questionToDelete.label || t('forms.new_question') })}</p>
              {questionToDeleteDeps.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <p style={{ color: 'var(--danger)', fontWeight: '600', marginBottom: 'var(--spacing-sm)', fontSize: 'var(--text-sm)' }}>
                    ⚠️ {t('forms.delete_question_warning_dependencies')}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 'var(--spacing-xl)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {questionToDeleteDeps.map((dep, idx) => (
                      <li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
                        <strong>{dep.questionLabel || t('forms.new_question')}</strong> (en <em>{dep.formTitle}</em>)
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
                onClick={() => { setQuestionToDelete(null); setQuestionToDeleteDeps([]); }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleConfirmDeleteQuestion}
                style={{ backgroundColor: 'var(--danger)' }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {alternativeWarning && (
        <div className="modal-overlay" onClick={() => setAlternativeWarning(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{alternativeWarning.title}</h2>
              <button className="btn-close-modal" onClick={() => setAlternativeWarning(null)}>
                ×
              </button>
            </div>

            <div className="modal-card-body">
              <p>{alternativeWarning.message}</p>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setAlternativeWarning(null)}
              >
                {t('common.confirm') || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {formToDelete && (
        <div className="modal-overlay" onClick={() => setFormToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('forms.delete_form_title')}</h2>
              <button className="btn-close-modal" onClick={() => setFormToDelete(null)}>
                ×
              </button>
            </div>

            <div className="modal-card-body">
              <p>{t('forms.delete_form_questions_confirm', { name: formToDelete.title })}</p>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setFormToDelete(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleConfirmDeleteForm}
                style={{ backgroundColor: 'var(--danger)' }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};
