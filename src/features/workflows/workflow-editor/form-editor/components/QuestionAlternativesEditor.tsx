import React, { useState } from 'react';
import type { FormQuestion, Form } from '../../../../../types/workflow.types';

export interface QuestionAlternativesEditorProps {
  question: FormQuestion;
  onUpdateOptions: (options: string[]) => void;
  t: (key: string, options?: any) => string;
  formId: string;
  forms: Form[];
  onShowWarning: (title: string, message: string) => void;
}

export const QuestionAlternativesEditor = ({
  question,
  onUpdateOptions,
  t,
  formId,
  forms,
  onShowWarning
}: QuestionAlternativesEditorProps) => {
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

  const getLinkedOptionsForQuestion = (qId: string, fId: string) => {
    const linked: string[] = [];
    forms.forEach(form => {
      form.questions.forEach(q => {
        if (q.condition && q.condition.questionId === qId && (q.condition.formId || form.id) === fId) {
          if (!linked.includes(q.condition.value)) {
            linked.push(q.condition.value);
          }
        }
      });
    });
    return linked;
  };

  const validateNewOptions = (newOpts: string[]) => {
    const linkedOpts = getLinkedOptionsForQuestion(question.id, formId);
    const missing = linkedOpts.filter(opt => !newOpts.includes(opt));
    if (missing.length > 0) {
      onShowWarning(
        t('forms.cannot_modify_linked_options_title'),
        t('forms.cannot_modify_linked_options_desc', { name: missing.join(', ') })
      );
      return false;
    }
    return true;
  };

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
      const linkedOpts = getLinkedOptionsForQuestion(question.id, formId);
      const missing = linkedOpts.filter(opt => !newOpts.includes(opt));
      if (missing.length === 0) {
        onUpdateOptions(newOpts);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleanedText = nonBlankLines.join('\n');
    if (!validateNewOptions(nonBlankLines)) {
      setLocalText(currentOptions.join('\n'));
      return;
    }
    setLocalText(cleanedText);
    onUpdateOptions(nonBlankLines);
  };

  const handleSort = () => {
    const sorted = [...nonBlankLines].sort((a, b) => 
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
    const uniqueSorted = Array.from(new Set(sorted));
    if (!validateNewOptions(uniqueSorted)) {
      return;
    }
    setLocalText(uniqueSorted.join('\n'));
    onUpdateOptions(uniqueSorted);
  };

  const handleClear = () => {
    if (!validateNewOptions([])) {
      return;
    }
    setLocalText('');
    onUpdateOptions([]);
  };

  const handleFixDuplicates = () => {
    const uniqueOpts = Array.from(new Set(nonBlankLines));
    if (!validateNewOptions(uniqueOpts)) {
      return;
    }
    setLocalText(uniqueOpts.join('\n'));
    onUpdateOptions(uniqueOpts);
  };

  const handleApplyAndClose = () => {
    if (!validateNewOptions(nonBlankLines)) {
      setLocalText(currentOptions.join('\n'));
      return;
    }
    setIsEditing(false);
    const cleanedText = nonBlankLines.join('\n');
    setLocalText(cleanedText);
    onUpdateOptions(nonBlankLines);
  };

  if (!isEditing) {
    return (
      <div className="options-editor" style={{ animation: 'fadeIn 0.25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
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
            gap: 'var(--spacing-xs)', 
            marginBottom: 'var(--spacing-md)',
            background: 'var(--bg-dark)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            padding: 'var(--spacing-sm) var(--spacing-md)',
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
                gap: 'var(--spacing-xs)',
                backgroundColor: 'var(--panel-border)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: 'var(--text-main)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                borderRadius: '16px',
                fontSize: 'var(--text-sm)',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              <span>{opt}</span>
              <span
                className="pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  const isLinked = forms.some(form => 
                    form.questions.some(q => 
                      q.condition && 
                      q.condition.questionId === question.id && 
                      q.condition.value === opt &&
                      (q.condition.formId || form.id) === formId
                    )
                  );
                  if (isLinked) {
                    onShowWarning(
                      t('forms.cannot_delete_linked_option_title'),
                      t('forms.cannot_delete_linked_option_desc', { name: opt })
                    );
                    return;
                  }
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
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('forms.no_options')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsEditing(true)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-xs)', 
              padding: 'var(--spacing-xs) var(--spacing-md)', 
              fontSize: 'var(--text-sm)',
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
              gap: 'var(--spacing-xs)', 
              padding: 'var(--spacing-xs) var(--spacing-md)', 
              fontSize: 'var(--text-sm)'
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
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
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
        
        <div className="alt-editor-footer" style={{ borderBottom: '1px dashed var(--panel-border)', borderTop: 'none', paddingBottom: 'var(--spacing-sm)' }}>
          <span>💡 {t('forms.bulk_add_help')}</span>
          {isFocused && (
            <span style={{ color: 'var(--success)', animation: 'fadeIn 0.2s', display: 'flex', alignItems: 'center', gap: '3px' }}>
              ⚡ Guardado automático
            </span>
          )}
        </div>

        <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApplyAndClose}
            style={{ 
              padding: 'var(--spacing-xs) var(--spacing-lg)', 
              fontSize: 'var(--text-sm)', 
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
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
