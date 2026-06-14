import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import type { FormQuestion, TaskCondition, Task, NotificationSettings, TaskFlowCondition, ConditionRule } from '../../../../types/workflow.types';
import { IconCondition, IconSkip, IconDelete, IconLock, IconUserOverwrite } from '../../../../components/ui/Icons';
import { ApproversTab } from './components/ApproversTab';
import { FormsTab } from './components/FormsTab';
import { DUMMY_USERS } from '../../../../utils/constants';
import './TaskEditor.css';

// Helpers for user parsing and avatar colors
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
const isValidMove = (tasks: Task[], fromIndex: number, toIndex: number): boolean => {
  if (fromIndex === 0 || toIndex === 0) return false;
  if (fromIndex < 0 || fromIndex >= tasks.length || toIndex < 0 || toIndex >= tasks.length) return false;

  const proposed = [...tasks];
  const [movedTask] = proposed.splice(fromIndex, 1);
  proposed.splice(toIndex, 0, movedTask);

  for (let i = 0; i < proposed.length; i++) {
    const task = proposed[i];
    
    // Check activation condition dependency
    if (task.condition?.dependentTaskId) {
      const depIdx = proposed.findIndex(t => t.id === task.condition?.dependentTaskId);
      if (depIdx === -1 || i <= depIdx) {
        return false;
      }
    }
    
    // Check skip condition dependency
    if (task.skipCondition?.dependentTaskId) {
      const depIdx = proposed.findIndex(t => t.id === task.skipCondition?.dependentTaskId);
      if (depIdx === -1 || i <= depIdx) {
        return false;
      }
    }
  }
  return true;
};

