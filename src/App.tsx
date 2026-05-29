import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { JsonEditorView } from './components/JsonEditorView';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { TaskEditorView } from './components/TaskEditorView';
import { FormLibraryView } from './components/FormLibraryView';
import { WorkflowDashboardView } from './components/WorkflowDashboardView';
import { useWorkflowStore } from './store/useWorkflowStore';
import { detectWorkflowChanges } from './utils/changeDetector';
import { WorkflowSettingsModal } from './components/WorkflowSettingsModal';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [showJson, setShowJson] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [versionToRestore, setVersionToRestore] = useState<string | null>(null);
  
  // Login State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    currentView,
    setCurrentView,
    theme,
    toggleTheme,
    workflow,
    isAuthenticated,
    authUsername,
    loading,
    workflowHistory,
    checkAuth,
    login,
    logout,
    saveWorkflowToDb,
    rollbackToVersion,
    enableOfflineMode,
    savedWorkflowSnapshot
  } = useWorkflowStore();

  const assignedFormIds = new Set((workflow?.tasks || []).flatMap((t) => t.formIds || []));
  const unassignedForms = (workflow?.forms || []).filter((f) => !assignedFormIds.has(f.id));
  const hasUnassignedForms = unassignedForms.length > 0;

  // Mount Hook: Auto-login check
  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión');
    }
  };

  const getNextVersion = (currentVersion: string): string => {
    const ver = currentVersion || 'v1';
    const match = ver.match(/v?(\d+)/);
    const currentNum = match ? parseInt(match[1], 10) : 1;
    return `v${currentNum + 1}`;
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextVer = getNextVersion(workflow.version || 'v1');
      await saveWorkflowToDb(changeSummary || 'Actualización de flujo visual', nextVer);
      setShowSaveModal(false);
      setChangeSummary('');
    } catch (err) {
      // handled in store
    }
  };

  // If not authenticated, show a glorious, bank-grade secure login screen
  if (!isAuthenticated) {
    return (
      <div className={`secure-login-layout ${theme === 'light' ? 'light-theme' : ''}`}>
        <div className="login-glass-card">
          <div className="login-header">
            <div className="login-logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="logo-shield">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2>WORKFLOW</h2>
            <p>Workflow Management</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="login-form">
            {loginError && <div className="login-error-alert">{loginError}</div>}
            
            <div className="form-group">
              <label>Nombre de Usuario (Operador)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario corporativo"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña de Acceso</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
              />
            </div>

            <button type="submit" className="btn-login-submit" disabled={loading}>
              {loading ? 'Validando Firma Digital...' : 'Ingresar de forma Segura'}
            </button>
            <button 
              type="button" 
              className="btn-offline-mode" 
              onClick={enableOfflineMode}
            >
              Continuar en Modo Local (Mock)
            </button>
          </form>

          <div className="login-seeder-notice">
            <span className="notice-badge">SIT / local</span>
            <p>El backend local (puerto 8080) se encuentra activo. Inicia sesión con la credencial sembrada: <strong>admin / admin123</strong></p>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="tab-label">Home</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <span className="tab-label">Search</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </span>
            <span className="tab-label">Intray</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <span className="tab-label">Requests</span>
          </button>
          <button
            className={`sidebar-tab ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
            title="Workflows"
          >
            <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="tab-label">Workflows</span>
          </button>
          <button className="sidebar-tab disabled" tabIndex={-1}>
            <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
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
                <span className="active-ver-badge">{workflow.version || 'v1.0'}</span>
              </div>
            )}
          </div>

          <div className="header-right">
            {/* Save and Version History triggers (Bank integrations) */}
            {currentView !== 'dashboard' && workflow && (
              <div className="bank-actions-group">
                <button
                  className="btn-toggle-history"
                  onClick={() => setShowSettingsModal(true)}
                  style={{ marginRight: '6px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  
                </button>

                <button
                  className="btn-save-database"
                  onClick={() => {
                    const summary = detectWorkflowChanges(savedWorkflowSnapshot, workflow, t);
                    setChangeSummary(summary);
                    setShowSaveModal(true);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {t('common.save_on_server')}
                </button>

                <button
                  className={`btn-toggle-history ${showHistory ? 'active' : ''}`}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t('common.history')}
                </button>
              </div>
            )}

            <div className="header-right-controls">
              <div className="lang-selector-wrapper">
                <span className="link-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <select
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className="lang-select-discreet"
                >
                  <option value="es">ES</option>
                  <option value="en">EN</option>
                </select>
              </div>
            </div>

            {/* Utility theme controls */}
            <div className="header-utility-controls">
              <button
                className="btn-icon-shell"
                onClick={toggleTheme}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}
                title={theme === 'light' ? t('app.dark_mode') : t('app.light_mode')}
              >
                {theme === 'light' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </button>

              {currentView !== 'dashboard' && (
                <button
                  className={`btn-discreet-shell ${showJson ? 'active' : ''}`}
                  onClick={() => setShowJson(!showJson)}
                >
                  {showJson ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4l3 3" />
                      </svg>
                      {t('app.normal_view')}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      {t('app.dev_view')}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="user-profile-badge" onClick={logout} style={{ cursor: 'pointer' }} title="Haga clic para Salir de Forma Segura">
              <span className="profile-initials">{authUsername ? authUsername.substring(0, 2).toUpperCase() : 'OP'}</span>
              <span className="profile-fullname">{authUsername || 'Operador Corporativo'} (Salir)</span>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      {t('app.flow_editor')}
                    </span>
                  </button>
                  <button
                    className={`editor-submenu-tab ${currentView === 'forms' ? 'active' : ''}`}
                    onClick={() => setCurrentView('forms')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      {t('app.form_library')}
                    </span>
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

                  {/* Version history panel */}
                  {showHistory && (
                    <>
                      <Panel defaultSize={20} minSize={15}>
                        <div className="version-history-pane">
                          <h3>{t('common.change_history_title')}</h3>
                          <p className="pane-subtitle">{t('common.immutable_snapshots_desc')}</p>
                          {workflowHistory.length === 0 ? (
                            <div className="no-history-alert">{t('common.no_registered_versions')}</div>
                          ) : (
                            <div className="history-timeline">
                              {workflowHistory.map((hist) => (
                                <div key={hist.id} className="history-item">
                                  <div className="item-header">
                                    <span className="ver-tag">{hist.version}</span>
                                    <span className="date-tag">{new Date(hist.modifiedAt).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="summary-text">"{hist.changeSummary}"</p>
                                  <div className="item-footer">
                                    <span>{t('common.by_operator')}: <strong>{hist.modifiedBy}</strong></span>
                                    {hist.version !== workflow.version && (
                                      <button className="btn-rollback" onClick={() => setVersionToRestore(hist.version)}>
                                        {t('common.restore')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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

      {/* Save to Server Popup Dialog Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-glass-card">
            <h3>{t('common.confirm_save_modal_title')}</h3>
            <p>{t('common.save_modal_desc')}</p>

            {hasUnassignedForms && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '13.5px',
                color: '#f87171',
                lineHeight: '1.5'
              }}>
                <span style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px' }}>
                  ⚠️ {t('common.warning_orphan_forms')}
                </span>
                <p style={{ margin: '0 0 8px 0', opacity: 0.9 }}>
                  {t('common.warning_orphan_forms_desc')}
                </p>
                <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                  {unassignedForms.map(f => (
                    <li key={f.id} style={{ fontWeight: '600' }}>{f.title}</li>
                  ))}
                </ul>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.8, fontStyle: 'italic' }}>
                  {t('common.warning_orphan_forms_help')}
                </p>
              </div>
            )}
            
            <form onSubmit={handleSaveSubmit}>
              <div className="form-group-modal" style={{ marginBottom: '20px' }}>
                <label>{t('common.save_version_governance')}</label>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{t('common.save_current_version')}</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{workflow.version || 'v1'}</strong>
                  </div>
                  <div style={{ fontSize: '16px', color: 'var(--primary)', fontWeight: 'bold' }}>➔</div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{t('common.save_next_version')}</span>
                    <strong style={{ fontSize: '14px', color: '#10b981' }}>{getNextVersion(workflow.version || 'v1')}</strong>
                  </div>
                </div>
              </div>

              <div className="form-group-modal">
                <label>{t('common.change_description_label')}</label>
                <textarea
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder={t('common.change_description_placeholder')}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowSaveModal(false)}>
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-modal-confirm"
                  disabled={hasUnassignedForms}
                  style={hasUnassignedForms ? {
                    background: '#334155',
                    color: '#94a3b8',
                    cursor: 'not-allowed',
                    opacity: 0.5,
                    boxShadow: 'none',
                    border: '1px solid rgba(255,255,255,0.05)'
                  } : {}}
                >
                  {t('common.confirm_and_sign')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Version Confirmation Modal */}
      {versionToRestore && (
        <div className="modal-overlay">
          <div className="modal-glass-card" style={{ maxWidth: '480px' }}>
            <h3>{t('common.confirm_restore_title')}</h3>
            <p style={{ lineHeight: '1.6', fontSize: '13.5px', marginBottom: '24px', opacity: 0.9 }}>
              {t('common.confirm_restore_desc', { version: versionToRestore })}
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setVersionToRestore(null)}
              >
                {t('common.cancel')}
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm" 
                onClick={async () => {
                  const ver = versionToRestore;
                  setVersionToRestore(null);
                  await rollbackToVersion(ver);
                }}
                style={{
                  background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)'
                }}
              >
                {t('common.restore')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Settings Modal */}
      <WorkflowSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      
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
