import { useTranslation } from 'react-i18next';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../store/useWorkflowStore';

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
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </span>
          )}
          {Boolean(data.skipCondition) && (
            <span 
              className="node-badge badge-condition" 
              title={t('tasks.skip_condition')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', color: '#ffffff', padding: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button 
              className="node-btn" 
              disabled={isFirst || isLast} 
              onClick={(e) => { e.stopPropagation(); reorderTask(id, 'down'); }}
              title={t('common.down')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="node-body">
        {formTitles && formTitles.length > 0 ? (
          <div className="node-detail" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
              </svg>
            </span>
            <span className="node-text" style={{ color: 'var(--primary)', fontWeight: '700', fontSize: 'var(--text-xs)' }}>
              {t('tasks.task_type_dynamic').split('—')[0].trim()}
            </span>
          </div>
        ) : (
          <div className="node-detail font-bold" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '6px', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>
            <span className="node-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" />
              </svg>
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
