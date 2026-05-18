import { useState } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { JsonEditorView } from './components/JsonEditorView';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { TaskEditorView } from './components/TaskEditorView';
import { FormLibraryView } from './components/FormLibraryView';
import { useWorkflowStore } from './store/useWorkflowStore';

function App() {
  const [showJson, setShowJson] = useState(false);
  const { currentView, setCurrentView, theme, toggleTheme } = useWorkflowStore();

  return (
    <div className={`app-container ${theme === 'light' ? 'light-theme' : ''}`}>
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <h1>Workflow Editor</h1>

          <div className="nav-tabs">
            <button
              className={`nav-tab ${currentView === 'flow' ? 'active' : ''}`}
              onClick={() => setCurrentView('flow')}
            >
              Editor de Flujo
            </button>
            <button
              className={`nav-tab ${currentView === 'forms' ? 'active' : ''}`}
              onClick={() => setCurrentView('forms')}
            >
              Biblioteca de Formularios
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-icon"
            onClick={toggleTheme}
            style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button
            className={showJson ? "btn-secondary" : "btn-primary"}
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? 'Ocultar JSON' : 'Mostrar JSON'}
          </button>
        </div>
      </header>

      <main className="app-main-layout">
        <PanelGroup orientation="horizontal">
          {showJson && (
            <>
              <Panel defaultSize={25} minSize={15}>
                <JsonEditorView />
              </Panel>
              <ResizeHandle />
            </>
          )}

          {currentView === 'flow' ? (
            <>
              <Panel defaultSize={50} minSize={30}>
                <WorkflowCanvas />
              </Panel>
              <ResizeHandle />
              <Panel defaultSize={25} minSize={15}>
                <TaskEditorView />
              </Panel>
            </>
          ) : (
            <Panel defaultSize={showJson ? 75 : 100} minSize={50}>
              <FormLibraryView />
            </Panel>
          )}
        </PanelGroup>
      </main>
    </div>
  );
}

function ResizeHandle() {
  return (
    <PanelResizeHandle className="resize-handle">
      <div className="resize-handle-inner" />
    </PanelResizeHandle>
  );
}

export default App;
