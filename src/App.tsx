import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { JsonEditorView } from './components/JsonEditorView';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { TaskEditorView } from './components/TaskEditorView';
import { FormLibraryView } from './components/FormLibraryView';
import { WorkflowDashboardView } from './components/WorkflowDashboardView';
import { useWorkflowStore } from './store/useWorkflowStore';

function App() {
  const { t, i18n } = useTranslation();
  const [showJson, setShowJson] = useState(false);
  const { currentView, setCurrentView, theme, toggleTheme, workflow } = useWorkflowStore();

  return (
    <div className={`app-layout-shell ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* Sleek Vertical Left Sidebar */}
      <aside className="sidebar-aside">
        <div className="sidebar-logo">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="logo-lightning"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon">🏠</span>
            <span className="tab-label">Home</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon">🔍</span>
            <span className="tab-label">Search</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon">📥</span>
            <span className="tab-label">Intray</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon">📄</span>
            <span className="tab-label">Requests</span>
          </button>
          <button
            className={`sidebar-tab ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
            title="Workflows"
          >
            <span className="tab-icon">⚙️</span>
            <span className="tab-label">Workflows</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon">📊</span>
            <span className="tab-label">Reports</span>
          </button>
        </nav>
      </aside>

      {/* Main Right Workspace Pane */}
      <div className="main-shell-right">
        {/* Global Header */}
        <header className="main-shell-header">
          <div className="header-left">
            {currentView !== 'dashboard' && workflow && (
              <div className="editor-breadcrumbs">
                <button
                  className="btn-back-to-dashboard"
                  onClick={() => setCurrentView('dashboard')}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  {t('common.close')}
                </button>
                <span className="breadcrumb-separator">/</span>
                <span className="editing-workflow-title">{workflow.name}</span>
              </div>
            )}
          </div>

          <div className="header-right">
            {/* Mockup Top Header links */}
            <div className="mockup-header-links">
              {/*<button className="header-link-btn">*/}
              {/*  <span className="link-icon">❓</span>*/}
              {/*  <span className="link-label">Help</span>*/}
              {/*</button>*/}

              <div className="lang-selector-wrapper">
                <span className="link-icon">🌐</span>
                <select
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className="lang-select-discreet"
                >
                  <option value="es">ES</option>
                  <option value="en">EN</option>
                </select>
              </div>

              {/*<button className="header-link-btn">*/}
              {/*  <span className="link-icon">💬</span>*/}
              {/*  <span className="link-label">Feedback</span>*/}
              {/*</button>*/}
            </div>

            {/* Utility theme controls */}
            <div className="header-utility-controls">
              <button
                className="btn-icon-shell"
                onClick={toggleTheme}
                style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}
                title={theme === 'light' ? t('app.dark_mode') : t('app.light_mode')}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              {currentView !== 'dashboard' && (
                <button
                  className={`btn-discreet-shell ${showJson ? 'active' : ''}`}
                  onClick={() => setShowJson(!showJson)}
                >
                  {showJson ? `🎨 ${t('app.normal_view')}` : `💻 ${t('app.dev_view')}`}
                </button>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="user-profile-badge">
              <span className="profile-initials">SA</span>
              <span className="profile-fullname">System Administrator</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Body */}
        <div className="main-shell-content">
          {currentView === 'dashboard' ? (
            <WorkflowDashboardView />
          ) : (
            <div className="editor-workspace-container">
              {/* Secondary Submenu Bar for Editor Tabs */}
              <div className="editor-submenu-bar">
                <div className="editor-submenu-tabs">
                  <button
                    className={`editor-submenu-tab ${currentView === 'flow' ? 'active' : ''}`}
                    onClick={() => setCurrentView('flow')}
                  >
                    📈 {t('app.flow_editor')}
                  </button>
                  <button
                    className={`editor-submenu-tab ${currentView === 'forms' ? 'active' : ''}`}
                    onClick={() => setCurrentView('forms')}
                  >
                    📋 {t('app.form_library')}
                  </button>
                </div>
              </div>

              {/* Editor Workspace panels */}
              <div className="editor-panels-layout">
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
                      <Panel defaultSize={45} minSize={30}>
                        <TaskEditorView />
                      </Panel>
                      <ResizeHandle />
                      <Panel defaultSize={30} minSize={15}>
                        <WorkflowCanvas />
                      </Panel>
                    </>
                  ) : (
                    <Panel defaultSize={showJson ? 75 : 100} minSize={50}>
                      <FormLibraryView />
                    </Panel>
                  )}
                </PanelGroup>
              </div>
            </div>
          )}
        </div>
      </div>
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
