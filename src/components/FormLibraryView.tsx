import { useState } from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { FormQuestion, QuestionType, Form } from '../types/workflow.types';

export const FormLibraryView = () => {
  const { workflow, selectedFormId, setSelectedForm, addForm, updateForm, deleteForm } = useWorkflowStore();
  const forms = workflow.forms || [];
  const selectedForm = forms.find(f => f.id === selectedFormId);
  const [editingOptions, setEditingOptions] = useState<Record<string, string>>({});
  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});

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
          {forms.length === 0 && <p className="form-desc" style={{padding: '15px'}}>No hay formularios creados.</p>}
        </div>
      </div>

      {/* Área del Formulario Seleccionado */}
      <div className="library-editor-area">
        <div className="library-editor panel-content padded-content">
          {!selectedForm ? (
            <div className="empty-state">
              <p>Selecciona o crea un formulario en la lista lateral para editarlo.</p>
            </div>
          ) : (
          <div className="editor-form">
            <div className="editor-section">
              <h4>Configuración del Formulario</h4>
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
                  <span className="error-text" style={{color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block'}}>
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
                  {selectedForm.questions.map(q => (
                    <div key={q.id} className="question-editor-card">
                      <div className="card-header">
                        <input 
                          type="text" className="form-input label-input" value={q.label}
                          onChange={(e) => handleQuestionUpdate(q.id, { label: e.target.value })}
                        />
                        <button className="btn-icon danger" onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
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
                        
                        <div className="field-group row-align">
                          <input 
                            type="checkbox" id={`req-${q.id}`} checked={!!q.required}
                            onChange={(e) => handleQuestionUpdate(q.id, { required: e.target.checked })}
                          />
                          <label htmlFor={`req-${q.id}`}>Requerido</label>
                        </div>
                      </div>
                      
                      {(q.type === 'dropdown' || q.type === 'radio' || q.type === 'checkbox') && (
                        <div className="options-editor">
                          <label>Opciones (separadas por comas)</label>
                          <input 
                            type="text" className="form-input" 
                            value={editingOptions[q.id] !== undefined ? editingOptions[q.id] : (q.options?.join(', ') || '')}
                            onChange={(e) => {
                              setEditingOptions({ ...editingOptions, [q.id]: e.target.value });
                              const opts = e.target.value.split(',').map(o => o.trim()).filter(o => o.length > 0);
                              handleQuestionUpdate(q.id, { options: opts });
                            }}
                            onBlur={() => {
                              const newEditing = { ...editingOptions };
                              delete newEditing[q.id];
                              setEditingOptions(newEditing);
                            }}
                          />
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

        {/* Previsualización */}
        {selectedForm && (
          <div className="library-preview panel-content padded-content">
            <div className="preview-container">
              <div className="preview-header">
                <h4>Previsualización</h4>
              </div>
              <div className="preview-card">
                <h2>{selectedForm.title}</h2>
                {selectedForm.description && <p className="preview-desc">{selectedForm.description}</p>}
                
                <div className="preview-form">
                  {selectedForm.questions.length === 0 ? (
                     <p className="form-desc" style={{textAlign: 'center', padding: '20px'}}>Añade preguntas para ver la previsualización</p>
                  ) : (
                    selectedForm.questions.map(q => (
                      <div key={q.id} className="preview-question">
                        <label className="question-label">
                          {q.label} {q.required && <span className="req">*</span>}
                        </label>
                        
                        {q.type === 'text' && <input type="text" className="form-input" placeholder="Texto corto" />}
                        {q.type === 'textarea' && <textarea className="form-input textarea" placeholder="Texto largo" />}
                        {q.type === 'number' && <input type="number" className="form-input" placeholder="0" />}
                        
                        {q.type === 'dropdown' && (
                          <select className="form-input">
                            <option value="">Selecciona una opción</option>
                            {(q.options || []).map((opt, i) => <option key={i}>{opt}</option>)}
                          </select>
                        )}
                        
                        {q.type === 'radio' && (
                          <div className="options-group">
                            {(q.options || []).map((opt, i) => (
                              <label key={i} className="option-label">
                                <input type="radio" name={`preview-radio-${q.id}`} /> {opt}
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {q.type === 'checkbox' && (
                          <div className="options-group">
                            {(q.options || []).map((opt, i) => (
                              <label key={i} className="option-label">
                                <input type="checkbox" /> {opt}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  {selectedForm.questions.length > 0 && (
                    <button className="btn-primary" style={{marginTop: '20px', width: '100%', opacity: 0.5}} disabled>Enviar Formulario</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
