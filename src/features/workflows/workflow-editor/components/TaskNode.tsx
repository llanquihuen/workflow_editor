import { useTranslation } from 'react-i18next';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { 
  IconCondition, 
  IconSkip, 
  IconUp, 
  IconDown, 
  IconDelete, 
  IconForm, 
  IconUsers, 
  IconDynamic, 
  IconISO 
} from '../../../../components/ui/Icons';

export const TaskNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const { workflow, reorderTask, deleteTask } = useWorkflowStore();
  
  const taskName = String(data.label || '');
  const approversList = data.approvers as string[];
  const formTitles = data.formTitles as string[];
  const hasSkipCondition = Boolean(data.skipCondition);
  const taskType = (data.taskType as 'normal' | 'dynamic' | 'iso') || 'normal';
  
  const taskIndex = workflow.tasks.findIndex(t => t.id === id);
  const isFirst = taskIndex === 0;
  const isLast = taskIndex === workflow.tasks.length - 1;

  return (
    <div
      className={`custom-task-node ${selected ? 'selected' : ''}`}
      style={{ opacity: hasSkipCondition ? 0.72 : 1 }}
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
          {Boolean(data.condition) && (
            <span 
              className="node-badge badge-condition" 
              title={t('tasks.activation_condition')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbbf24', color: '#8b4f06', padding: 0 }}
            >
              <IconCondition size={11} />
            </span>
          )}
          {Boolean(data.skipCondition) && (
            <span 
              className="node-badge badge-condition" 
              title={t('tasks.skip_condition')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', color: '#ffffff', padding: 0 }}
            >
              <IconSkip size={10} />
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
          approversList && approversList.length > 0 ? (
            <div className="node-detail">
              <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <IconUsers size={12} style={{ color: 'var(--primary)' }} />
              </span>
              <span className="node-text" title={approversList.join(', ')}>
                {approversList.length} {t('tasks.approver_count', { count: approversList.length })}
              </span>
            </div>
          ) : (
            <div className="node-detail empty">
              <span className="node-text">{t('tasks.no_approvers')}</span>
            </div>
          )
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
