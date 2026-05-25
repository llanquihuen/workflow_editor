import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { CollapsedQuestionItem } from './CollapsedQuestionItem';
import type { FormQuestion, QuestionType, Form } from '../types/workflow.types';

const getQuestionNumberMap = (questions: FormQuestion[]) => {
  const numberMap = new Map<string, string>();
  const childrenByParentId = new Map<string, FormQuestion[]>();
  const topLevelQuestions: FormQuestion[] = [];

  questions.forEach((question) => {
    const parentId = question.condition?.questionId;
    const hasValidParent = !!parentId && questions.some(q => q.id === parentId);

    if (!hasValidParent || !parentId || parentId === question.id) {
      topLevelQuestions.push(question);
      return;
    }

    const currentChildren = childrenByParentId.get(parentId) || [];
    currentChildren.push(question);
    childrenByParentId.set(parentId, currentChildren);
  });

  const assignNumbers = (currentQuestions: FormQuestion[], parentNumber?: string, chain = new Set<string>()) => {
    currentQuestions.forEach((question, index) => {
      const currentNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
      numberMap.set(question.id, currentNumber);

      if (chain.has(question.id)) return;

      const children = childrenByParentId.get(question.id) || [];
      assignNumbers(children, currentNumber, new Set([...chain, question.id]));
    });
  };

  assignNumbers(topLevelQuestions);

  questions.forEach((question) => {
    if (!numberMap.has(question.id)) {
      numberMap.set(question.id, `${numberMap.size + 1}`);
    }
  });

  return numberMap;
};

interface QuestionAlternativesEditorProps {
  question: FormQuestion;
  onUpdateOptions: (options: string[]) => void;
  t: (key: string) => string;
}