export const TaskEditor = () => {
  const { t } = useTranslation();
  const { workflow, selectedTaskId, setSelectedTask, updateTask, deleteTask, reorderTask, addTask, updateWorkflow } = useWorkflowStore();
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [conditionPickerTarget, setConditionPickerTarget] = useState<'condition' | 'skipCondition' | null>(null);
  const [conditionSearchQuery, setConditionSearchQuery] = useState('');
  const [expandedConditions, setExpandedConditions] = useState<Record<string, boolean>>({});
  const [forcedApproverSearch, setForcedApproverSearch] = useState<Record<string, string>>({});
  const [focusedForcedApproverConditionId, setFocusedForcedApproverConditionId] = useState<string | null>(null);

  const performReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === 0 || toIndex === 0 || fromIndex === toIndex) return;
    if (!isValidMove(workflow.tasks, fromIndex, toIndex)) return;

    const reorderedTasks = [...workflow.tasks];
    const [draggedTask] = reorderedTasks.splice(fromIndex, 1);
    reorderedTasks.splice(toIndex, 0, draggedTask);

    const updatedTasks = reorderedTasks.map((t, idx) => ({
      ...t,
      order: idx + 1,
      ui_metadata: {
        x: 250,
        y: idx * 150 + 50,
      },
    }));

    updateWorkflow({
      ...workflow,
      tasks: updatedTasks,
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggingIndex(index);
    setHoverIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggingIndex === null || index === 0) return;
    if (isValidMove(workflow.tasks, draggingIndex, index)) {
      e.preventDefault();
      if (hoverIndex !== index) {
        setHoverIndex(index);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setHoverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const dragIdx = draggingIndex;
    setDraggingIndex(null);
    setHoverIndex(null);
    
    if (dragIdx !== null) {
      performReorder(dragIdx, dropIndex);
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    if (draggingIndex === null || hoverIndex === null) return;
    if (isValidMove(workflow.tasks, draggingIndex, hoverIndex)) {
      e.preventDefault();
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragIdx = draggingIndex;
    const hoverIdx = hoverIndex;
    setDraggingIndex(null);
    setHoverIndex(null);
    
    if (dragIdx !== null && hoverIdx !== null) {
      performReorder(dragIdx, hoverIdx);
    }
  };

  const selectedTask = workflow.tasks.find((t) => t.id === selectedTaskId);
  const selectedIndex = workflow.tasks.findIndex((t) => t.id === selectedTaskId);
  const forms = workflow.forms || [];



  const previousTasks = selectedIndex > 0 ? workflow.tasks.slice(0, selectedIndex) : [];
  const availableQuestions: { 
    taskId: string; 
    taskName: string; 
    taskNumber: number; 
    formId: string; 
    formTitle: string; 
    formNumber: number; 
    question: FormQuestion; 
    questionNumber: string; 
  }[] = [];

  previousTasks.forEach(task => {
    const taskIndex = workflow.tasks.findIndex(t => t.id === task.id) + 1;
    (task.formIds || []).forEach((formId, fIdx) => {
      const form = forms.find(f => f.id === formId);
      if (form) {
        form.questions.forEach((q, qIdx) => {
          availableQuestions.push({
            taskId: task.id,
            taskName: task.name,
            taskNumber: taskIndex,
            formId: form.id,
            formTitle: form.title,
            formNumber: fIdx + 1,
            question: q,
            questionNumber: q.displayNumber || String(qIdx + 1)
          });
        });
      }
    });
  });
  const groupedQuestions = useMemo(() => {
    const tasksMap = new Map<string, {
      taskId: string;
      taskName: string;
      taskNumber: number;
      formsMap: Map<string, {
        formId: string;
        formTitle: string;
        formNumber: number;
        questions: { id: string; label: string; questionNumber: string }[];
      }>;
    }>();

    availableQuestions.forEach(item => {
      if (!tasksMap.has(item.taskId)) {
        tasksMap.set(item.taskId, {
          taskId: item.taskId,
          taskName: item.taskName,
          taskNumber: item.taskNumber,
          formsMap: new Map()
        });
      }
      const tNode = tasksMap.get(item.taskId)!;
      if (!tNode.formsMap.has(item.formId)) {
        tNode.formsMap.set(item.formId, {
          formId: item.formId,
          formTitle: item.formTitle,
          formNumber: item.formNumber,
          questions: []
        });
      }
      tNode.formsMap.get(item.formId)!.questions.push({
        id: item.question.id,
        label: item.question.label,
        questionNumber: item.questionNumber
      });
    });

    return Array.from(tasksMap.values()).map(tNode => ({
      ...tNode,
      forms: Array.from(tNode.formsMap.values())
    }));
  }, [availableQuestions]);

  const handleConditionChange = (conditionType: 'condition' | 'skipCondition', field: string, value: string) => {
    if (!selectedTask) return;

    let currentCondition = selectedTask[conditionType] as TaskCondition | undefined;

    if (field === 'question') {
      if (value === '') {
        updateTask(selectedTask.id, { [conditionType]: undefined });
        return;
      }
      const [taskId, formId, questionId] = value.split('|');
      currentCondition = {
        dependentTaskId: taskId,
        formId,
        questionId,
        operator: 'equals',
        value: ''
      };
    } else if (currentCondition) {
      currentCondition = { ...currentCondition, [field]: value };
    }

    updateTask(selectedTask.id, { [conditionType]: currentCondition });
  };

  const handleAddCondition = () => {
    if (!selectedTask) return;
    const newCondition: TaskFlowCondition = {
      id: `cond-${Date.now()}`,
      name: `${t('tasks.condition_count_one')} ${(selectedTask.conditions || []).length + 1}`,
      rules: [
        {
          id: `rule-${Date.now()}-0`,
          connective: 'IF',
          formId: availableQuestions[0]?.formId || '',
          questionId: availableQuestions[0]?.question.id || '',
          operator: 'equals',
          value: ''
        }
      ],
      type: 'skip',
      forcedApproverIds: []
    };

    const currentConditions = selectedTask.conditions || [];
    updateTask(selectedTask.id, {
      conditions: [...currentConditions, newCondition]
    });

    setExpandedConditions(prev => ({ ...prev, [newCondition.id]: true }));
  };

  const handleUpdateCondition = (conditionId: string, updates: Partial<TaskFlowCondition>) => {
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    const updatedConditions = currentConditions.map(cond => {
      if (cond.id === conditionId) {
        return { ...cond, ...updates };
      }
      return cond;
    });
    updateTask(selectedTask.id, { conditions: updatedConditions });
  };

  const handleDeleteCondition = (conditionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    updateTask(selectedTask.id, {
      conditions: currentConditions.filter(cond => cond.id !== conditionId)
    });
  };

  const toggleConditionExpanded = (conditionId: string) => {
    setExpandedConditions(prev => ({
      ...prev,
      [conditionId]: !prev[conditionId]
    }));
  };

  const handleAddRule = (conditionId: string) => {
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    const updatedConditions = currentConditions.map(cond => {
      if (cond.id === conditionId) {
        const newRule: ConditionRule = {
          id: `rule-${Date.now()}-${cond.rules.length}`,
          connective: 'AND',
          formId: availableQuestions[0]?.formId || '',
          questionId: availableQuestions[0]?.question.id || '',
          operator: 'equals',
          value: ''
        };
        return {
          ...cond,
          rules: [...cond.rules, newRule]
        };
      }
      return cond;
    });
    updateTask(selectedTask.id, { conditions: updatedConditions });
  };

  const handleUpdateRule = (conditionId: string, ruleId: string, updates: Partial<ConditionRule>) => {
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    const updatedConditions = currentConditions.map(cond => {
      if (cond.id === conditionId) {
        const updatedRules = cond.rules.map(rule => {
          if (rule.id === ruleId) {
            const newRule = { ...rule, ...updates };
            if (updates.formId) {
              const formQs = availableQuestions.filter(q => q.formId === updates.formId);
              newRule.questionId = formQs[0]?.question.id || '';
              newRule.value = '';
            }
            if (updates.questionId) {
              newRule.value = '';
            }
            return newRule;
          }
          return rule;
        });
        return {
          ...cond,
          rules: updatedRules
        };
      }
      return cond;
    });
    updateTask(selectedTask.id, { conditions: updatedConditions });
  };

  const handleDeleteRule = (conditionId: string, ruleId: string) => {
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    const updatedConditions = currentConditions.map(cond => {
      if (cond.id === conditionId) {
        if (cond.rules.length <= 1) return cond;
        const updatedRules = cond.rules.filter(rule => rule.id !== ruleId);
        if (updatedRules[0]) {
          updatedRules[0].connective = 'IF';
        }
        return {
          ...cond,
          rules: updatedRules
        };
      }
      return cond;
    });
    updateTask(selectedTask.id, { conditions: updatedConditions });
  };

  const handleAddForcedApprover = (conditionId: string, userId: string) => {
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    const updatedConditions = currentConditions.map(cond => {
      if (cond.id === conditionId) {
        const currentApprovers = cond.forcedApproverIds || [];
        if (!currentApprovers.includes(userId)) {
          return {
            ...cond,
            forcedApproverIds: [...currentApprovers, userId]
          };
        }
      }
      return cond;
    });
    updateTask(selectedTask.id, { conditions: updatedConditions });
    setForcedApproverSearch(prev => ({ ...prev, [conditionId]: '' }));
    setFocusedForcedApproverConditionId(null);
  };

  const handleRemoveForcedApprover = (conditionId: string, userId: string) => {
    if (!selectedTask) return;
    const currentConditions = selectedTask.conditions || [];
    const updatedConditions = currentConditions.map(cond => {
      if (cond.id === conditionId) {
        const currentApprovers = cond.forcedApproverIds || [];
        return {
          ...cond,
          forcedApproverIds: currentApprovers.filter(id => id !== userId)
        };
      }
      return cond;
    });
    updateTask(selectedTask.id, { conditions: updatedConditions });
  };


  const isDuplicateTaskName = (name: string, taskId?: string) => {
    return workflow.tasks.some(t => t.id !== taskId && t.name.toLowerCase() === name.toLowerCase().trim());
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask) return;
    const newName = e.target.value;
    setEditingName({ ...editingName, [selectedTask.id]: newName });

    if (!isDuplicateTaskName(newName, selectedTask.id) && newName.trim() !== '') {
      updateTask(selectedTask.id, { name: newName });
    }
  };

  const handleNameBlur = () => {
    if (!selectedTask) return;
    const currentEdit = editingName[selectedTask.id];
    if (currentEdit !== undefined) {
      const newEditing = { ...editingName };
      delete newEditing[selectedTask.id];
      setEditingName(newEditing);
    }
  };



  const updateNotificationSetting = (
    key: keyof NotificationSettings,
    value: boolean | string | string[]
  ) => {
    if (selectedTask) {
      const currentSettings: NotificationSettings = selectedTask.notificationSettings || {
        sendMail: false,
        sendWorkflowToParticipants: false,
        sendOtherUsers: false,
        sendMailReminders: '',
        sendMailOtherParticipants: []
      };
      updateTask(selectedTask.id, {
        notificationSettings: {
          ...currentSettings,
          [key]: value
        } as NotificationSettings
      });
    }
  };



  const taskHasInformation = (task: Task) => {
    const hasApprovers = (task.approverIds || []).length > 0;
    const hasForms = (task.formIds || []).length > 0;
    const hasCondition = !!task.condition;
    const hasSkipCondition = !!task.skipCondition;
    const hasCustomType = task.taskType !== undefined && task.taskType !== 'normal';
    const hasCustomName = task.name.trim() !== '' && task.name.trim() !== t('tasks.new_task').trim() && task.name.trim() !== t('tasks.new_task_default').trim();
    
    return hasApprovers || hasForms || hasCondition || hasSkipCondition || hasCustomType || hasCustomName;
  };

  const handleDeleteTask = () => {
    if (selectedTask) {
      if (taskHasInformation(selectedTask)) {
        setTaskToDelete(selectedTask);
      } else {
        deleteTask(selectedTask.id);
      }
    }
  };

  const handleConfirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  const handleAddNewTask = () => {
    const baseName = t('tasks.new_task');
    let newName = baseName;
    let counter = 1;
    while (isDuplicateTaskName(newName)) {
      newName = `${baseName} ${counter}`;
      counter++;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      name: newName,
      order: workflow.tasks.length + 1,
      ui_metadata: { x: 0, y: 0 }
    };
    addTask(newTask);
  };

  return (
    <div className="panel-container form-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: 'var(--text-md)', letterSpacing: '0.05em', fontWeight: '700' }}>
          {t('tasks.select_step')}
        </h3>
        {showStickyHeader && selectedTask && (
            <div
                className="sticky-task-indicator"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  color: '#ffffff',
                  borderRadius: '10px',
                  borderColor: 'var(--primary)',
                  fontSize: 'var(--text-md)',
                  fontWeight: '600',
                  animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  marginRight: 'auto',
                  marginLeft: 'var(--spacing-md)',
                }}
            >
                  <span style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-light)',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'bold'
                  }}>
                    {selectedTask.order}
                  </span>
              <span style={{
                maxWidth: '320px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-main)',
              }}>
                    {selectedTask.name}
                  </span>
            </div>
        )}
      </div>

      <div 
        className="panel-content padded-content"
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          if (scrollTop > 363) {
            if (!showStickyHeader) setShowStickyHeader(true);
          } else if (showStickyHeader) setShowStickyHeader(false);
        }}
      >
        <div 
          className="step-list-container"
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
        >
          {workflow.tasks.map((task, idx) => {
            const isSelected = selectedTaskId === task.id;
            const numApprovers = (task.approverIds || []).length;
            const numForms = (task.formIds || []).length;
            const numConditions = (task.condition ? 1 : 0) + (task.skipCondition ? 1 : 0);
            
            // Build details string
            const detailsParts: string[] = [];
            
            // Step type name
            let typeLabel = '';
            if (task.taskType === 'system') {
              typeLabel = t('tasks.task_type_system').split('—')[0].trim();
            } else if (task.taskType === 'dynamic') {
              typeLabel = t('tasks.task_type_dynamic').split('—')[0].trim();
            } else if (task.taskType === 'iso') {
              typeLabel = t('tasks.task_type_iso').split('—')[0].trim();
            } else {
              typeLabel = t('tasks.task_type_normal').split('—')[0].trim();
            }
            detailsParts.push(typeLabel);
            
            // Approver count (if normal type)
            if (!task.taskType || task.taskType === 'normal') {
              const appLabel = numApprovers === 1 ? t('tasks.approver_count_one') : t('tasks.approver_count_other');
              detailsParts.push(`${numApprovers} ${appLabel}`);
            }
            
            // Form count
            const formLabel = numForms === 1 ? t('tasks.form_count_one') : t('tasks.form_count_other');
            detailsParts.push(`${numForms} ${formLabel}`);
            
            // Condition count
            if (numConditions > 0) {
              const condLabel = numConditions === 1 ? t('tasks.condition_count_one') : t('tasks.condition_count_other');
              detailsParts.push(`${numConditions} ${condLabel}`);
            }
            
            const detailsStr = detailsParts.join(' · ');
            
            // Check manual mover buttons availability
            const canMoveUp = idx > 1 && isValidMove(workflow.tasks, idx, idx - 1);
            const canMoveDown = idx > 0 && idx < workflow.tasks.length - 1 && isValidMove(workflow.tasks, idx, idx + 1);

            // Calculate CSS transforms for drag displacement animations
            let transformStyle: React.CSSProperties | undefined = undefined;
            if (draggingIndex !== null && hoverIndex !== null && draggingIndex !== hoverIndex) {
              if (idx !== draggingIndex) {
                if (hoverIndex > draggingIndex) {
                  if (idx > draggingIndex && idx <= hoverIndex) {
                    transformStyle = { transform: 'translateY(-58px)' };
                  }
                } else if (hoverIndex < draggingIndex) {
                  if (idx >= hoverIndex && idx < draggingIndex) {
                    transformStyle = { transform: 'translateY(58px)' };
                  }
                }
              }
            }

            return (
              <div 
                key={task.id}
                className={`step-list-item ${isSelected ? 'selected' : ''} ${draggingIndex === idx ? 'dragging' : ''}`}
                style={transformStyle}
                draggable={idx > 0}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedTask(task.id)}
              >
                <div className="step-drag-handle">
                  {idx > 0 ? (
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                      <circle cx="3" cy="3" r="1.5" />
                      <circle cx="3" cy="9" r="1.5" />
                      <circle cx="3" cy="15" r="1.5" />
                      <circle cx="9" cy="3" r="1.5" />
                      <circle cx="9" cy="9" r="1.5" />
                      <circle cx="9" cy="15" r="1.5" />
                    </svg>
                  ) : (
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" style={{ opacity: 0.15 }}>
                      <circle cx="3" cy="3" r="1.5" />
                      <circle cx="3" cy="9" r="1.5" />
                      <circle cx="3" cy="15" r="1.5" />
                      <circle cx="9" cy="3" r="1.5" />
                      <circle cx="9" cy="9" r="1.5" />
                      <circle cx="9" cy="15" r="1.5" />
                    </svg>
                  )}
                </div>
                
                <div className="step-number-circle">
                  {task.order}
                </div>
                
                <div className="step-content-info">
                  <div className="step-name">{task.name}</div>
                  <div className="step-details">{detailsStr}</div>
                </div>
                
                {task.taskType === 'system' ? (
                  <div className="step-system-badge" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'var(--text-muted)',
                    padding: '2px var(--spacing-sm)',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    marginRight: 'var(--spacing-xs)',
                    alignSelf: 'center'
                  }}>
                    <IconLock size={10} style={{ color: 'var(--text-muted)' }} />
                    <span>{t('tasks.system_step_badge')}</span>
                  </div>
                ) : isSelected && (
                  <div className="step-actions-container" onClick={(e) => e.stopPropagation()}>
                    <div className="step-mover-buttons">
                      <button 
                        className="mover-btn up" 
                        disabled={!canMoveUp}
                        onClick={() => reorderTask(task.id, 'up')}
                        title={t('common.up')}
                      >
                        ▲
                      </button>
                      <button 
                        className="mover-btn down" 
                        disabled={!canMoveDown}
                        onClick={() => reorderTask(task.id, 'down')}
                        title={t('common.down')}
                      >
                        ▼
                      </button>
                    </div>
                    <div className="step-actions-divider" />
                    <button 
                      className="step-delete-btn" 
                      disabled={idx === 0}
                      onClick={handleDeleteTask}
                      title={t('tasks.delete_task')}
                    >
                      <IconDelete size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Step Button styled like Add Question */}
          <button className="btn-add-question btn-add-step-list" onClick={handleAddNewTask}>
            <span className="add-icon">+</span>
            <span>{t('tasks.add_step')}</span>
          </button>
        </div>

        {!selectedTask ? (
          <div className="empty-state" style={{ marginTop: 'var(--spacing-xl)' }}>
            <p>{t('tasks.empty_state')}</p>
          </div>
        ) : (
          <div className="editor-form-wrapper" style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="selected-step-header-banner" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="banner-order-circle">{selectedTask.order}</span>
                <span className="banner-step-name">{selectedTask.name}</span>
              </div>
              {selectedTask.taskType === 'system' && (
                <div className="banner-system-badge" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '600',
                  marginRight: 'var(--spacing-sm)'
                }}>
                  <IconLock size={12} style={{ color: '#ffffff' }} />
                  <span>{t('tasks.system_step_badge')}</span>
                </div>
              )}
            </div>

            {selectedTask.taskType === 'system' && (
              <div className="system-step-info-box" style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.5'
              }}>
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', height: '20px' }}>
                  <IconLock size={16} />
                </div>
                <div>
                  {t('tasks.system_step_info')}
                </div>
              </div>
            )}

            <div className="editor-form">
              <div className="editor-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <h4 style={{ margin: 0 }}>{t('tasks.basic_config')}</h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    {/* Indicador de Condiciones */}
                    {selectedTask.condition && (
                        <div title={t('tasks.has_conditions_tooltip', { defaultValue: 'Tiene condiciones de activación' })} style={{
                          display: 'flex',
                          backgroundColor: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#b45309',
                          padding: 'var(--spacing-xs)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          cursor: 'help'
                        }}>
                          <IconCondition size={12} />
                        </div>
                    )}
                    {/* Indicador de Skip */}
                    {selectedTask.skipCondition && (
                      <div title={t('tasks.skip_condition')} style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d97706',
                        padding: 'var(--spacing-xs)',
                        width: '24px',
                        height: '24px',
                        cursor: 'help'
                      }}>
                        <IconSkip size={11} />
                      </div>
                    )}
                  </div>
                </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                <div className="editor-field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{t('tasks.task_name')}</label>
                  <input
                    type="text"
                    className={`form-input ${editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) ? 'error' : ''}`}
                    value={editingName[selectedTask.id] !== undefined ? editingName[selectedTask.id] : selectedTask.name}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    disabled={selectedTask.taskType === 'system'}
                    style={{
                      ...(editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) ? { borderColor: '#ef4444',padding: '9px var(--spacing-md)' } : {padding: '9px var(--spacing-md)'}),
                      ...(selectedTask.taskType === 'system' ? { cursor: 'not-allowed', opacity: 0.6,padding: '9px var(--spacing-md)' } : {padding: '9px var(--spacing-md)'})
                    }}
                  />
                  {editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) && (
                    <span className="error-text" style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                      {t('tasks.duplicate_name_error')}
                    </span>
                  )}
                </div>

                <div className="editor-field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{t('tasks.task_type_label')}</label>
                  <select
                    className="form-input"
                    value={selectedTask.taskType || 'normal'}
                    onChange={(e) => updateTask(selectedTask.id, { taskType: e.target.value as 'normal' | 'dynamic' | 'iso' | 'system' })}
                    disabled={selectedTask.taskType === 'system'}
                    style={{
                      cursor: selectedTask.taskType === 'system' ? 'not-allowed' : 'pointer',
                      opacity: selectedTask.taskType === 'system' ? 0.6 : 1,
                      fontWeight: '600'
                    }}
                  >
                    {selectedTask.taskType === 'system' ? (
                      <option value="system">{t('tasks.task_type_system')}</option>
                    ) : (
                      <>
                        <option value="normal">{t('tasks.task_type_normal')}</option>
                        <option value="dynamic">{t('tasks.task_type_dynamic')}</option>
                        <option value="iso">{t('tasks.task_type_iso')}</option>
                      </>
                    )}
                  </select>
                  {selectedTask.taskType === 'system' && (
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                      {t('tasks.system_step_type_desc')}
                    </span>
                  )}
                </div>
              </div>

              {/* Conditional Approver UI */}
              {selectedTask.taskType !== 'system' && (
                <ApproversTab selectedTask={selectedTask} updateTask={updateTask} />
              )}
            </div>
            
            <FormsTab selectedTask={selectedTask} />

            {/* New Multiple Conditions Section */}
            {selectedIndex > 0 && (
              <div className="editor-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <h4 style={{ margin: 0 }}>{t('tasks.conditions_title', { defaultValue: 'Conditions' })}</h4>
                </div>
                <p className="form-desc" style={{ marginBottom: 'var(--spacing-md)' }}>
                  {t('tasks.conditions_desc', { defaultValue: 'Define rules to skip this task or overwrite its approvers based on previous answers.' })}
                </p>

                <div className="conditions-editor-container">
                  {(selectedTask.conditions || []).map((cond, cIdx) => {
                    const isExpanded = !!expandedConditions[cond.id];
                    const searchInput = forcedApproverSearch[cond.id] || '';
                    const showDropdown = focusedForcedApproverConditionId === cond.id;
                    const filteredForcedUsers = DUMMY_USERS.filter(u =>
                      u.name.toLowerCase().includes(searchInput.toLowerCase()) &&
                      !(cond.forcedApproverIds || []).includes(u.id)
                    );

                    return (
                      <div key={cond.id} className="condition-card">
                        <div className="condition-card-header" onClick={() => toggleConditionExpanded(cond.id)}>
                          <div className="condition-header-title-section">
                            <span className="condition-order-circle">{cIdx + 1}</span>
                            <span className="condition-header-name">{cond.name || `${t('tasks.condition_count_one')} ${cIdx + 1}`}</span>
                            <span className={`condition-badge ${cond.type}`}>
                              {cond.type === 'skip' ? t('tasks.skip_task_opt', { defaultValue: 'Skip' }) : t('tasks.overwrite_approver_opt', { defaultValue: 'Overwrite' })}
                            </span>
                          </div>
                          <div className="condition-card-header-actions" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn-header-action delete-condition"
                              onClick={(e) => handleDeleteCondition(cond.id, e)}
                              title={t('common.delete')}
                            >
                              <IconDelete size={13} />
                            </button>

                          </div>
                        </div>

                        {isExpanded && (
                          <div className="condition-card-body">
                            {/* Condition Name */}
                            <div className="editor-field">
                              <label>{t('tasks.condition_name', { defaultValue: 'Condition Name' })}</label>
                              <input
                                type="text"
                                className="form-input"
                                value={cond.name}
                                onChange={(e) => handleUpdateCondition(cond.id, { name: e.target.value })}
                                style={{ padding: '8px var(--spacing-md)' }}
                              />
                            </div>

                            {/* Rules List */}
                            <div className="rules-list-container">
                              {cond.rules.map((rule, rIdx) => {
                                // Find available forms for selection
                                const uniqueForms = Array.from(
                                  new Map(availableQuestions.map(q => [q.formId, q.formTitle])).entries()
                                );

                                // Get questions for the selected form in this rule
                                const formQuestions = availableQuestions.filter(q => q.formId === rule.formId);

                                return (
                                  <div key={rule.id} className="rule-row">
                                    {/* Connective IF / AND / OR */}
                                    {rIdx === 0 ? (
                                      <span className="connective-badge if">IF</span>
                                    ) : (
                                      <select
                                        className="connective-select-dropdown"
                                        value={rule.connective}
                                        onChange={(e) => handleUpdateRule(cond.id, rule.id, { connective: e.target.value as 'AND' | 'OR' })}
                                      >
                                        <option value="AND">AND</option>
                                        <option value="OR">OR</option>
                                      </select>
                                    )}

                                    {/* Form Select */}
                                    <div className="rule-field">
                                      <select
                                        className="form-input"
                                        value={rule.formId}
                                        onChange={(e) => handleUpdateRule(cond.id, rule.id, { formId: e.target.value })}
                                        style={{ padding: '8px var(--spacing-sm)', fontSize: '12px' }}
                                      >
                                        {uniqueForms.map(([fId, fTitle]) => (
                                          <option key={fId} value={fId}>{fTitle}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Question Select */}
                                    <div className="rule-field">
                                      <select
                                        className="form-input"
                                        value={rule.questionId}
                                        onChange={(e) => handleUpdateRule(cond.id, rule.id, { questionId: e.target.value })}
                                        style={{ padding: '8px var(--spacing-sm)', fontSize: '12px' }}
                                      >
                                        {formQuestions.map(item => (
                                          <option key={item.question.id} value={item.question.id}>
                                            {item.question.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Operator Select */}
                                    <div className="rule-field operator">
                                      <select
                                        className="form-input"
                                        value={rule.operator}
                                        onChange={(e) => handleUpdateRule(cond.id, rule.id, { operator: e.target.value as any })}
                                        style={{ padding: '8px var(--spacing-sm)', fontSize: '12px' }}
                                      >
                                        <option value="equals">=</option>
                                        <option value="not_equals">!=</option>
                                        <option value="contains">contains</option>
                                        {(() => {
                                          const targetQ = availableQuestions.find(q => q.question.id === rule.questionId)?.question;
                                          if (targetQ?.type === 'number') {
                                            return (
                                              <>
                                                <option value="greater_than">&gt;</option>
                                                <option value="less_than">&lt;</option>
                                              </>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </select>
                                    </div>

                                    {/* Value Input */}
                                    <div className="rule-field">
                                      {(() => {
                                        const targetQ = availableQuestions.find(q => q.question.id === rule.questionId)?.question;
                                        if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
                                          return (
                                            <select
                                              className="form-input"
                                              value={rule.value}
                                              onChange={(e) => handleUpdateRule(cond.id, rule.id, { value: e.target.value })}
                                              style={{ padding: '8px var(--spacing-sm)', fontSize: '12px' }}
                                            >
                                              <option value="">{t('common.select_option')}</option>
                                              {targetQ.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          );
                                        }
                                        return (
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={rule.value}
                                            onChange={(e) => handleUpdateRule(cond.id, rule.id, { value: e.target.value })}
                                            placeholder={t('tasks.expected_value')}
                                            style={{ padding: '8px var(--spacing-sm)', fontSize: '12px' }}
                                          />
                                        );
                                      })()}
                                    </div>

                                    {/* Rule Delete Button */}
                                    {cond.rules.length > 1 && (
                                      <button
                                        type="button"
                                        className="rule-delete-btn"
                                        onClick={() => handleDeleteRule(cond.id, rule.id)}
                                        title={t('common.delete')}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Add Rule Button */}
                            <div>
                              <button
                                type="button"
                                className="btn-discreet"
                                onClick={() => handleAddRule(cond.id)}
                                style={{ padding: 'var(--spacing-xs) var(--spacing-md)', fontSize: '12px' }}
                              >
                                {t('tasks.add_rule', { defaultValue: '+ Add Rule' })}
                              </button>
                            </div>

                            {/* IF CONDITION IS MET, THEN */}
                            <div className="editor-field" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t('tasks.if_condition_met', { defaultValue: 'IF CONDITION IS MET, THEN:' })}
                              </label>

                              <div className="action-cards-grid">
                                <div
                                  className={`action-card ${cond.type === 'skip' ? 'selected' : ''}`}
                                  onClick={() => handleUpdateCondition(cond.id, { type: 'skip' })}
                                >
                                  <div className="action-card-radio">
                                    <div className="action-card-radio-inner" />
                                  </div>
                                  <div className="action-card-icon-wrapper skip">
                                    <IconSkip size={14} />
                                  </div>
                                  <div className="action-card-text">
                                    <span className="action-card-title">
                                      {t('tasks.skip_task_opt', { defaultValue: 'Skip' })}
                                    </span>
                                    <span className="action-card-desc">
                                      {t('tasks.skip_task_opt_desc', { defaultValue: 'This step is skipped: flow continues to the next step.' })}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className={`action-card ${cond.type === 'overwrite' ? 'selected' : ''}`}
                                  onClick={() => handleUpdateCondition(cond.id, { type: 'overwrite' })}
                                >
                                  <div className="action-card-radio">
                                    <div className="action-card-radio-inner" />
                                  </div>
                                  <div className="action-card-icon-wrapper overwrite">
                                    <IconUserOverwrite size={14} />
                                  </div>
                                  <div className="action-card-text">
                                    <span className="action-card-title">
                                      {t('tasks.overwrite_approver_opt', { defaultValue: 'Overwrite Approver' })}
                                    </span>
                                    <span className="action-card-desc">
                                      {t('tasks.overwrite_approver_opt_desc', { defaultValue: 'Replace the step\'s approvers with the ones defined below.' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Overwrite Forced Approvers List */}
                            {cond.type === 'overwrite' && (
                              <div className="forced-approvers-container">
                                <div className="forced-approvers-header">
                                  <span>👤</span>
                                  <span>{t('tasks.forced_approvers_title', { defaultValue: 'FORCED APPROVERS FOR THIS CONDITION' })}</span>
                                </div>

                                <div className="approver-search-wrapper">
                                  <span className="search-icon">🔍</span>
                                  <input
                                    type="text"
                                    className="form-input approver-search-input"
                                    placeholder={t('tasks.search_forced_approver_placeholder', { defaultValue: 'Search approver to add...' })}
                                    value={searchInput}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setForcedApproverSearch(prev => ({ ...prev, [cond.id]: val }));
                                      setFocusedForcedApproverConditionId(cond.id);
                                    }}
                                    onFocus={() => setFocusedForcedApproverConditionId(cond.id)}
                                    onBlur={() => setTimeout(() => {
                                      if (focusedForcedApproverConditionId === cond.id) {
                                        setFocusedForcedApproverConditionId(null);
                                      }
                                    }, 200)}
                                    style={{ height: '36px', fontSize: '12px' }}
                                  />
                                  <span className="dropdown-caret">▼</span>

                                  {showDropdown && filteredForcedUsers.length > 0 && (
                                    <div className="approver-search-dropdown" style={{ top: '100%', left: 0, right: 0 }}>
                                      {filteredForcedUsers.map(u => {
                                        const parsed = parseUser(u.name);
                                        const initials = parsed.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                                        return (
                                          <div
                                            key={u.id}
                                            className="approver-dropdown-item"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleAddForcedApprover(cond.id, u.id);
                                            }}
                                          >
                                            <div className="approver-avatar" style={{ background: getRandomColor(u.id), width: '28px', height: '28px', fontSize: '10px' }}>
                                              {initials}
                                            </div>
                                            <div className="approver-info">
                                              <span className="approver-name" style={{ fontSize: '12px' }}>{parsed.name}</span>
                                              {parsed.role && <span className="approver-role" style={{ fontSize: '10px' }}>{parsed.role}</span>}
                                            </div>
                                            <span className="add-plus">+</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                <div className="forced-approver-badges-list">
                                  {(cond.forcedApproverIds || []).map(id => {
                                    const user = DUMMY_USERS.find(u => u.id === id);
                                    if (!user) return null;
                                    const parsed = parseUser(user.name);
                                    const initials = parsed.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                                    return (
                                      <div key={id} className="approver-premium-badge" style={{ padding: '6px 8px', gap: '8px' }}>
                                        <div className="badge-avatar" style={{ background: getRandomColor(id), width: '24px', height: '24px', fontSize: '9px' }}>
                                          {initials}
                                        </div>
                                        <div className="badge-details" style={{ paddingRight: '12px' }}>
                                          <span className="badge-name" style={{ fontSize: '11.5px' }}>{parsed.name}</span>
                                          {parsed.role && <span className="badge-role" style={{ fontSize: '9.5px', marginTop: 0 }}>{parsed.role}</span>}
                                        </div>
                                        <button
                                          type="button"
                                          className="btn-remove-badge"
                                          onClick={() => handleRemoveForcedApprover(cond.id, id)}
                                          title={t('common.delete')}
                                          style={{ width: '16px', height: '16px', fontSize: '12px' }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 'var(--spacing-xs)' }}>
                              {t('tasks.sources_previous_steps', { defaultValue: 'Sources: forms from previous steps' })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="btn-premium-action"
                    onClick={handleAddCondition}
                    style={{ marginTop: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xs)' }}
                  >
                    <span>+</span>
                    <span>{t('tasks.add_condition', { defaultValue: 'Add Condition' })}</span>
                  </button>
                </div>
              </div>
            )}
            {/* Note: Original single condition editor blocks have been moved to the bottom of the file as comments for backwards compatibility */}
            {/* New section: Expiración y Notificaciones */}
            <div className="editor-section">
              <h4>{t('tasks.expiration_and_notifications')}</h4>
              <p className="form-desc" style={{ marginBottom: 'var(--spacing-md)' }}>
                {t('tasks.expiration_and_notifications_desc')}
              </p>

              {/* Expiration Days input */}
              <div className="editor-field" style={{ marginTop: 'var(--spacing-md)' }}>
                <label>{t('tasks.expiration_days_label')}</label>
                <input
                    type="number"
                    className="form-input"
                    min={0}
                    placeholder={t('tasks.expiration_days_placeholder')}
                    value={selectedTask.expirationDays || ''}
                    onChange={(e) => updateTask(selectedTask.id, { expirationDays: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                />
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                  {t('tasks.expiration_days_desc')}
                </span>
              </div>

              {/* Sub-section: Notificaciones por correo */}
              <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--spacing-md)' }}>
                <h5 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', fontWeight: '700' }}>
                  {t('tasks.email_prefs_title')}
                </h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

                  {/* SendMail switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <label className="ios-switch" style={{ width: '40px', height: '22px', flexShrink: 0, display: 'inline-block', position: 'relative' }}>
                      <input
                          type="checkbox"
                          checked={selectedTask.notificationSettings?.sendMail || false}
                          onChange={(e) => updateNotificationSetting('sendMail', e.target.checked)}
                      />
                      <span className="ios-slider"></span>
                    </label>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>
                      {t('tasks.send_mail_label')}
                    </span>
                  </div>

                  {/* SendWorkflowToParticipants switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <label className="ios-switch" style={{ width: '40px', height: '22px', flexShrink: 0, display: 'inline-block', position: 'relative' }}>
                      <input
                          type="checkbox"
                          checked={selectedTask.notificationSettings?.sendWorkflowToParticipants || false}
                          onChange={(e) => updateNotificationSetting('sendWorkflowToParticipants', e.target.checked)}
                      />
                      <span className="ios-slider"></span>
                    </label>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>
                      {t('tasks.send_wf_label')}
                    </span>
                  </div>

                  {/* SendOtherUsers switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <label className="ios-switch" style={{ width: '40px', height: '22px', flexShrink: 0, display: 'inline-block', position: 'relative' }}>
                      <input
                          type="checkbox"
                          checked={selectedTask.notificationSettings?.sendOtherUsers || false}
                          onChange={(e) => updateNotificationSetting('sendOtherUsers', e.target.checked)}
                      />
                      <span className="ios-slider"></span>
                    </label>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>
                      {t('tasks.send_other_label')}
                    </span>
                  </div>

                  {/* Reminders input */}
                  <div className="editor-field" style={{ marginTop: 'var(--spacing-xs)' }}>
                    <label>{t('tasks.reminders_label')}</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('tasks.reminders_placeholder')}
                        value={selectedTask.notificationSettings?.sendMailReminders || ''}
                        onChange={(e) => updateNotificationSetting('sendMailReminders', e.target.value)}
                    />
                  </div>

                  {/* Other participants emails comma separated */}
                  <div className="editor-field">
                    <label>{t('tasks.other_participants_label')}</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('tasks.other_participants_placeholder')}
                        value={selectedTask.notificationSettings?.sendMailOtherParticipants?.join(', ') || ''}
                        onChange={(e) => {
                          const list = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
                          updateNotificationSetting('sendMailOtherParticipants', list);
                        }}
                    />
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>



      {taskToDelete && (
        <div className="modal-overlay" onClick={() => setTaskToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>{t('tasks.delete_task_title')}</h2>
              <button className="btn-close-modal" onClick={() => setTaskToDelete(null)}>
                ×
              </button>
            </div>

            <div className="modal-card-body">
              <p>{t('tasks.delete_task_confirm', { name: taskToDelete.name })}</p>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setTaskToDelete(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleConfirmDeleteTask}
                style={{ backgroundColor: 'var(--danger)' }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}



      {conditionPickerTarget && (
        <div className="modal-overlay" onClick={() => setConditionPickerTarget(null)}>
          <div className="modal-card" style={{ maxWidth: '650px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <h2>
                {conditionPickerTarget === 'condition' 
                  ? t('tasks.configure_condition_title') 
                  : t('tasks.configure_skip_condition_title')
                }
              </h2>
              <button className="btn-close-modal" onClick={() => setConditionPickerTarget(null)}>
                ×
              </button>
            </div>

            <div className="modal-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('tasks.search_questions_placeholder')}
                  value={conditionSearchQuery}
                  onChange={(e) => setConditionSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 'var(--text-sm)' }}>🔍</span>
              </div>

              {/* Reset to empty condition option */}
              <button
                type="button"
                className="form-dropdown-option"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: '8px',
                  border: '1px dashed var(--panel-border)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: 'var(--text-main)',
                  fontWeight: '600',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)'
                }}
                onClick={() => {
                  handleConditionChange(conditionPickerTarget, 'question', '');
                  setConditionPickerTarget(null);
                }}
              >
                <span>✨ {conditionPickerTarget === 'condition' ? t('tasks.always_execute_desc') : t('tasks.never_skip_desc')}</span>
              </button>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                {conditionSearchQuery !== '' ? (
                  // Search view
                  (() => {
                    const query = conditionSearchQuery.toLowerCase().trim();
                    const filtered = availableQuestions.filter(item => 
                      item.question.label.toLowerCase().includes(query) ||
                      item.formTitle.toLowerCase().includes(query) ||
                      item.taskName.toLowerCase().includes(query)
                    );

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>
                          {t('tasks.no_questions_matching')}
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {filtered.map(item => (
                          <div
                            key={`search-${item.taskId}-${item.formId}-${item.question.id}`}
                            className="form-summary-card"
                            style={{
                              padding: 'var(--spacing-md) var(--spacing-md)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 'var(--spacing-sm)'
                            }}
                            onClick={() => {
                              handleConditionChange(conditionPickerTarget, 'question', `${item.taskId}|${item.formId}|${item.question.id}`);
                              setConditionPickerTarget(null);
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs)' }}>
                                <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px var(--spacing-xs)', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--primary)' }}>
                                  {t('tasks.task_prefix')}{item.taskNumber}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>{item.taskName}</span>
                                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                                <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px var(--spacing-xs)', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--primary)' }}>
                                  {t('tasks.form_prefix')}{item.formNumber}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>{item.formTitle}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                          <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px var(--spacing-xs)', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--primary)' }}>
                                  {t('tasks.question_prefix')}{item.questionNumber}
                                </span>
                                <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                                  {item.question.label}
                                </span>
                              </div>
                            </div>
                            <span className="option-badge" style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: 'var(--text-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: '4px', flexShrink: 0 }}>
                              {t('tasks.select_question_btn')}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  // Tree view (folders for tasks and forms)
                  groupedQuestions.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>
                      {t('tasks.no_questions_matching')}
                    </div>
                  ) : (
                    groupedQuestions.map(tNode => (
                      <div
                        key={tNode.taskId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '8px',
                          padding: 'var(--spacing-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-sm)'
                        }}
                      >
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--text-sm)', color: 'var(--primary)' }}>
                          <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px var(--spacing-xs)', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
                            {t('tasks.task_prefix')}{tNode.taskNumber}
                          </span>
                          {tNode.taskName}
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-sm)' }}>
                          {tNode.forms.map(fNode => (
                            <div
                              key={fNode.formId}
                              style={{
                                background: 'rgba(255, 255, 255, 0.01)',
                                borderLeft: '3px solid rgba(59, 130, 246, 0.3)',
                                padding: 'var(--spacing-sm) var(--spacing-sm)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--spacing-sm)'
                              }}
                            >
                              <strong style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs)', color: 'var(--primary)' }}>
                                <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px var(--spacing-xs)', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--primary)' }}>
                                  {t('tasks.form_prefix')}{fNode.formNumber}
                                </span>
                                {fNode.formTitle}
                              </strong>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                {fNode.questions.map(qNode => {
                                  const isSelected = (selectedTask && conditionPickerTarget) ? selectedTask[conditionPickerTarget]?.questionId === qNode.id : false;
                                  return (
                                    <div
                                      key={qNode.id}
                                      className={`form-dropdown-option ${isSelected ? 'linked' : ''}`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--spacing-sm) var(--spacing-sm)',
                                        borderRadius: '6px',
                                        border: isSelected ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                        background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                                        cursor: 'pointer',
                                        gap: 'var(--spacing-sm)'
                                      }}
                                      onClick={() => {
                                        handleConditionChange(conditionPickerTarget, 'question', `${tNode.taskId}|${fNode.formId}|${qNode.id}`);
                                        setConditionPickerTarget(null);
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flex: 1, minWidth: 0 }}>
                                        <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px var(--spacing-xs)', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--primary)' }}>
                                          {t('tasks.question_prefix')}{qNode.questionNumber}
                                        </span>
                                        <span style={{ fontSize: 'var(--text-xs)', color: isSelected ? 'var(--primary)' : 'var(--text-main)', wordBreak: 'break-word', flex: 1 }}>
                                          {qNode.label}
                                        </span>
                                      </div>
                                      <span className="option-badge" style={{ fontSize: 'var(--text-xs)', flexShrink: 0, padding: '2px var(--spacing-sm)', borderRadius: '4px', background: isSelected ? 'var(--primary)' : 'var(--panel-border)', color: '#fff' }}>
                                        {isSelected ? '✓' : t('tasks.select_question_btn')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setConditionPickerTarget(null)}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/*
=========================================
OLD SINGLE CONDITION EDITORS FOR BACKWARDS COMPATIBILITY
=========================================

{selectedIndex > 0 && (
  <div className="editor-section">
    <h4>{t('tasks.activation_condition')}</h4>
    <p className="form-desc" style={{ marginBottom: 'var(--spacing-md)' }}>{t('tasks.activation_desc')}</p>

    <div className="editor-field">
      <label>{t('tasks.depends_on')}</label>
      {(() => {
        const activeConditionItem = selectedTask.condition 
          ? availableQuestions.find(item => 
              item.taskId === selectedTask.condition?.dependentTaskId &&
              item.formId === selectedTask.condition?.formId &&
              item.question.id === selectedTask.condition?.questionId
            )
          : null;

        if (selectedTask.condition && activeConditionItem) {
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-md) var(--spacing-md)',
              background: 'var(--bg-dark)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              width: '100%'
            }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('tasks.selected_condition_breadcrumb')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs)' }}>
                <span className="multiselect-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e40af', padding: '2px var(--spacing-sm)', borderRadius: '4px', color: '#1e40af', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#1e40af', padding: '1px var(--spacing-xs)', borderRadius: '3px', fontSize: 'var(--text-xs)', marginRight: '2px', color: '#ffffff' }}>
                    {t('tasks.task_prefix')}{activeConditionItem.taskNumber}
                  </span>
                  {activeConditionItem.taskName}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                <span className="multiselect-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e40af', padding: '2px var(--spacing-sm)', borderRadius: '4px', color: '#1e40af', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#1e40af', padding: '1px var(--spacing-xs)', borderRadius: '3px', fontSize: 'var(--text-xs)', marginRight: '2px', color: '#ffffff' }}>
                    {t('tasks.form_prefix')}{activeConditionItem.formNumber}
                  </span>
                  {activeConditionItem.formTitle}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                <span className="multiselect-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e40af', padding: '2px var(--spacing-sm)', borderRadius: '4px', color: '#1e40af', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#1e40af', padding: '1px var(--spacing-xs)', borderRadius: '3px', fontSize: 'var(--text-xs)', marginRight: '2px', color: '#ffffff' }}>
                    {t('tasks.question_prefix')}{activeConditionItem.questionNumber}
                  </span>
                  {activeConditionItem.question.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                <button
                  type="button"
                  className="btn-premium-action"
                  onClick={() => { setConditionSearchQuery(''); setConditionPickerTarget('condition'); }}
                  style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)', flex: 1 }}
                >
                  {t('tasks.click_to_configure')}
                </button>
                <button
                  type="button"
                  className="form-delete-btn"
                  onClick={() => handleConditionChange('condition', 'question', '')}
                  style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)', flex: 1, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  {t('tasks.clear_condition_btn')}
                </button>
              </div>
            </div>
          );
        }

        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--panel-border)',
            borderRadius: '8px',
            width: '100%',
            gap: 'var(--spacing-sm)'
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', wordBreak: 'break-word', flex: 1 }}>
              🟢 {t('tasks.always_execute_desc') || t('tasks.always_execute')}
            </span>
            <button
              type="button"
              className="btn-premium-action"
              onClick={() => { setConditionSearchQuery(''); setConditionPickerTarget('condition'); }}
              style={{ padding: 'var(--spacing-xs) var(--spacing-md)', fontSize: 'var(--text-xs)', flexShrink: 0 }}
            >
              {t('tasks.click_to_configure')}
            </button>
          </div>
        );
      })()}
    </div>

    {selectedTask.condition && (
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
        <div className="editor-field" style={{ flex: 1, marginBottom: 0 }}>
          <label>{t('tasks.operator')}</label>
          <select
            className="form-input"
            value={selectedTask.condition.operator}
            onChange={(e) => handleConditionChange('condition', 'operator', e.target.value)}
          >
            <option value="equals">{t('forms.operators.equals')}</option>
            <option value="not_equals">{t('forms.operators.not_equals')}</option>
            <option value="contains">{t('forms.operators.contains')}</option>
            {(() => {
              const targetQ = availableQuestions.find(q => q.question.id === selectedTask.condition?.questionId)?.question;
              if (targetQ?.type === 'number') {
                return (
                  <>
                    <option value="greater_than">{t('forms.operators.greater_than')}</option>
                    <option value="less_than">{t('forms.operators.less_than')}</option>
                  </>
                );
              }
              return null;
            })()}
          </select>
        </div>
        <div className="editor-field" style={{ flex: 2, marginBottom: 0 }}>
          <label>{t('tasks.expected_value')}</label>
          {(() => {
            const targetQ = availableQuestions.find(q => q.question.id === selectedTask.condition?.questionId)?.question;
            if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
              return (
                <select
                  className="form-input"
                  value={selectedTask.condition.value}
                  onChange={(e) => handleConditionChange('condition', 'value', e.target.value)}
                >
                  <option value="">{t('common.select_option')}</option>
                  {targetQ.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              );
            }
            return (
              <input
                type="text"
                className="form-input"
                placeholder={t('tasks.expected_value')}
                value={selectedTask.condition.value}
                onChange={(e) => handleConditionChange('condition', 'value', e.target.value)}
              />
            );
          })()}
        </div>
      </div>
    )}
  </div>
)}

{selectedIndex > 0 && (
  <div className="editor-section">
    <h4>{t('tasks.skip_condition')}</h4>
    <p className="form-desc" style={{ marginBottom: 'var(--spacing-md)' }}>{t('tasks.skip_desc')}</p>

    <div className="editor-field">
      <label>{t('tasks.skip_depends_on')}</label>
      {(() => {
        const activeSkipConditionItem = selectedTask.skipCondition 
          ? availableQuestions.find(item => 
              item.taskId === selectedTask.skipCondition?.dependentTaskId &&
              item.formId === selectedTask.skipCondition?.formId &&
              item.question.id === selectedTask.skipCondition?.questionId
            )
          : null;

        if (selectedTask.skipCondition && activeSkipConditionItem) {
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-md) var(--spacing-md)',
              background: 'var(--bg-dark)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              width: '100%'
            }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('tasks.selected_condition_breadcrumb')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs)' }}>
                <span className="multiselect-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e40af', padding: '2px var(--spacing-sm)', borderRadius: '4px', color: '#1e40af', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#1e40af', padding: '1px var(--spacing-xs)', borderRadius: '3px', fontSize: 'var(--text-xs)', marginRight: '2px', color: '#ffffff' }}>
                    {t('tasks.task_prefix')}{activeSkipConditionItem.taskNumber}
                  </span>
                  {activeSkipConditionItem.taskName}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                <span className="multiselect-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e40af', padding: '2px var(--spacing-sm)', borderRadius: '4px', color: '#1e40af', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#1e40af', padding: '1px var(--spacing-xs)', borderRadius: '3px', fontSize: 'var(--text-xs)', marginRight: '2px', color: '#ffffff' }}>
                    {t('tasks.form_prefix')}{activeSkipConditionItem.formNumber}
                  </span>
                  {activeSkipConditionItem.formTitle}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                <span className="multiselect-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e40af', padding: '2px var(--spacing-sm)', borderRadius: '4px', color: '#1e40af', fontWeight: '600' }}>
                  <span style={{ backgroundColor: '#1e40af', padding: '1px var(--spacing-xs)', borderRadius: '3px', fontSize: 'var(--text-xs)', marginRight: '2px', color: '#ffffff' }}>
                    {t('tasks.question_prefix')}{activeSkipConditionItem.questionNumber}
                  </span>
                  {activeSkipConditionItem.question.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                <button
                  type="button"
                  className="btn-premium-action"
                  onClick={() => { setConditionSearchQuery(''); setConditionPickerTarget('skipCondition'); }}
                  style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)', flex: 1 }}
                >
                  {t('tasks.click_to_configure')}
                </button>
                <button
                  type="button"
                  className="form-delete-btn"
                  onClick={() => handleConditionChange('skipCondition', 'question', '')}
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--text-xs)', flex: 1, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  {t('tasks.clear_condition_btn')}
                </button>
              </div>
            </div>
          );
        }

        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--panel-border)',
            borderRadius: '8px',
            width: '100%',
            gap: 'var(--spacing-sm)'
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', wordBreak: 'break-word', flex: 1 }}>
              🟢 {t('tasks.never_skip_desc') || t('tasks.never_skip')}
            </span>
            <button
              type="button"
              className="btn-premium-action"
              onClick={() => { setConditionSearchQuery(''); setConditionPickerTarget('skipCondition'); }}
              style={{ padding: 'var(--spacing-xs) var(--spacing-md)', fontSize: 'var(--text-xs)', flexShrink: 0 }}
            >
              {t('tasks.click_to_configure')}
            </button>
          </div>
        );
      })()}
    </div>

    {selectedTask.skipCondition && (
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
        <div className="editor-field" style={{ flex: 1, marginBottom: 0 }}>
          <label>{t('tasks.operator')}</label>
          <select
            className="form-input"
            value={selectedTask.skipCondition.operator}
            onChange={(e) => handleConditionChange('skipCondition', 'operator', e.target.value)}
          >
            <option value="equals">{t('forms.operators.equals')}</option>
            <option value="not_equals">{t('forms.operators.not_equals')}</option>
            <option value="contains">{t('forms.operators.contains')}</option>
            {(() => {
              const targetQ = availableQuestions.find(q => q.question.id === selectedTask.skipCondition?.questionId)?.question;
              if (targetQ && targetQ.type === 'number') {
                return (
                  <>
                    <option value="greater_than">{t('forms.operators.greater_than')}</option>
                    <option value="less_than">{t('forms.operators.less_than')}</option>
                  </>
                );
              }
              return null;
            })()}
          </select>
        </div>
        <div className="editor-field" style={{ flex: 2, marginBottom: 0 }}>
          <label>{t('tasks.expected_value')}</label>
          {(() => {
            const targetQ = availableQuestions.find(q => q.question.id === selectedTask.skipCondition?.questionId)?.question;
            if (targetQ && (targetQ.type === 'dropdown' || targetQ.type === 'radio') && targetQ.options) {
              return (
                <select
                  className="form-input"
                  value={selectedTask.skipCondition.value}
                  onChange={(e) => handleConditionChange('skipCondition', 'value', e.target.value)}
                >
                  <option value="">{t('common.select_option')}</option>
                  {targetQ.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              );
            }
            return (
              <input
                type="text"
                className="form-input"
                placeholder={t('tasks.expected_value')}
                value={selectedTask.skipCondition.value}
                onChange={(e) => handleConditionChange('skipCondition', 'value', e.target.value)}
              />
            );
          })()}
        </div>
      </div>
    )}
  </div>
)}
*/
