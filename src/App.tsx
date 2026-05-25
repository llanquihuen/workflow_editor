import { useState, useEffect } from 'react';
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
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
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
    isOfflineMode
  } = useWorkflowStore();

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

  const [versionOption, setVersionOption] = useState<'minor' | 'major' | 'keep'>('keep');

  const getNextVersion = (currentVersion: string, option: 'minor' | 'major' | 'keep'): string => {
    const ver = currentVersion || 'v1.0';
    const match = ver.match(/v?(\d+)\.(\d+)/);
    if (!match) return ver;
    
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    
    if (option === 'minor') {
      return `v${major}.${minor + 1}`;
    } else if (option === 'major') {
      return `v${major + 1}.0`;
    }
    return ver;
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextVer = getNextVersion(workflow.version || 'v1.0', versionOption);
      await saveWorkflowToDb(changeSummary || 'Actualización de flujo visual', nextVer);
      setShowSaveModal(false);
      setChangeSummary('');
      setVersionOption('minor');
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

        <style>{`
          .secure-login-layout {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            font-family: 'Inter', sans-serif;
            color: #f8fafc;
          }
          .secure-login-layout.light-theme {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            color: #0f172a;
          }
          .login-glass-card {
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          .light-theme .login-glass-card {
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }
          .login-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .login-logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(99, 102, 241, 0.15);
            color: #818cf8;
            border-radius: 12px;
            width: 60px;
            height: 60px;
            margin-bottom: 16px;
          }
          .logo-shield {
            animation: pulse 2s infinite;
          }
          .login-header h2 {
            font-size: 20px;
            letter-spacing: 2px;
            margin: 0 0 6px 0;
            font-weight: 700;
          }
          .login-header p {
            font-size: 13px;
            color: #94a3b8;
            margin: 0;
          }
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-group label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #94a3b8;
            font-weight: 600;
          }
          .form-group input {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #f8fafc;
            border-radius: 8px;
            padding: 12px 14px;
            font-size: 14px;
            transition: all 0.2s;
          }
          .light-theme .form-group input {
            background: #fff;
            border: 1px solid #cbd5e1;
            color: #0f172a;
          }
          .form-group input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          }
          .btn-login-submit {
            background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
            border: none;
            color: white;
            padding: 14px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .btn-login-submit:hover {
            opacity: 0.9;
          }
          .btn-login-submit:disabled {
            background: #475569;
            cursor: not-allowed;
          }
          .btn-offline-mode {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #94a3b8;
            padding: 12px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: -10px;
          }
          .light-theme .btn-offline-mode {
            border: 1px solid rgba(0, 0, 0, 0.15);
            color: #64748b;
          }
          .btn-offline-mode:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #f8fafc;
            border-color: rgba(255, 255, 255, 0.3);
          }
          .light-theme .btn-offline-mode:hover {
            background: rgba(0, 0, 0, 0.03);
            color: #0f172a;
          }
          .login-error-alert {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 13px;
          }
          .login-seeder-notice {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 12px;
            color: #94a3b8;
          }
          .light-theme .login-seeder-notice {
            border-top: 1px solid rgba(0, 0, 0, 0.08);
          }
          .notice-badge {
            background: rgba(34, 197, 94, 0.15);
            color: #4ade80;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            display: inline-block;
            margin-bottom: 6px;
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}</style>
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
                <button className="btn-save-database" onClick={() => setShowSaveModal(true)}>
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
            
            <form onSubmit={handleSaveSubmit}>
              <div className="form-group-modal" style={{ marginBottom: '20px' }}>
                <label>{t('common.version_control_label', { version: workflow.version || 'v1.0' })}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', color: 'inherit', fontWeight: 'normal', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="versionOption"
                        value="keep"
                        checked={versionOption === 'keep'}
                        onChange={() => setVersionOption('keep')}
                    />
                    {t('common.keep_version').split('—')[0].trim()} ({workflow.version || 'v1.0'}) — {t('common.keep_version').split('—')[1]?.trim()}
                  </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', color: 'inherit', fontWeight: 'normal', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="versionOption"
                      value="minor"
                      checked={versionOption === 'minor'}
                      onChange={() => setVersionOption('minor')}
                    />
                    {t('common.minor_increment').split('—')[0].trim()} ({getNextVersion(workflow.version || 'v1.0', 'minor')}) — {t('common.minor_increment').split('—')[1]?.trim()}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', color: 'inherit', fontWeight: 'normal', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="versionOption"
                      value="major"
                      checked={versionOption === 'major'}
                      onChange={() => setVersionOption('major')}
                    />
                    {t('common.major_increment').split('—')[0].trim()} ({getNextVersion(workflow.version || 'v1.0', 'major')}) — {t('common.major_increment').split('—')[1]?.trim()}
                  </label>
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
                <button type="submit" className="btn-modal-confirm">
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

      <style>{`
        .active-ver-badge {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }
        .bank-actions-group {
          display: flex;
          gap: 10px;
          margin-right: 15px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding-right: 15px;
        }
        .light-theme .bank-actions-group {
          border-right: 1px solid rgba(0, 0, 0, 0.08);
        }
        .btn-save-database {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: opacity 0.2s;
        }
        .btn-save-database:hover {
          opacity: 0.9;
        }
        .btn-toggle-history {
          background: rgba(148, 163, 184, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-main);
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }
        .light-theme .btn-toggle-history {
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .btn-toggle-history:hover, .btn-toggle-history.active {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border-color: rgba(99, 102, 241, 0.3);
        }
        
        /* History panel styles */
        .version-history-pane {
          padding: 20px;
          background: var(--bg-panel);
          height: 100%;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .version-history-pane h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
        }
        .pane-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin: 0 0 20px 0;
        }
        .no-history-alert {
          background: rgba(148, 163, 184, 0.08);
          color: #94a3b8;
          padding: 12px;
          border-radius: 6px;
          font-size: 12px;
          text-align: center;
        }
        .history-timeline {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .history-item {
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .light-theme .history-item {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ver-tag {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .date-tag {
          font-size: 10px;
          color: #94a3b8;
        }
        .summary-text {
          font-size: 12px;
          margin: 0;
          color: var(--text-main);
          font-style: italic;
        }
        .item-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #94a3b8;
          margin-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 8px;
        }
        .light-theme .item-footer {
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }
        .btn-rollback {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-rollback:hover {
          background: #f59e0b;
          color: white;
        }

        /* Modal popup dialog */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: 'Inter', sans-serif;
        }
        .modal-glass-card {
          background: #1e1b4b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 30px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          color: white;
        }
        .light-theme .modal-glass-card {
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          color: #0f172a;
        }
        .modal-glass-card h3 {
          margin: 0 0 10px 0;
          font-size: 18px;
        }
        .modal-glass-card p {
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 20px 0;
        }
        .form-group-modal {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .form-group-modal label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
          font-weight: 600;
        }
        .form-group-modal textarea {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          min-height: 80px;
          resize: vertical;
          font-family: inherit;
        }
        .light-theme .form-group-modal textarea {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f172a;
        }
        .form-group-modal textarea:focus {
          outline: none;
          border-color: #6366f1;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-modal-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .light-theme .btn-modal-cancel {
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .btn-modal-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .btn-modal-confirm {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-modal-confirm:hover {
          opacity: 0.9;
        }
      `}</style>
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