const QuestionAlternativesEditor = ({ question, onUpdateOptions, t }: QuestionAlternativesEditorProps) => {
  const currentOptions = question.options || [];
  const optionsJoined = currentOptions.join('\n');
  const [prevOptionsText, setPrevOptionsText] = useState(optionsJoined);
  const [localText, setLocalText] = useState(optionsJoined);
  const [isFocused, setIsFocused] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync state with props during render using primitive string comparison to avoid infinite loops and set-state-in-effect warnings
  if (optionsJoined !== prevOptionsText) {
    setPrevOptionsText(optionsJoined);
    if (!isFocused) {
      setLocalText(optionsJoined);
    }
  }

  const lines = localText.split('\n');
  const nonBlankLines = lines.map(l => l.trim()).filter(l => l !== '');

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  nonBlankLines.forEach(line => {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) {
      duplicates.add(line);
    } else {
      seen.add(normalized);
    }
  });

  const duplicateCount = duplicates.size;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);

    const newOpts = val
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    const optionsChanged = 
      newOpts.length !== currentOptions.length ||
      newOpts.some((opt, idx) => opt !== currentOptions[idx]);

    if (optionsChanged) {
      onUpdateOptions(newOpts);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleanedText = nonBlankLines.join('\n');
    setLocalText(cleanedText);
    onUpdateOptions(nonBlankLines);
  };

  const handleSort = () => {
    const sorted = [...nonBlankLines].sort((a, b) => 
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
    const uniqueSorted = Array.from(new Set(sorted));
    setLocalText(uniqueSorted.join('\n'));
    onUpdateOptions(uniqueSorted);
  };

  const handleClear = () => {
    setLocalText('');
    onUpdateOptions([]);
  };

  const handleFixDuplicates = () => {
    const uniqueOpts = Array.from(new Set(nonBlankLines));
    setLocalText(uniqueOpts.join('\n'));
    onUpdateOptions(uniqueOpts);
  };

  const handleApplyAndClose = () => {
    setIsEditing(false);
    const cleanedText = nonBlankLines.join('\n');
    setLocalText(cleanedText);
    onUpdateOptions(nonBlankLines);
  };

  if (!isEditing) {
    return (
      <div className="options-editor" style={{ animation: 'fadeIn 0.25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ margin: 0, fontWeight: 'bold' }}>{t('forms.field_options')}</label>
          <span className={`alt-editor-badge ${currentOptions.length > 0 ? 'success' : ''}`}>
            {currentOptions.length} {t('forms.alternatives_count')}
          </span>
        </div>

        {/* Beautiful list of read-only/consolidated capsules */}
        <div 
          className="consolidated-options-container"
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px', 
            marginBottom: '12px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            padding: '10px 12px',
            minHeight: '48px',
            alignItems: 'center'
          }}
        >
          {currentOptions.map((opt, optIndex) => (
            <div
              key={optIndex}
              className="multiselect-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--panel-border)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: 'var(--text-main)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.85rem',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              <span>{opt}</span>
              <span
                className="pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  const newOpts = currentOptions.filter((_, i) => i !== optIndex);
                  onUpdateOptions(newOpts);
                }}
                style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-muted)' }}
                title={t('forms.remove_option')}
              >
                ×
              </span>
            </div>
          ))}
          {currentOptions.length === 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('forms.no_options')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsEditing(true)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 14px', 
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
          >
            ✏️ {t('forms.edit_options')}
          </button>
          
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSort}
            disabled={currentOptions.length <= 1}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '6px 12px', 
              fontSize: '0.85rem'
            }}
          >
            🔤 {t('forms.sort_alphabetically')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="options-editor" style={{ animation: 'fadeIn 0.25s ease' }}>
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
        {t('forms.field_options')}
      </label>

      <div className="alt-editor-container">
        <div className="alt-editor-header">
          <div className="alt-editor-left">
            <span className={`alt-editor-badge ${currentOptions.length > 0 ? 'success' : ''}`}>
              {currentOptions.length} {t('forms.alternatives_count')}
            </span>
            {duplicateCount > 0 && (
              <span 
                className="alt-editor-warning" 
                onClick={handleFixDuplicates}
                title={t('forms.fix_duplicates')}
              >
                ⚠️ {duplicateCount} {t('forms.duplicates_detected')} ({t('forms.fix_duplicates')})
              </span>
            )}
          </div>
          
          <div className="alt-editor-actions">
            <button 
              type="button" 
              className="alt-editor-btn primary"
              onClick={handleSort}
              disabled={currentOptions.length <= 1}
              title={t('forms.sort_alphabetically')}
            >
              🔤 {t('forms.sort_alphabetically')}
            </button>
            <button 
              type="button" 
              className="alt-editor-btn danger"
              onClick={handleClear}
              disabled={currentOptions.length === 0}
              title={t('forms.clear_all')}
            >
              🧹 {t('forms.clear_all')}
            </button>
          </div>
        </div>

        <textarea
          className="alt-editor-textarea"
          placeholder={t('forms.bulk_add_placeholder')}
          value={localText}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          autoFocus
        />
        
        <div className="alt-editor-footer" style={{ borderBottom: '1px dashed var(--panel-border)', borderTop: 'none', paddingBottom: '8px' }}>
          <span>💡 {t('forms.bulk_add_help')}</span>
          {isFocused && (
            <span style={{ color: 'var(--success)', animation: 'fadeIn 0.2s', display: 'flex', alignItems: 'center', gap: '3px' }}>
              ⚡ Guardado automático
            </span>
          )}
        </div>

        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApplyAndClose}
            style={{ 
              padding: '6px 16px', 
              fontSize: '0.85rem', 
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--success)',
              borderColor: 'var(--success)'
            }}
          >
            ✓ {t('forms.apply_changes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FormLibraryView = () => {
  const { t } = useTranslation();
  const { workflow, selectedFormId, setSelectedForm, addForm, updateForm, deleteForm } = useWorkflowStore();
  const forms = workflow.forms || [];
  const selectedForm = forms.find(f => f.id === selectedFormId);
  const ownerTask = selectedForm
    ? workflow.tasks.find(task => task.formIds?.includes(selectedForm.id))
    : undefined;
  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());
  const [questionToDelete, setQuestionToDelete] = useState<FormQuestion | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [prevFormId, setPrevFormId] = useState<string | null>(null);

  // Colapsar preguntas por defecto durante el renderizado si hay más de una al cambiar de formulario o cargar la vista
  if (selectedFormId !== prevFormId) {
    setPrevFormId(selectedFormId);
    if (selectedForm && selectedForm.questions.length > 1) {
      setCollapsedQuestions(new Set(selectedForm.questions.map(q => q.id)));
    } else {
      setCollapsedQuestions(new Set());
    }
  }

  const questionNumberMap = selectedForm ? getQuestionNumberMap(selectedForm.questions) : new Map<string, string>();

  const evaluateCondition = (condition?: import('../types/workflow.types').FormQuestionCondition) => {
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

  const handleQuestionUpdate = (questionId: string, updates: Partial<FormQuestion>) => {
    if (!selectedForm) return;
    const updatedQuestions = selectedForm.questions.map(q =>
      q.id === questionId ? { ...q, ...updates } : q
    );
    updateForm(selectedForm.id, { questions: updatedQuestions });
  };

  const handleAddQuestion = () => {
    if (!selectedForm) return;
    const newQuestion: FormQuestion = {
      id: `q-${crypto.randomUUID()}`,
      type: 'text',
      label: t('forms.new_question'),
      required: false
    };
    updateForm(selectedForm.id, { questions: [...selectedForm.questions, newQuestion] });
  };

  const deleteQuestionById = (questionId: string) => {
    if (!selectedForm) return;
    updateForm(selectedForm.id, {
      questions: selectedForm.questions.filter(q => q.id !== questionId)
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

    if (questionHasInformation(question)) {
      setQuestionToDelete(question);
      return;
    }

    deleteQuestionById(questionId);
  };

  const handleConfirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    deleteQuestionById(questionToDelete.id);
    setQuestionToDelete(null);
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
        <div className="sidebar-header">
          {!isCollapsed ? (
            <>
              <h3>{t('forms.title')} ({forms.length})</h3>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button className="btn-premium-action" onClick={handleCreateForm} title={t('forms.new_form_title')}>
                  {t('forms.new_form')}
                </button>
                <button className="btn-icon" onClick={() => setIsCollapsed(true)} title={t('common.collapse')} style={{ color: 'var(--text-muted)' }}>
                  ◀
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
              <button className="btn-icon" onClick={() => setIsCollapsed(false)} title={t('common.expand')} style={{ color: 'var(--text-muted)' }}>
                ▶
              </button>
              <button className="btn-premium-action" onClick={handleCreateForm} title={t('forms.new_form_title')} style={{ width: '100%', height: '32px', padding: 0, fontSize: '0.75rem' }}>
                {t('forms.new_form')}
              </button>
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
                    fontSize: '0.65rem',
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
                  <span>{f.title}</span>
                  <button
                    className="btn-icon danger form-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteForm(f.id); }}
                    title={t('forms.delete_form')}
                    aria-label={t('forms.delete_form')}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
          {forms.length === 0 && (
            isCollapsed ? (
              <div style={{ textAlign: 'center', padding: '15px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }} title={t('forms.empty_list')}>∅</div>
            ) : (
              <p className="form-desc" style={{ padding: '15px' }}>{t('forms.empty_list')}</p>
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
                    gap: '4px',
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{t('forms.config')}</h4>
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
                          <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {t('forms.duplicate_name_error')}
                          </span>
                        )}
                      </div>
                      <div className="editor-field">
                        <label>{t('forms.description')}</label>
                        <textarea className="form-input textarea" value={selectedForm.description || ''} onChange={handleDescChange} />
                      </div>
                      {ownerTask && (
                        <p className="form-desc" style={{ marginTop: '10px', fontWeight:"bold" }}>
                          {t('forms.occupied_by_task', { taskName: ownerTask.name })}
                        </p>
                      )}
                    </div>

                    <div className="editor-section">
                      <div className="section-header-row" style={{ justifyContent: 'start', gap: '10px' }}>
                        <h4>{t('forms.questions')}</h4>
                        {selectedForm.questions.length > 0 && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-discreet" onClick={handleExpandAll} title={t('common.expand_all')}>
                              ⏷ {t('common.expand_all')}
                            </button>
                            <button className="btn-discreet" onClick={handleCollapseAll} title={t('common.collapse_all')}>
                              ⏶ {t('common.collapse_all')}
                            </button>
                          </div>
                        )}
                      </div>

                      {selectedForm.questions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <p className="form-desc" style={{ marginBottom: '15px' }}>{t('forms.no_questions')}</p>
                          <button
                            className="btn-add-question"
                            onClick={handleAddQuestion}
                          >
                            <span className="add-icon">+</span>
                            {t('forms.add_question')}
                          </button>
                        </div>
                      ) : (
                        <div className="questions-editor-list">
                          {selectedForm.questions.map((q, index) => {
                            const isQuestionCollapsed = collapsedQuestions.has(q.id);

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
                                />
                              );
                            }

                            return (
                            <div key={q.id} className="question-editor-card">
                              <div className="card-header" style={{ alignItems: 'center' }}>
                                <div className="question-number-chip">{questionNumberMap.get(q.id) || `${index + 1}`}</div>
                                <button
                                  className="btn-icon btn-collapse"
                                  onClick={() => handleToggleCollapse(q.id)}
                                  style={{ marginTop: '6px', alignSelf: 'start' }}
                                >
                                  ▼
                                </button>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <input
                                      type="text" 
                                      className="form-input label-input"
                                      value={q.label}
                                      onChange={(e) => handleQuestionUpdate(q.id, { label: e.target.value })}
                                      style={{ flex: 1 }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {q.required && <span className="node-badge badge-required">{t('common.required')}</span>}
                                    {q.condition && (
                                      <span className="node-badge badge-conditional-q" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {t('common.conditional')}
                                        <span style={{ fontWeight: 'bold', opacity: 0.8, fontSize: '0.63rem' }}>
                                          ({t('tasks.depends_on')} {selectedForm.questions.find(pq => pq.id === q.condition!.questionId)?.label || 'Desconocida'})
                                        </span>
                                      </span>
                                    )}
                                    {q.isSensitive && <span className="node-badge badge-sensitive">{t('common.sensitive_info')}</span>}
                                  </div>
                                </div>
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
                                    fontSize: '1rem',
                                    lineHeight: 1,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>

                              <div className="card-body">
                                <div className="field-group">
                                  <label style={{ fontWeight: 'bold', color: 'black', marginBottom: '2px' }}>{t('forms.type')}</label>
                                  <select style={{ marginRight: '25px', paddingRight: '10px' }}
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



                                {index > 0 && (
                                  <div className="field-group" style={{ display: 'block', width: '100%' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>{t('forms.visibility')}</label>
                                    <select
                                      className="form-input"
                                      style={{ marginBottom: '8px' }}
                                      value={q.condition ? q.condition.questionId : ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) {
                                          handleQuestionUpdate(q.id, { condition: undefined });
                                        } else {
                                          handleQuestionUpdate(q.id, {
                                            condition: { questionId: val, operator: 'equals', value: '' }
                                          });
                                        }
                                      }}
                                    >
                                      <option value="">{t('forms.always_visible')}</option>
                                      {selectedForm.questions.slice(0, index).map(prevQ => (
                                        <option key={prevQ.id} value={prevQ.id}>{t('forms.show_if')}{prevQ.label}</option>
                                      ))}
                                    </select>

                                    {q.condition && (
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                            const targetQ = selectedForm.questions.find(pq => pq.id === q.condition?.questionId);
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
                                          const targetQ = selectedForm.questions.find(pq => pq.id === q.condition?.questionId);
                                          if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
                                            return (
                                              <select
                                                className="form-input"
                                                style={{ flex: 1 }}
                                                value={q.condition.value}
                                                onChange={(e) => handleQuestionUpdate(q.id, { condition: { ...q.condition!, value: e.target.value } })}
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
                                              value={q.condition.value}
                                              onChange={(e) => handleQuestionUpdate(q.id, { condition: { ...q.condition!, value: e.target.value } })}
                                            />
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="field-group row-align" style={{ gap: '20px', alignItems: 'center', display: 'flex' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox" id={`req-${q.id}`} checked={!!q.required}
                                    onChange={(e) => handleQuestionUpdate(q.id, { required: e.target.checked })}
                                  />
                                  <label htmlFor={`req-${q.id}`} style={{ marginBottom: 0 }}>{t('common.required')}</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                />
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedForm.questions.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                          <button
                            className="btn-add-question"
                            onClick={handleAddQuestion}
                          >
                            <span className="add-icon">+</span>
                            {t('forms.add_question')}
                          </button>
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
                    <div className="preview-header" style={{ position: 'relative', marginBottom: '20px' }}>
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
                    <div className="preview-card">
                      <h2>{selectedForm.title}</h2>
                      {selectedForm.description && <p className="preview-desc">{selectedForm.description}</p>}

                      <div className="preview-form">
                        {selectedForm.questions.length === 0 ? (
                          <p className="form-desc" style={{ textAlign: 'center', padding: '20px' }}>{t('forms.no_questions')}</p>
                        ) : (
                          selectedForm.questions.filter(q => evaluateCondition(q.condition)).map(q => (
                            <div key={q.id} className="preview-question">
                              <label className="question-label">

                                {`${questionNumberMap.get(q.id) || ''}.- ${q.label}`.trim()} {q.required && <span className="req">*</span>}
                              </label>

                              {q.type === 'text' && <input type="text" className="form-input" placeholder={t('forms.types.text')} value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />}
                              {q.type === 'textarea' && <textarea className="form-input textarea" placeholder={t('forms.types.textarea')} value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />}
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
                          ))
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
        <div className="modal-overlay" onClick={() => setQuestionToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('forms.delete_question_title')}</h2>
              <button className="btn-close-modal" onClick={() => setQuestionToDelete(null)}>
                ×
              </button>
            </div>

            <div className="modal-card-body">
              <p>{t('forms.delete_question_confirm', { name: questionToDelete.label || t('forms.new_question') })}</p>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setQuestionToDelete(null)}
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
