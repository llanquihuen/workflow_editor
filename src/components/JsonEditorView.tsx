import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { useWorkflowStore } from '../store/useWorkflowStore';

export const JsonEditorView = () => {
  const { t } = useTranslation();
  const { workflow, updateWorkflow, theme } = useWorkflowStore();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const newString = JSON.stringify(workflow, null, 2);
    // Solo actualizar el editor si el cambio viene de otro componente (no es igual al texto actual)
    setJsonText(prev => {
      try {
        if (JSON.stringify(JSON.parse(prev)) === JSON.stringify(workflow)) {
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
        updateWorkflow(parsed);
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
