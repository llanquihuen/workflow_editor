import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DUMMY_USERS } from '../../../../../utils/constants';
import type { Task } from '../../../../../types/workflow.types';

interface ApproversTabProps {
  selectedTask: Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
}

// Helper to split user name and role/department
const parseUser = (fullName: string) => {
  const match = fullName.match(/(.+?)\s*\((.+?)\)/);
  if (match) {
    return { name: match[1].trim(), role: match[2].trim() };
  }
  return { name: fullName, role: '' };
};

// Helper to generate dynamic, consistent avatar background gradients based on user ID
const getRandomColor = (id: string) => {
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
    'linear-gradient(135deg, #10b981, #047857)', // Green
    'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Purple
    'linear-gradient(135deg, #ec4899, #be185d)', // Pink
    'linear-gradient(135deg, #f59e0b, #b45309)', // Amber
    'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
  ];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return colors[sum % colors.length];
};

export const ApproversTab = ({ selectedTask, updateTask }: ApproversTabProps) => {
  const { t } = useTranslation();
  const [approverSearch, setApproverSearch] = useState('');
  const [showApproverDropdown, setShowApproverDropdown] = useState(false);

  const handleAddApprover = (userId: string) => {
    const currentIds = selectedTask.approverIds || [];
    if (!currentIds.includes(userId)) {
      updateTask(selectedTask.id, { approverIds: [...currentIds, userId] });
    }
    setApproverSearch('');
    setShowApproverDropdown(false);
  };

  const handleRemoveApprover = (userId: string) => {
    const currentIds = selectedTask.approverIds || [];
    updateTask(selectedTask.id, { approverIds: currentIds.filter(id => id !== userId) });
  };

  const filteredUsers = DUMMY_USERS.filter(u =>
    u.name.toLowerCase().includes(approverSearch.toLowerCase()) &&
    !(selectedTask.approverIds || []).includes(u.id)
  );

  return (
    <>
      {(!selectedTask.taskType || selectedTask.taskType === 'normal') ? (
        <div className="editor-field">
          <label>{t('tasks.approvers')}</label>
          <div className="approver-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="form-input approver-search-input"
              placeholder={t('tasks.search_approver')}
              value={approverSearch}
              onChange={(e) => { setApproverSearch(e.target.value); setShowApproverDropdown(true); }}
              onFocus={() => setShowApproverDropdown(true)}
              onBlur={() => setTimeout(() => setShowApproverDropdown(false), 200)}
            />
            <span className="dropdown-caret">▼</span>
            {showApproverDropdown && filteredUsers.length > 0 && (
              <div className="approver-search-dropdown">
                {filteredUsers.map(u => {
                  const parsed = parseUser(u.name);
                  const initials = parsed.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={u.id} className="approver-dropdown-item" onMouseDown={(e) => { e.preventDefault(); handleAddApprover(u.id); }}>
                      <div className="approver-avatar" style={{ background: getRandomColor(u.id) }}>{initials}</div>
                      <div className="approver-info">
                        <span className="approver-name">{parsed.name}</span>
                        {parsed.role && <span className="approver-role">{parsed.role}</span>}
                      </div>
                      <span className="add-plus">+</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* External Badges Area */}
          <div className="assigned-approvers-list">
            <div className="assigned-approvers-header">
              <span>{t('tasks.selected_approvers_label')}</span>
              <span className="approvers-count">{(selectedTask.approverIds || []).length}</span>
            </div>
            {(selectedTask.approverIds || []).length === 0 ? (
              <div className="no-approvers-alert">
                {t('tasks.no_approvers_assigned')}
              </div>
            ) : (
              <div className="approver-badges-grid">
                {(selectedTask.approverIds || []).map(id => {
                  const user = DUMMY_USERS.find(u => u.id === id);
                  if (!user) return null;
                  const parsed = parseUser(user.name);
                  const initials = parsed.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={id} className="approver-premium-badge">
                      <div className="badge-avatar" style={{ background: getRandomColor(id) }}>{initials}</div>
                      <div className="badge-details">
                        <span className="badge-name">{parsed.name}</span>
                        {parsed.role && <span className="badge-role">{parsed.role}</span>}
                      </div>
                      <button
                        type="button"
                        className="btn-remove-badge"
                        onClick={() => handleRemoveApprover(id)}
                        title={t('common.delete')}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Requirement Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
            <label className="ios-switch" style={{ width: '40px', height: '22px', display: 'inline-block', position: 'relative' }}>
              <input
                type="checkbox"
                checked={selectedTask.allApproverRequired || false}
                onChange={(e) => updateTask(selectedTask.id, { allApproverRequired: e.target.checked })}
              />
              <span className="ios-slider"></span>
            </label>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: '500', color: 'var(--text-main)' }}>
              {t('tasks.all_approvers_required_label')}
            </span>
          </div>
        </div>
      ) : selectedTask.taskType === 'dynamic' ? (
        <div className="editor-field" style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="approvers-dynamic-notice">
            <div className="notice-icon">⚡</div>
            <div className="notice-content">
              <h5>{t('tasks.task_type_dynamic').split('—')[0].trim()}</h5>
              <p>{t('tasks.dynamic_approvers_placeholder')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-field" style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="approvers-iso-notice">
            <div className="notice-icon">🛡️</div>
            <div className="notice-content">
              <h5>{t('tasks.task_type_iso').split('—')[0].trim()}</h5>
              <p>{t('tasks.iso_approvers_placeholder')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
