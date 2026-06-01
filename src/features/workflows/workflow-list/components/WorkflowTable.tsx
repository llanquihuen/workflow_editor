import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconStar, IconEdit, IconDuplicate, IconDeleteSolid } from '../../../../components/ui/Icons';
import { DUMMY_USERS } from '../../../../utils/constants';
import type { Workflow } from '../../../../types/workflow.types';

interface WorkflowTableProps {
  workflows: Workflow[];
  onLoadWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => Promise<void>;
  onToggleEnabled: (id: string) => void;
  onDuplicateClick: (workflow: { id: string; name: string }) => void;
}

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

  const names = owner.name.split(' ');
  const initials = names.slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  
  // Use a hash function to generate consistent colors based on ID
  const hash = owner.id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash % 361);
  
  return {
    name: owner.name,
    initials,
    color: `hsl(${hue}, 50%, 45%)`
  };
};

export const WorkflowTable: React.FC<WorkflowTableProps> = ({
  workflows,
  onLoadWorkflow,
  onDeleteWorkflow,
  onToggleEnabled,
  onDuplicateClick,
}) => {
  const { t } = useTranslation();

  const renderStars = (rating: number) => {
    return (
      <div className="rating-stars">
        {Array.from({ length: 5 }).map((_, idx) => (
          <IconStar
            key={idx}
            className={`star-icon ${idx < rating ? 'star-filled' : 'star-empty'}`}
          />
        ))}
      </div>
    );
  };

  return (
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
          {workflows.length > 0 ? (
            workflows.map((wf) => {
              const complexity = getComplexity(wf.tasks.length);
              const owner = getOwnerDetails(wf.ownerId);

              return (
                <tr key={wf.id}>
                  <td className="col-id-badge">
                    <span style={{width:'13ch', textAlign:'center',display:'inline-block'}}>{wf.id}</span>
                  </td>
                  <td className="col-name-link">
                    <button className="wf-name-btn" onClick={() => onLoadWorkflow(wf.id)}>
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
                        onChange={() => onToggleEnabled(wf.id)}
                      />
                      <span className="ios-slider"></span>
                    </label>
                  </td>
                  <td className="col-actions">
                    <div className="action-buttons-group">
                      <button
                        className="btn-action-icon"
                        title={t('common.edit')}
                        onClick={() => onLoadWorkflow(wf.id)}
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        className="btn-action-icon"
                        title={t('common.duplicate') || 'Duplicar'}
                        onClick={() => onDuplicateClick({ id: wf.id, name: wf.name })}
                      >
                        <IconDuplicate size={16} />
                      </button>
                      <button
                        className="btn-action-icon text-danger"
                        title={t('common.delete')}
                        onClick={async () => {
                          if (confirm(t('dashboard.delete_confirm'))) {
                            try {
                              await onDeleteWorkflow(wf.id);
                            } catch (err: any) {
                              alert(err.message || 'Error al eliminar el workflow.');
                            }
                          }
                        }}
                      >
                        <IconDeleteSolid size={16} />
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
  );
};
