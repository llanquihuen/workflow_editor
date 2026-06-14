import { useTranslation } from 'react-i18next';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { 
  IconCondition, 
  IconUp, 
  IconDown, 
  IconDelete, 
  IconForm, 
  IconUsers, 
  IconDynamic, 
  IconISO,
  IconLock
} from '../../../../components/ui/Icons';
import { DUMMY_USERS } from '../../../../utils/constants';

const parseUser = (fullName: string) => {
  const match = fullName.match(/(.+?)\s*\((.+?)\)/);
  if (match) {
    return { name: match[1].trim(), role: match[2].trim() };
  }
  return { name: fullName, role: '' };
};

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

export const TaskNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const { workflow, reorderTask, deleteTask } = useWorkflowStore();
  
  const taskName = String(data.label || '');
  const approverIds = (data.approverIds as string[]) || [];
  const hasOverwriteCondition = Boolean(data.hasOverwriteCondition);
  const overwriteConditionsInfo = (data.overwriteConditionsInfo as Array<{ conditionName: string; rulesDescription: string; forcedApprovers: string; }>) || [];
  const formTitles = data.formTitles as string[];
  const hasSkipCondition = Boolean(data.skipCondition);
  const taskType = (data.taskType as 'normal' | 'dynamic' | 'iso' | 'system') || 'normal';
  const conditionsCount = typeof data.conditionsCount === 'number' ? data.conditionsCount : 0;
  const isSkipped = Boolean(data.isSkipped);
  
  const taskIndex = workflow.tasks.findIndex(t => t.id === id);
  const isFirst = taskIndex === 0;
  const isLast = taskIndex === workflow.tasks.length - 1;

  return (
    <div
      className={`custom-task-node ${selected ? 'selected' : ''} ${isSkipped ? 'bypassed' : ''}`}
      style={{ opacity: isSkipped ? 0.35 : (hasSkipCondition ? 0.72 : 1) }}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />
      
      <div className="node-header">
        <span className="node-badge badge-order">
          {String(data.order || '')}
        </span>
        <div 
          className="node-title" 
          style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
          title={taskName}
        >
          {taskName}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
          {isSkipped && (
            <span 
              className="node-badge badge-skipped" 
              title={t('canvas.skipped', { defaultValue: 'Skipped' })}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', color: '#ffffff', padding: '2px var(--spacing-sm)', borderRadius: '12px', gap: '3px', fontSize: '9px', fontWeight: 'bold' }}
            >
              <span>⏭️ {t('canvas.skipped', { defaultValue: 'Skipped' })}</span>
            </span>
          )}
          {conditionsCount > 0 && (
            <span 
              className="node-badge badge-condition" 
              title={t('tasks.conditions_title')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', color: '#ffffff', padding: '2px var(--spacing-sm)', borderRadius: '12px', gap: '3px', fontSize: '9px', fontWeight: 'bold' }}
            >
              <IconCondition size={10} />
              <span>+{conditionsCount} {conditionsCount === 1 ? t('tasks.condition_count_one') : t('tasks.condition_count_other')}</span>
            </span>
          )}
          <div className="node-controls" style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <button 
              className="node-btn" 
              disabled={taskIndex <= 1} 
              onClick={(e) => { e.stopPropagation(); reorderTask(id, 'up'); }}
              title={t('common.up')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconUp size={10} />
            </button>
            <button 
              className="node-btn" 
              disabled={isFirst || isLast} 
              onClick={(e) => { e.stopPropagation(); reorderTask(id, 'down'); }}
              title={t('common.down')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconDown size={10} />
            </button>
            <button 
              className="node-btn delete" 
              disabled={isFirst} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if(confirm(t('tasks.delete_confirm', { name: taskName }))) deleteTask(id); 
              }}
              title={t('common.delete')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconDelete size={10} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="node-body">
        {formTitles && formTitles.length > 0 ? (
          <div className="node-detail" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <IconForm size={12} style={{ color: 'var(--primary)' }} />
              </span>
              <span className="node-text" style={{ fontWeight: '600' }}>{t('forms.title')} ({formTitles.length})</span>
            </div>
            {formTitles.map((title, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', paddingLeft: 'var(--spacing-xs)', width: '100%' }}>
                <span style={{ fontSize: '9px', backgroundColor: 'var(--panel-border)', padding: '1px var(--spacing-xs)', borderRadius: '10px', color: 'var(--text-main)', fontWeight: 'bold' }}>{index + 1}</span>
                <span className="node-text" style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }} title={title}>{title}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="node-detail empty">
            <span className="node-text">{t('tasks.no_forms')}</span>
          </div>
        )}
        
        {taskType === 'normal' ? (
          approverIds && approverIds.length > 0 ? (
            <div className="node-detail" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-xs)', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <IconUsers size={12} style={{ color: 'var(--primary)' }} />
                </span>
                <span className="node-text" style={{ fontWeight: '600' }}>
                  {t('tasks.approvers')} ({approverIds.length})
                </span>
              </div>
              
              <div className="approver-avatar-stack">
                {approverIds.map(id => {
                  const user = DUMMY_USERS.find(u => u.id === id);
                  if (!user) return null;
                  const parsed = parseUser(user.name);
                  const initials = parsed.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div 
                      key={id} 
                      className="approver-node-avatar" 
                      style={{ background: getRandomColor(id) }}
                    >
                      {initials}
                      <div className="avatar-tooltip">
                        <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{parsed.name}</div>
                        {parsed.role && <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.2' }}>{parsed.role}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasOverwriteCondition && (
                <div className="overwrite-indicator-badge">
                  <span>🔄</span>
                  <span>{t('tasks.overwrite_condition_canvas', { defaultValue: 'Overwritable' })}</span>
                  <div className="badge-tooltip">
                    <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#f87171', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px' }}>
                      {t('tasks.overwrite_tooltip_title', { defaultValue: 'Overwrite Conditions' })}
                    </div>
                    {overwriteConditionsInfo.map((info, idx) => (
                      <div key={idx} style={{ marginBottom: idx < overwriteConditionsInfo.length - 1 ? '8px' : 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '10.5px', color: 'var(--primary-light, #93c5fd)' }}>
                          {info.conditionName}
                        </div>
                        <div style={{ fontSize: '9.5px', opacity: 0.85, margin: '2px 0' }}>
                          <strong>{t('tasks.tooltip_rule_label', { defaultValue: 'Rule:' })}</strong> {info.rulesDescription}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#34d399' }}>
                          <strong>{t('tasks.tooltip_forced_approvers_label', { defaultValue: 'Override to:' })}</strong> {info.forcedApprovers}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="node-detail empty" style={{ flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <IconUsers size={12} style={{ color: 'var(--primary)' }} />
                </span>
                <span className="node-text">{t('tasks.no_approvers')}</span>
              </div>
              {hasOverwriteCondition && (
                <div className="overwrite-indicator-badge">
                  <span>🔄</span>
                  <span>{t('tasks.overwrite_condition_canvas', { defaultValue: 'Overwritable' })}</span>
                  <div className="badge-tooltip">
                    <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#f87171', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px' }}>
                      {t('tasks.overwrite_tooltip_title', { defaultValue: 'Overwrite Conditions' })}
                    </div>
                    {overwriteConditionsInfo.map((info, idx) => (
                      <div key={idx} style={{ marginBottom: idx < overwriteConditionsInfo.length - 1 ? '8px' : 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '10.5px', color: 'var(--primary-light, #93c5fd)' }}>
                          {info.conditionName}
                        </div>
                        <div style={{ fontSize: '9.5px', opacity: 0.85, margin: '2px 0' }}>
                          <strong>{t('tasks.tooltip_rule_label', { defaultValue: 'Rule:' })}</strong> {info.rulesDescription}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#34d399' }}>
                          <strong>{t('tasks.tooltip_forced_approvers_label', { defaultValue: 'Override to:' })}</strong> {info.forcedApprovers}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : taskType === 'system' ? (
          <div className="node-detail font-bold" style={{ backgroundColor: 'rgba(107, 114, 128, 0.08)', border: '1px solid rgba(107, 114, 128, 0.15)', borderRadius: '6px', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
            <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <IconLock size={12} style={{ color: '#6b7280' }} />
            </span>
            <span className="node-text" style={{ color: '#6b7280', fontWeight: '700', fontSize: 'var(--text-xs)' }}>
              {t('tasks.system_step_badge')}
            </span>
          </div>
        ) : taskType === 'dynamic' ? (
          <div className="node-detail font-bold" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '6px', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
            <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <IconDynamic size={12} style={{ color: '#3b82f6' }} />
            </span>
            <span className="node-text" style={{ color: 'var(--primary)', fontWeight: '700', fontSize: 'var(--text-xs)' }}>
              {t('tasks.task_type_dynamic').split('—')[0].trim()}
            </span>
          </div>
        ) : (
          <div className="node-detail font-bold" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '6px', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
            <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <IconISO size={12} style={{ color: '#10b981' }} />
            </span>
            <span className="node-text" style={{ color: '#10b981', fontWeight: '700', fontSize: 'var(--text-xs)' }}>
              {t('tasks.task_type_iso').split('—')[0].trim()}
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
};
