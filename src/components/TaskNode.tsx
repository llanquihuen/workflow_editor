import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../store/useWorkflowStore';

export const TaskNode = ({ id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const { workflow, updateTask, reorderTask, deleteTask } = useWorkflowStore();
  
  const [localName, setLocalName] = useState(String(data.label || ''));

  useEffect(() => {
    setLocalName(String(data.label || ''));
  }, [data.label]);

  const approversList = data.approvers as string[];
  const formTitles = data.formTitles as string[];
  const hasSkipCondition = Boolean(data.skipCondition);
  
  const taskIndex = workflow.tasks.findIndex(t => t.id === id);
  const isFirst = taskIndex === 0;
  const isLast = taskIndex === workflow.tasks.length - 1;

  const isDuplicateTaskName = (name: string, taskId?: string) => {
    return workflow.tasks.some(t => t.id !== taskId && t.name.toLowerCase() === name.toLowerCase().trim());
  };

  const handleNameBlur = () => {
    if (localName.trim() !== data.label) {
      if (isDuplicateTaskName(localName, id) || localName.trim() === '') {
        setLocalName(String(data.label || ''));
      } else {
        updateTask(id, { name: localName.trim() });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

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
        <input 
          type="text" 
          className="node-input nodrag" 
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
        />
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {Boolean(data.condition) && <span className="node-badge badge-condition" title={t('tasks.activation_condition')}>🔀</span>}
          {Boolean(data.skipCondition) && <span className="node-badge badge-condition" title={t('tasks.skip_condition')}>⏭️</span>}
          <div className="node-controls" style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <button 
              className="node-btn" 
              disabled={taskIndex <= 1} 
              onClick={(e) => { e.stopPropagation(); reorderTask(id, 'up'); }}
              title={t('common.up')}
            >
              ⬆️
            </button>
            <button 
              className="node-btn" 
              disabled={isFirst || isLast} 
              onClick={(e) => { e.stopPropagation(); reorderTask(id, 'down'); }}
              title={t('common.down')}
            >
              ⬇️
            </button>
            <button 
              className="node-btn delete" 
              disabled={isFirst} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if(confirm(t('tasks.delete_confirm', { name: localName }))) deleteTask(id); 
              }}
              title={t('common.delete')}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
      
      <div className="node-body">
        {formTitles && formTitles.length > 0 ? (
          <div className="node-detail" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="node-icon">📄</span>
              <span className="node-text" style={{ fontWeight: '600' }}>{t('forms.title')} ({formTitles.length})</span>
            </div>
            {formTitles.map((title, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px', width: '100%' }}>
                <span style={{ fontSize: '9px', backgroundColor: 'var(--panel-border)', padding: '1px 5px', borderRadius: '10px', color: 'var(--text-main)', fontWeight: 'bold' }}>{index + 1}</span>
                <span className="node-text" style={{ fontSize: '10px', opacity: 0.9 }} title={title}>{title}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="node-detail empty">
            <span className="node-text">{t('tasks.no_forms')}</span>
          </div>
        )}
        
        {approversList && approversList.length > 0 ? (
          <div className="node-detail">
            <span className="node-icon">👥</span>
            <span className="node-text" title={approversList.join(', ')}>
              {approversList.length} {t('tasks.approver_count', { count: approversList.length })}
            </span>
          </div>
        ) : (
          <div className="node-detail empty">
            <span className="node-text">{t('tasks.no_approvers')}</span>
          </div>
        )}
      </div>



      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
};
