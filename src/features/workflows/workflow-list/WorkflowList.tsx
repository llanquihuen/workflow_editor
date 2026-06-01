import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { 
  IconBulk, 
  IconPlus, 
  IconSearch, 
  IconFilterApply, 
  IconFilterReset, 
} from '../../../components/ui/Icons';
import { CreateWorkflowModal, DuplicateWorkflowModal } from './components/ListModals';
import { WorkflowTable } from './components/WorkflowTable';

export const WorkflowList: React.FC = () => {
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
            <IconBulk size={16} style={{ marginRight: 'var(--spacing-sm)' }} />
            {t('dashboard.bulk_changes')}
          </button>
          <button className="btn-new-workflow" onClick={() => setIsModalOpen(true)}>
            <IconPlus size={16} style={{ marginRight: 'var(--spacing-sm)' }} />
            {t('dashboard.new_workflow')}
          </button>
        </div>
      </div>

      {/* Filter Toolbar Section */}
      <div className="dashboard-filters-bar">
        <div className="filter-group search-input-wrapper">
          <IconSearch className="search-icon" size={16} />
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
            <IconFilterApply size={14} style={{ marginRight: 'var(--spacing-xs)' }} />
            {t('dashboard.apply')}
          </button>
          <button className="btn-reset-filters" onClick={handleResetFilters}>
            <IconFilterReset size={14} style={{ marginRight: 'var(--spacing-xs)' }} />
            {t('dashboard.reset')}
          </button>
        </div>
      </div>

      <WorkflowTable
        workflows={filteredWorkflows}
        onLoadWorkflow={loadWorkflow}
        onDeleteWorkflow={deleteWorkflow}
        onToggleEnabled={toggleWorkflowEnabled}
        onDuplicateClick={(workflow) => {
          setWorkflowToDuplicate(workflow);
          setDuplicateWorkflowName(`${workflow.name} (Copia)`);
          setDuplicateModalError('');
          setIsDuplicateModalOpen(true);
        }}
      />

      <CreateWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        workflowName={newWorkflowName}
        setWorkflowName={setNewWorkflowName}
        error={modalError}
        setError={setModalError}
      />

      <DuplicateWorkflowModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onSubmit={handleDuplicateSubmit}
        workflowName={duplicateWorkflowName}
        setWorkflowName={setDuplicateWorkflowName}
        error={duplicateModalError}
        setError={setDuplicateModalError}
      />
    </div>
  );
};
