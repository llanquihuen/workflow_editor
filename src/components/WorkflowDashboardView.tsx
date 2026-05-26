import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { DUMMY_USERS } from '../utils/constants';

export const WorkflowDashboardView: React.FC = () => {
  const { t } = useTranslation();
  const {
    workflows,
    loadWorkflow,
    createNewWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
    toggleWorkflowEnabled,
  } = useWorkflowStore();

  // Filter state
  const [search, setSearch] = useState('');
  const [complexityFilter, setComplexityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Active filters applied
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedComplexity, setAppliedComplexity] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [modalError, setModalError] = useState('');

  // Duplicate Modal state
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [workflowToDuplicate, setWorkflowToDuplicate] = useState<{ id: string, name: string } | null>(null);
  const [duplicateWorkflowName, setDuplicateWorkflowName] = useState('');
  const [duplicateModalError, setDuplicateModalError] = useState('');

  // Dynamic complexity calculator based on task count
  const getComplexity = (tasksCount: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (tasksCount <= 3) return 'low';
    if (tasksCount <= 6) return 'medium';
    if (tasksCount <= 9) return 'high';
    return 'critical';
  };

  // Avatar helper
  const getOwnerDetails = (ownerId?: string) => {
    const owner = DUMMY_USERS.find((u) => u.id === ownerId);
    if (!owner) return { name: 'System Administrator', initials: 'SA', color: '#6366f1' };

    // Clean name (remove department inside parentheses)
    const cleanName = owner.name.split(' (')[0];
    const parts = cleanName.split(' ');
    const initials = parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase();

    // Deterministic color
    const colors = [
      '#6366f1', // Indigo
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#14b8a6', // Teal
      '#06b6d4', // Cyan
      '#f97316', // Orange
    ];
    let sum = 0;
    for (let i = 0; i < (ownerId || '').length; i++) {
      sum += (ownerId || '').charCodeAt(i);
    }
    const color = colors[sum % colors.length];

    return { name: cleanName, initials, color };
  };

  const handleApplyFilters = () => {
    setAppliedSearch(search);
    setAppliedComplexity(complexityFilter);
    setAppliedStatus(statusFilter);
  };

  const handleResetFilters = () => {
    setSearch('');
    setComplexityFilter('');
    setStatusFilter('');
    setAppliedSearch('');
    setAppliedComplexity('');
    setAppliedStatus('');
  };

  // Filter the list
  const filteredWorkflows = workflows.filter((wf) => {
    // 1. Search text
    if (appliedSearch) {
      const query = appliedSearch.toLowerCase();
      const matchesName = wf.name.toLowerCase().includes(query);
      const matchesId = wf.id.toLowerCase().includes(query);
      if (!matchesName && !matchesId) return false;
    }

    // 2. Complexity
    if (appliedComplexity) {
      const comp = getComplexity(wf.tasks.length);
      if (comp !== appliedComplexity) return false;
    }

    // 3. Status (enabled/disabled)
    if (appliedStatus) {
      const isEnabled = wf.enabled !== false;
      const expectedEnabled = appliedStatus === 'enabled';
      if (isEnabled !== expectedEnabled) return false;
    }

    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) {
      setModalError(t('tasks.duplicate_name_error')); // Fallback translation
      return;
    }

    // Check duplicates in workflows list
    const isDuplicate = workflows.some(
      (w) => w.name.toLowerCase() === newWorkflowName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setModalError(
        t('forms.duplicate_name_error') || 'Este nombre de workflow ya existe'
      );
      return;
    }

    createNewWorkflow(newWorkflowName.trim());
    setNewWorkflowName('');
    setIsModalOpen(false);
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateWorkflowName.trim()) {
      setDuplicateModalError(t('tasks.duplicate_name_error') || 'El nombre no puede estar vacío');
      return;
    }

    // Check duplicates in workflows list
    const isDuplicate = workflows.some(
      (w) => w.name.toLowerCase() === duplicateWorkflowName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setDuplicateModalError(
        t('forms.duplicate_name_error') || 'Este nombre de workflow ya existe'
      );
      return;
    }

    if (workflowToDuplicate) {
      duplicateWorkflow(workflowToDuplicate.id, duplicateWorkflowName.trim());
      setIsDuplicateModalOpen(false);
      setWorkflowToDuplicate(null);
      setDuplicateWorkflowName('');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="rating-stars">
        {Array.from({ length: 5 }).map((_, idx) => (
          <svg
            key={idx}
            className={`star-icon ${idx < rating ? 'star-filled' : 'star-empty'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Upper Title Section */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{t('dashboard.title')}</h1>
          <p className="dashboard-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="btn-bulk-changes">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '8px' }}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
            </svg>
            {t('dashboard.bulk_changes')}
          </button>
          <button className="btn-new-workflow" onClick={() => setIsModalOpen(true)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '8px' }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('dashboard.new_workflow')}
          </button>
        </div>
      </div>

      {/* Filter Toolbar Section */}
      <div className="dashboard-filters-bar">
        <div className="filter-group search-input-wrapper">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="filter-search"
            placeholder={t('dashboard.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={complexityFilter}
            onChange={(e) => setComplexityFilter(e.target.value)}
          >
            <option value="">{t('dashboard.all_complexities')}</option>
            <option value="low">{t('dashboard.complexities.low')}</option>
            <option value="medium">{t('dashboard.complexities.medium')}</option>
            <option value="high">{t('dashboard.complexities.high')}</option>
            <option value="critical">{t('dashboard.complexities.critical')}</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('dashboard.all_statuses')}</option>
            <option value="enabled">{t('dashboard.statuses.enabled')}</option>
            <option value="disabled">{t('dashboard.statuses.disabled')}</option>
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn-apply-filters" onClick={handleApplyFilters}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '6px' }}
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {t('dashboard.apply')}
          </button>
          <button className="btn-reset-filters" onClick={handleResetFilters}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '6px' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {t('dashboard.reset')}
          </button>
        </div>
      </div>

      {/* Main Workflow Table Grid */}
      <div className="dashboard-table-container">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>{t('dashboard.col_id')}</th>
              <th>{t('dashboard.col_name')}</th>
              <th>{t('dashboard.col_owner')}</th>
              <th>{t('dashboard.col_updated')}</th>
              <th>{t('dashboard.col_version')}</th>
              <th>{t('dashboard.col_complexity')}</th>
              <th>{t('dashboard.col_rating')}</th>
              <th>{t('dashboard.col_enabled')}</th>
              <th className="actions-header">{t('dashboard.col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.length > 0 ? (
              filteredWorkflows.map((wf) => {
                const complexity = getComplexity(wf.tasks.length);
                const owner = getOwnerDetails(wf.ownerId);

                return (
                  <tr key={wf.id}>
                    <td className="col-id-badge">
                      <span style={{width:'13ch', textAlign:'center',display:'inline-block'}}>{wf.id}</span>
                    </td>
                    <td className="col-name-link">
                      <button className="wf-name-btn" onClick={() => loadWorkflow(wf.id)}>
                        {wf.name}
                      </button>
                    </td>
                    <td>
                      <div className="col-owner-badge">
                        <span
                          className="owner-avatar"
                          style={{ backgroundColor: owner.color }}
                        >
                          {owner.initials}
                        </span>
                        <span className="owner-name">{owner.name}</span>
                      </div>
                    </td>
                    <td className="col-updated">{wf.updatedAt}</td>
                    <td className="col-version">{wf.version}</td>
                    <td>
                      <span className={`complexity-badge badge-${complexity}`}>
                        {t(`dashboard.complexities.${complexity}`)}
                      </span>
                    </td>
                    <td>{renderStars(wf.rating || 5)}</td>
                    <td>
                      <label className="ios-switch">
                        <input
                          type="checkbox"
                          checked={wf.enabled !== false}
                          onChange={() => toggleWorkflowEnabled(wf.id)}
                        />
                        <span className="ios-slider"></span>
                      </label>
                    </td>
                    <td className="col-actions">
                      <div className="action-buttons-group">
                        <button
                          className="btn-action-icon"
                          title={t('common.edit')}
                          onClick={() => loadWorkflow(wf.id)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className="btn-action-icon"
                          title={t('common.duplicate') || 'Duplicar'}
                          onClick={() => {
                            setWorkflowToDuplicate({ id: wf.id, name: wf.name });
                            setDuplicateWorkflowName(`${wf.name} (Copia)`);
                            setDuplicateModalError('');
                            setIsDuplicateModalOpen(true);
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                        <button
                          className="btn-action-icon text-danger"
                          title={t('common.delete')}
                         onClick={async () => {
                            if (confirm(t('dashboard.delete_confirm'))) {
                              try {
                                await deleteWorkflow(wf.id);
                              } catch (err: any) {
                                alert(err.message || 'Error al eliminar el workflow.');
                              }
                            }
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="table-empty-state">
                  {t('forms.empty_list') || 'No hay workflows creados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Blurred Glassmorphism Dialog Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('dashboard.create_modal_title')}</h2>
              <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-card-body">
                <div className="form-group">
                  <label className="modal-label">{t('dashboard.create_modal_label')}</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder={t('dashboard.create_modal_placeholder')}
                    value={newWorkflowName}
                    onChange={(e) => {
                      setNewWorkflowName(e.target.value);
                      setModalError('');
                    }}
                    autoFocus
                  />
                  {modalError && <p className="modal-error-message">⚠️ {modalError}</p>}
                </div>
              </div>
              <div className="modal-card-footer">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-modal-primary">
                  {t('dashboard.create_modal_submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Blurred Glassmorphism Dialog Modal for Duplication */}
      {isDuplicateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDuplicateModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('dashboard.duplicate_modal_title') || t('common.duplicate')}</h2>
              <button className="btn-close-modal" onClick={() => setIsDuplicateModalOpen(false)}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleDuplicateSubmit}>
              <div className="modal-card-body">
                <div className="form-group">
                  <label className="modal-label">{t('dashboard.create_modal_label')}</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder={t('dashboard.create_modal_placeholder')}
                    value={duplicateWorkflowName}
                    onChange={(e) => {
                      setDuplicateWorkflowName(e.target.value);
                      setDuplicateModalError('');
                    }}
                    autoFocus
                  />
                  {duplicateModalError && <p className="modal-error-message">⚠️ {duplicateModalError}</p>}
                </div>
              </div>
              <div className="modal-card-footer">
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => setIsDuplicateModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-modal-primary">
                  {t('common.duplicate') || 'Duplicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
