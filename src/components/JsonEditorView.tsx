import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { useWorkflowStore, mapFrontendToApi, mapApiToFrontend } from '../store/useWorkflowStore';

export const JsonEditorView = () => {
  const { t } = useTranslation();
  const { workflow, updateWorkflow, theme } = useWorkflowStore();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const apiPayload = mapFrontendToApi(workflow);
    const newString = JSON.stringify(apiPayload, null, 2);
    // Solo actualizar el editor si el cambio viene de otro componente (no es igual al texto actual)
    setJsonText(prev => {
      try {
        if (JSON.stringify(JSON.parse(prev)) === JSON.stringify(apiPayload)) {
           return prev; // Mantiene el formato del usuario si semánticamente es igual
        }
      } catch(e) {}
      return newString;
    });
  }, [workflow]);

  const handleChange = (value: string | undefined) => {
    const text = value || '';
    setJsonText(text);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(text);
        if (parsed.name && typeof parsed.name === 'string') {
          const isDuplicateName = useWorkflowStore.getState().workflows.some(
            (w) => w.id !== parsed.id && w.name.trim().toLowerCase() === parsed.name.trim().toLowerCase()
          );
          if (isDuplicateName) {
            setError(t('forms.duplicate_name_error') || 'Este nombre de workflow ya existe');
            return;
          }
        }
        const frontendWf = mapApiToFrontend(parsed);
        updateWorkflow(frontendWf);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(`${t('common.error')}: ${err.message}`);
        } else {
          setError(`${t('common.error')}: JSON inválido`);
        }
      }
    }, 600); // 600ms debounce
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h3>{t('json.title')} {error && <span style={{color: '#ef4444', fontSize: '12px', marginLeft: '10px'}}>({t('common.saving')}... {error})</span>}</h3>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel-content">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme={theme === 'light' ? 'light' : 'vs-dark'}
          value={jsonText}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
};
