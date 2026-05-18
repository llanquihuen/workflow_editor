import { useState } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { FormQuestion, QuestionType, Form } from '../types/workflow.types';

export const FormLibraryView = () => {
  const { workflow, selectedFormId, setSelectedForm, addForm, updateForm, deleteForm } = useWorkflowStore();
  const forms = workflow.forms || [];
  const selectedForm = forms.find(f => f.id === selectedFormId);
  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(true);

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
    let baseName = 'Nuevo Formulario';
    let newTitle = baseName;
    let counter = 1;
    while (isDuplicateName(newTitle)) {
      newTitle = `${baseName} ${counter}`;
      counter++;
    }

    const newForm: Form = {
      id: `form-${Date.now()}`,
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
      id: `q-${Date.now()}`,
      type: 'text',
      label: 'Nueva Pregunta',
      required: false
    };
    updateForm(selectedForm.id, { questions: [...selectedForm.questions, newQuestion] });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!selectedForm) return;
    updateForm(selectedForm.id, {
      questions: selectedForm.questions.filter(q => q.id !== questionId)
    });
  };

  return (
    <div className="form-library-layout">
      {/* Sidebar de Formularios */}
      <div className="library-sidebar">
        <div className="sidebar-header">
          <h3>Formularios ({forms.length})</h3>
          <button className="btn-small" onClick={handleCreateForm}>+ Nuevo</button>
        </div>
        <div className="forms-list">
          {forms.map(f => (
            <div
              key={f.id}
              className={`form-list-item ${f.id === selectedFormId ? 'active' : ''}`}
              onClick={() => setSelectedForm(f.id)}
            >
              <span>{f.title}</span>
              <button
                className="btn-icon danger remove-form"
                onClick={(e) => { e.stopPropagation(); deleteForm(f.id); }}
              >
                ×
              </button>
            </div>
          ))}
          {forms.length === 0 && <p className="form-desc" style={{ padding: '15px' }}>No hay formularios creados.</p>}
        </div>
      </div>

      {/* Área del Formulario Seleccionado */}
      <div className="library-editor-area">
        <PanelGroup orientation="horizontal">
          <Panel defaultSize={showPreview ? 60 : 100} minSize={30}>
            <div className="library-editor panel-content padded-content" style={{ height: '100%', overflowY: 'auto' }}>
              {!selectedForm ? (
                <div className="empty-state">
                  <p>Selecciona o crea un formulario en la lista lateral para editarlo.</p>
                </div>
              ) : (
                <div className="editor-form">
                  <div className="editor-section config-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Configuración del Formulario</h4>
                      <button className={showPreview ? "btn-secondary" : "btn-primary"} style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setShowPreview(!showPreview)}>
                        {showPreview ? 'Ocultar Previsualización' : 'Mostrar Previsualización'}
                      </button>
                    </div>
                    <div className="editor-field">
                      <label>Título del Formulario</label>
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
                          Este nombre de formulario ya existe.
                        </span>
                      )}
                    </div>
                    <div className="editor-field">
                      <label>Descripción (opcional)</label>
                      <textarea className="form-input textarea" value={selectedForm.description || ''} onChange={handleDescChange} />
                    </div>
                  </div>

                  <div className="editor-section">
                    <div className="section-header-row">
                      <h4>Preguntas</h4>
                      <button className="btn-small" onClick={handleAddQuestion}>+ Añadir Pregunta</button>
                    </div>

                    {selectedForm.questions.length === 0 ? (
                      <p className="form-desc">Este formulario no tiene preguntas.</p>
                    ) : (
                      <div className="questions-editor-list">
                        {selectedForm.questions.map((q, index) => (
                          <div key={q.id} className="question-editor-card">
                            <div className="card-header" style={{ alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                  type="text" className="form-input label-input" value={q.label}
                                  onChange={(e) => handleQuestionUpdate(q.id, { label: e.target.value })}
                                />
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {q.required && <span className="node-badge badge-required">Obligatorio</span>}
                                  {q.condition && (
                                    <span className="node-badge badge-conditional-q" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      Condicional
                                      <span style={{ fontWeight: 'bold', opacity: 0.8, fontSize: '0.63rem' }}>
                                        (Depende de: {selectedForm.questions.find(pq => pq.id === q.condition!.questionId)?.label || 'Desconocida'})
                                      </span>
                                    </span>
                                  )}
                                  {q.isSensitive && <span className="node-badge badge-sensitive">Info Sensible</span>}
                                </div>
                              </div>
                              <button className="btn-icon danger" onClick={() => handleDeleteQuestion(q.id)} style={{ marginTop: '2px' }}>🗑</button>
                            </div>

                            <div className="card-body">
                              <div className="field-group">
                                <label>Tipo:</label>
                                <select
                                  className="form-input" value={q.type}
                                  onChange={(e) => handleQuestionUpdate(q.id, { type: e.target.value as QuestionType })}
                                >
                                  <option value="text">Texto corto</option>
                                  <option value="textarea">Texto largo</option>
                                  <option value="number">Número</option>
                                  <option value="dropdown">Desplegable</option>
                                  <option value="radio">Radio buttons</option>
                                  <option value="checkbox">Checkbox</option>
                                </select>
                              </div>

                              <div className="field-group row-align" style={{ gap: '20px', alignItems: 'center', display: 'flex' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox" id={`req-${q.id}`} checked={!!q.required}
                                    onChange={(e) => handleQuestionUpdate(q.id, { required: e.target.checked })}
                                  />
                                  <label htmlFor={`req-${q.id}`} style={{ marginBottom: 0 }}>Requerido</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox" id={`sens-${q.id}`} checked={!!q.isSensitive}
                                    onChange={(e) => handleQuestionUpdate(q.id, { isSensitive: e.target.checked })}
                                  />
                                  <label htmlFor={`sens-${q.id}`} style={{ marginBottom: 0 }}>Info Sensible</label>
                                </div>
                              </div>

                              {index > 0 && (
                                <div className="field-group" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--panel-border)', display: 'block' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Visibilidad Condicional</label>
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
                                    <option value="">-- Siempre visible --</option>
                                    {selectedForm.questions.slice(0, index).map(prevQ => (
                                      <option key={prevQ.id} value={prevQ.id}>Mostrar si responde a: {prevQ.label}</option>
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
                                        <option value="equals">Es igual a</option>
                                        <option value="not_equals">No es igual a</option>
                                        <option value="contains">Contiene</option>
                                        {(() => {
                                          const targetQ = selectedForm.questions.find(pq => pq.id === q.condition?.questionId);
                                          if (targetQ && targetQ.type === 'number') {
                                            return (
                                              <>
                                                <option value="greater_than">Mayor que (&gt;)</option>
                                                <option value="less_than">Menor que (&lt;)</option>
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
                                              <option value="">-- Valor esperado --</option>
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
                                            placeholder="Valor esperado..."
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

                            {(q.type === 'dropdown' || q.type === 'radio' || q.type === 'checkbox') && (
                              <div className="options-editor">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Opciones del Campo</label>
                                
                                {/* Lista de tags/píldoras existentes */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                  {(q.options || []).map((opt, optIndex) => (
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
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      <span>{opt}</span>
                                      <span 
                                        className="pill-remove" 
                                        onClick={() => {
                                          const newOpts = (q.options || []).filter((_, i) => i !== optIndex);
                                          handleQuestionUpdate(q.id, { options: newOpts });
                                        }}
                                        style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-muted)' }}
                                        title="Eliminar opción"
                                      >
                                        ×
                                      </span>
                                    </div>
                                  ))}
                                  {(q.options || []).length === 0 && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                      No hay opciones definidas. Añade una abajo.
                                    </span>
                                  )}
                                </div>

                                {/* Campo para añadir una nueva opción */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Escribe una opción y presiona Enter..."
                                    id={`new-opt-input-${q.id}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const target = e.currentTarget;
                                        const val = target.value.trim();
                                        if (val) {
                                          const currentOpts = q.options || [];
                                          if (!currentOpts.includes(val)) {
                                            handleQuestionUpdate(q.id, { options: [...currentOpts, val] });
                                          }
                                          target.value = '';
                                        }
                                      }
                                    }}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                      const inputEl = document.getElementById(`new-opt-input-${q.id}`) as HTMLInputElement;
                                      const val = inputEl ? inputEl.value.trim() : '';
                                      if (val) {
                                        const currentOpts = q.options || [];
                                        if (!currentOpts.includes(val)) {
                                          handleQuestionUpdate(q.id, { options: [...currentOpts, val] });
                                        }
                                        inputEl.value = '';
                                      }
                                    }}
                                    style={{ padding: '0 15px', height: '38px', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}
                                  >
                                    Añadir
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                      <h4 style={{ margin: 0, textAlign: 'center' }}>Previsualización</h4>
                      <button
                        className="btn-icon"
                        onClick={() => setShowPreview(false)}
                        title="Cerrar Previsualización"
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
                          <p className="form-desc" style={{ textAlign: 'center', padding: '20px' }}>Añade preguntas para ver la previsualización</p>
                        ) : (
                          selectedForm.questions.filter(q => evaluateCondition(q.condition)).map(q => (
                            <div key={q.id} className="preview-question">
                              <label className="question-label">
                                {q.label} {q.required && <span className="req">*</span>}
                              </label>

                              {q.type === 'text' && <input type="text" className="form-input" placeholder="Texto corto" value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />}
                              {q.type === 'textarea' && <textarea className="form-input textarea" placeholder="Texto largo" value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />}
                              {q.type === 'number' && <input type="number" className="form-input" placeholder="0" value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />}

                              {q.type === 'dropdown' && (
                                <select className="form-input" value={previewAnswers[q.id] || ''} onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}>
                                  <option value="">Selecciona una opción</option>
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

                        {selectedForm.questions.length > 0 && (
                          <button className="btn-primary" style={{ marginTop: '20px', width: '100%', opacity: 0.5 }} disabled>Enviar Formulario</button>
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
    </div>
  );
};
