import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { DUMMY_USERS } from '../utils/constants';
import type { FormQuestion, TaskCondition, Task } from '../types/workflow.types';

export const TaskEditorView = () => {
  const { t } = useTranslation();
  const { workflow, selectedTaskId, setSelectedTask, updateTask, deleteTask, reorderTask, addTask, setCurrentView, setSelectedForm } = useWorkflowStore();
  const [approverSearch, setApproverSearch] = useState('');
  const [showApproverDropdown, setShowApproverDropdown] = useState(false);

  const [formSearch, setFormSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-dropdown-container')) {
        setShowTaskDropdown(false);
      }
    };

    if (showTaskDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskDropdown]);

  const selectedTask = workflow.tasks.find((t) => t.id === selectedTaskId);
  const selectedIndex = workflow.tasks.findIndex((t) => t.id === selectedTaskId);
  const forms = workflow.forms || [];

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

  const usedFormIds = useMemo(() => {
    return workflow.tasks.flatMap(t => t.formIds || []);
  }, [workflow.tasks]);

  const previousTasks = selectedIndex > 0 ? workflow.tasks.slice(0, selectedIndex) : [];
  const availableQuestions: { taskId: string, taskName: string, formId: string, formTitle: string, question: FormQuestion }[] = [];

  previousTasks.forEach(task => {
    (task.formIds || []).forEach(formId => {
      const form = forms.find(f => f.id === formId);
      if (form) {
        form.questions.forEach(q => {
          availableQuestions.push({
            taskId: task.id,
            taskName: task.name,
            formId: form.id,
            formTitle: form.title,
            question: q
          });
        });
      }
    });
  });

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

  const handleTaskChange = (taskId: string) => {
    setSelectedTask(taskId === '' ? null : taskId);
    setShowTaskDropdown(false);
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

  const handleAddApprover = (userId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.approverIds || [];
      if (!currentIds.includes(userId)) {
        updateTask(selectedTask.id, { approverIds: [...currentIds, userId] });
      }
      setApproverSearch('');
      setShowApproverDropdown(false);
    }
  };

  const handleRemoveApprover = (userId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.approverIds || [];
      updateTask(selectedTask.id, { approverIds: currentIds.filter(id => id !== userId) });
    }
  };

  const filteredUsers = DUMMY_USERS.filter(u =>
    u.name.toLowerCase().includes(approverSearch.toLowerCase()) &&
    !(selectedTask?.approverIds || []).includes(u.id)
  );

  const handleAddForm = (formId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.formIds || [];
      if (!currentIds.includes(formId)) {
        updateTask(selectedTask.id, { formIds: [...currentIds, formId] });
      }
      setFormSearch('');
      setShowFormModal(false);
    }
  };

  const handleRemoveForm = (formId: string) => {
    if (selectedTask) {
      const currentIds = selectedTask.formIds || [];
      updateTask(selectedTask.id, { formIds: currentIds.filter(id => id !== formId) });
    }
  };

  const handleReorderForm = (formId: string, direction: 'up' | 'down') => {
    if (!selectedTask || !selectedTask.formIds) return;
    const currentIds = [...selectedTask.formIds];
    const index = currentIds.indexOf(formId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = currentIds[index];
      currentIds[index] = currentIds[index - 1];
      currentIds[index - 1] = temp;
    } else if (direction === 'down' && index < currentIds.length - 1) {
      const temp = currentIds[index];
      currentIds[index] = currentIds[index + 1];
      currentIds[index + 1] = temp;
    }

    updateTask(selectedTask.id, { formIds: currentIds });
  };

  // Get forms linked to other tasks in the workflow
  const otherTasksForms = useMemo(() => {
    const map = new Map<string, string>();
    workflow.tasks.forEach(t => {
      if (selectedTask && t.id !== selectedTask.id) {
        (t.formIds || []).forEach(fid => {
          map.set(fid, t.name);
        });
      }
    });
    return map;
  }, [workflow.tasks, selectedTask?.id]);

  const searchTerm = formSearch.toLowerCase().trim();

  // 1. Available forms (not linked to any task)
  const availableForms = useMemo(() => {
    return forms.filter(f => 
      !selectedTask?.formIds?.includes(f.id) && 
      !otherTasksForms.has(f.id) &&
      f.title.toLowerCase().includes(searchTerm)
    );
  }, [forms, selectedTask?.formIds, otherTasksForms, searchTerm]);

  // 2. Forms assigned to other tasks
  const linkedToOtherForms = useMemo(() => {
    return forms.filter(f =>
      otherTasksForms.has(f.id) &&
      f.title.toLowerCase().includes(searchTerm)
    );
  }, [forms, otherTasksForms, searchTerm]);

  // 3. Forms already linked to the current task
  const alreadyLinkedForms = useMemo(() => {
    return forms.filter(f =>
      selectedTask?.formIds?.includes(f.id) &&
      f.title.toLowerCase().includes(searchTerm)
    );
  }, [forms, selectedTask?.formIds, searchTerm]);

  // Total free available forms (without search filter, to check if all are assigned)
  const totalFreeFormsCount = useMemo(() => {
    return forms.filter(f => !usedFormIds.includes(f.id)).length;
  }, [forms, usedFormIds]);

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
    let baseName = t('tasks.new_task');
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
      <style>{`
        .forms-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(30, 41, 59, 0.96);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          margin-top: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          z-index: 50;
          max-height: 300px;
          overflow-y: auto;
          padding: 8px;
        }
        .light-theme .forms-dropdown-menu {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .dropdown-category-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--text-muted);
          padding: 8px 10px 4px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          margin-bottom: 4px;
          margin-top: 8px;
        }
        .light-theme .dropdown-category-title {
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }
        .dropdown-category-title:first-of-type {
          margin-top: 0;
        }
        .form-dropdown-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 2px;
          color: var(--text-main);
        }
        .form-dropdown-option.available:hover {
          background: rgba(59, 130, 246, 0.12);
          color: var(--primary);
        }
        .form-dropdown-option.linked {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .form-dropdown-option.assigned-other {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-dropdown-option.assigned-other:hover {
          background: rgba(245, 158, 11, 0.05);
        }
        .option-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .option-badge.available {
          background: rgba(34, 197, 94, 0.12);
          color: #4ade80;
        }
        .option-badge.linked {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
        }
        .option-badge.assigned-other {
          background: rgba(245, 158, 11, 0.32);
          color: #765500;
        }
        .dropdown-info-card {
          background: rgba(59, 130, 246, 0.05);
          border: 1px dashed rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 12px;
          color: var(--text-main);
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          text-align: center;
          margin: 8px 4px;
        }
        .dropdown-info-card.warning {
          background: rgba(245, 158, 11, 0.04);
          border: 1px dashed rgba(245, 158, 11, 0.2);
        }

        /* 📋 Associated Forms Summary Styles */
        .associated-forms-summary {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
          animation: fadeIn 0.3s ease;
        }
        .no-linked-forms-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.12);
          color: var(--text-muted);
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .light-theme .no-linked-forms-banner {
          background: rgba(0, 0, 0, 0.02);
          border: 1px dashed rgba(0, 0, 0, 0.12);
        }
        .summary-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-summary-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .form-summary-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
        }
        .light-theme .form-summary-card {
          background: rgba(0, 0, 0, 0.015);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }
        .light-theme .form-summary-card:hover {
          background: rgba(255, 255, 255, 1);
          border-color: rgba(59, 130, 246, 0.35);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02);
        }
        .summary-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .summary-card-title-group {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
        }
        .summary-card-icon {
          font-size: 1.3rem;
          padding: 6px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 8px;
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
        }
        .summary-card-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.3;
        }
        .summary-card-desc {
          margin: 4px 0 0 0;
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .btn-unlink-form {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .btn-unlink-form:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.15);
          color: var(--danger);
          transform: rotate(90deg);
        }
        .summary-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }
        .summary-card-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .summary-card-badge.questions {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }
        .light-theme .summary-card-badge.questions {
          background: rgba(59, 130, 246, 0.06);
          color: #1d4ed8;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        .summary-card-badge.required {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .light-theme .summary-card-badge.required {
          background: rgba(245, 158, 11, 0.06);
          color: #b45309;
          border: 1px solid rgba(245, 158, 11, 0.1);
        }
        .summary-card-badge.sensitive {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .light-theme .summary-card-badge.sensitive {
          background: rgba(239, 68, 68, 0.06);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }
        .summary-card-preview {
          margin-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .light-theme .summary-card-preview {
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        .preview-label {
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .preview-questions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .preview-question-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-main);
        }
        .preview-question-num {
          font-weight: 600;
          color: var(--text-muted);
          font-size: 11px;
          min-width: 14px;
        }
        .preview-question-text {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0.85;
        }
        .preview-question-type {
          font-size: 8.5px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted);
          padding: 1.5px 5px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .light-theme .preview-question-type {
          background: rgba(0, 0, 0, 0.04);
        }
        .preview-question-more {
          font-size: 11px;
          color: var(--text-muted);
          font-style: italic;
          margin-left: 22px;
          margin-top: 2px;
        }

        /* Modal Overlay Clear (Without Backdrop Blur) */
        .modal-overlay-clear {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.25s ease-out;
        }
        .modal-overlay-clear .modal-card {
          background-color: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .light-theme .modal-overlay-clear .modal-card {
          background-color: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* --- Premium Approver Selector Styles --- */
        .approver-search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .approver-search-wrapper .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
          font-size: 14px;
        }
        .approver-search-wrapper .dropdown-caret {
          position: absolute;
          right: 14px;
          color: var(--text-muted);
          pointer-events: none;
          font-size: 10px;
          transition: transform 0.2s ease;
        }
        .approver-search-input {
          padding-left: 38px !important;
          padding-right: 34px !important;
          width: 100%;
          height: 42px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid var(--panel-border);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .light-theme .approver-search-input {
          background: rgba(255, 255, 255, 0.8);
        }
        .approver-search-input:focus {
          border-color: var(--primary);
          background: rgba(30, 41, 59, 0.6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .light-theme .approver-search-input:focus {
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }
        .approver-search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(30, 41, 59, 0.96);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          margin-top: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          z-index: 99;
          max-height: 250px;
          overflow-y: auto;
          padding: 6px;
        }
        .light-theme .approver-search-dropdown {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        }
        .approver-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text-main);
        }
        .approver-dropdown-item:hover {
          background: rgba(59, 130, 246, 0.12);
          color: var(--primary);
        }
        .approver-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: white;
          font-weight: 700;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .approver-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .approver-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .approver-role {
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .add-plus {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-muted);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .approver-dropdown-item:hover .add-plus {
          opacity: 1;
          color: var(--primary);
        }

        /* --- Assigned Approvers Grid --- */
        .assigned-approvers-list {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .assigned-approvers-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .approvers-count {
          background: rgba(59, 130, 246, 0.1);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 700;
        }
        .no-approvers-alert {
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: var(--text-muted);
          font-size: 12.5px;
          text-align: center;
        }
        .light-theme .no-approvers-alert {
          background: rgba(0, 0, 0, 0.01);
          border: 1px dashed rgba(0, 0, 0, 0.08);
        }
        .approver-badges-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .approver-premium-badge {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .approver-premium-badge:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .light-theme .approver-premium-badge {
          background: rgba(0, 0, 0, 0.015);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }
        .light-theme .approver-premium-badge:hover {
          background: #ffffff;
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
        }
        .badge-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: white;
          font-weight: 700;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .badge-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          padding-right: 14px;
        }
        .badge-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .badge-role {
          font-size: 10px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }
        .btn-remove-badge {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .btn-remove-badge:hover {
          background: rgba(239, 68, 68, 0.08);
          color: var(--danger);
        }

        /* --- Premium Notice Cards --- */
        .approvers-dynamic-notice,
        .approvers-iso-notice {
          display: flex;
          gap: 12px;
          padding: 14px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.03);
          border: 1px solid rgba(59, 130, 246, 0.12);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
          animation: fadeIn 0.25s ease-out;
        }
        .approvers-iso-notice {
          background: rgba(16, 185, 129, 0.03);
          border-color: rgba(16, 185, 129, 0.12);
        }
        .notice-icon {
          font-size: 1.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: rgba(59, 130, 246, 0.08);
          border-radius: 8px;
          color: var(--primary);
          flex-shrink: 0;
        }
        .approvers-iso-notice .notice-icon {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
        }
        .notice-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .notice-content h5 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }
        .notice-content p {
          margin: 0;
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.45;
        }
      `}</style>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>{t('tasks.editor_title')}</h3>
          {selectedTask && showStickyHeader && (
            <div 
              className="sticky-task-indicator"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: 'var(--primary)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '600',
                animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
                marginLeft: '8px'
              }}
            >
              <span style={{ 
                background: 'var(--primary)', 
                color: 'white', 
                borderRadius: '50%', 
                width: '18px', 
                height: '18px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 'bold'
              }}>
                {selectedTask.order}
              </span>
              <span style={{ 
                maxWidth: '120px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}>
                {selectedTask.name}
              </span>
            </div>
          )}
        </div>
        <button className="btn-premium-action" onClick={handleAddNewTask}>{t('tasks.add_task')}</button>
      </div>

      <div 
        className="panel-content padded-content"
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          if (scrollTop > 80) {
            if (!showStickyHeader) setShowStickyHeader(true);
          } else {
            if (showStickyHeader) setShowStickyHeader(false);
          }
        }}
      >
        <div className="task-selector">
          <label>{t('tasks.select_task')}</label>
          <div className="custom-dropdown-container">
            <button 
              className={`custom-dropdown-trigger ${!selectedTask ? 'placeholder' : ''}`}
              onClick={() => setShowTaskDropdown(!showTaskDropdown)}
            >
              <div className="trigger-content">
                {selectedTask ? (
                  <>
                    <span className="task-order-badge">{selectedTask.order}</span>
                    <span className="task-name-text">{selectedTask.name}</span>
                  </>
                ) : (
                  <span className="placeholder-text">{t('tasks.select_task_placeholder')}</span>
                )}
              </div>
              <span className={`dropdown-arrow ${showTaskDropdown ? 'open' : ''}`}>▼</span>
            </button>

            {showTaskDropdown && (
              <div className="custom-dropdown-menu">
                <div 
                  className={`dropdown-item ${!selectedTaskId ? 'selected' : ''}`}
                  onClick={() => handleTaskChange('')}
                >
                  <span className="placeholder-text">{t('tasks.select_task_placeholder')}</span>
                </div>
                {workflow.tasks.map(t => (
                  <div 
                    key={t.id} 
                    className={`dropdown-item ${selectedTaskId === t.id ? 'selected' : ''}`}
                    onClick={() => handleTaskChange(t.id)}
                  >
                    <span className="task-order-badge">{t.order}</span>
                    <span className="task-name-text">{t.name}</span>
                    {selectedTaskId === t.id && <span className="selected-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!selectedTask ? (
          <div className="empty-state" style={{ marginTop: '20px' }}>
            <p>{t('tasks.empty_state')}</p>
          </div>
        ) : (
          <div className="editor-form">

            <div className="editor-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>{t('tasks.basic_config')}</h4>



                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Indicador de Condiciones */}
                  {selectedTask.condition ? (
                      <div title={t('tasks.has_conditions_tooltip', { defaultValue: 'Tiene condiciones de activación' })} style={{
                        display: 'flex',
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#b45309',
                        padding: '4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        cursor: 'help'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 3 21 3 21 8" />
                          <line x1="4" y1="20" x2="21" y2="3" />
                          <polyline points="21 16 21 21 16 21" />
                          <line x1="15" y1="15" x2="21" y2="21" />
                          <line x1="4" y1="4" x2="9" y2="9" />
                        </svg>
                      </div>
                  ) : (
                      <div></div>
                  )}
                  {/* Indicador de Skip */}
                  {selectedTask.skipCondition ? (
                    <div title={t('tasks.skip_condition')} style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#d97706',
                      padding: '4px',
                      width: '24px',
                      height: '24px',
                      cursor: 'help'
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                        <line x1="19" y1="5" x2="19" y2="19" />
                      </svg>
                    </div>
                  ) : (
                    <div></div>
                  )}
                  {/* Control del Orden del Paso */}
                  <div className="step-order-badge" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--primary)',
                    fontWeight: '600'
                  }}>
                    <span style={{ fontWeight: '700' }}>Reorder tasks</span>
                    <span>#{selectedTask.order}</span>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                      <button
                        disabled={selectedIndex <= 1}
                        onClick={() => reorderTask(selectedTask.id, 'up')}
                        title={t('common.up')}
                        style={{
                          background: selectedIndex <= 1 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.16)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          cursor: selectedIndex <= 1 ? 'not-allowed' : 'pointer',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          opacity: selectedIndex <= 1 ? 0.3 : 1,
                          color: 'var(--primary)',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700'
                        }}
                      >
                        ▲
                      </button>
                      <button
                        disabled={selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1}
                        onClick={() => reorderTask(selectedTask.id, 'down')}
                        title={t('common.down')}
                        style={{
                          background: (selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1)
                            ? 'rgba(59, 130, 246, 0.08)'
                            : 'rgba(59, 130, 246, 0.16)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          cursor: (selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1) ? 'not-allowed' : 'pointer',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          opacity: (selectedIndex === 0 || selectedIndex >= workflow.tasks.length - 1) ? 0.3 : 1,
                          color: 'var(--primary)',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700'
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  {/* Botón de Borrar Tarea */}
                  {selectedIndex > 0 && (
                    <button
                      onClick={handleDeleteTask}
                      title={t('tasks.delete_task')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        padding: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="editor-field">
                <label>{t('tasks.task_name')}</label>
                <input
                  type="text"
                  className={`form-input ${editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) ? 'error' : ''}`}
                  value={editingName[selectedTask.id] !== undefined ? editingName[selectedTask.id] : selectedTask.name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  style={editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) ? { borderColor: '#ef4444' } : {}}
                />
                {editingName[selectedTask.id] !== undefined && isDuplicateTaskName(editingName[selectedTask.id], selectedTask.id) && (
                  <span className="error-text" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {t('tasks.duplicate_name_error')}
                  </span>
                )}
              </div>
              <div className="editor-field">
                <label>{t('tasks.task_type_label')}</label>
                <select
                  className="form-input"
                  value={selectedTask.taskType || 'normal'}
                  onChange={(e) => updateTask(selectedTask.id, { taskType: e.target.value as any })}
                  style={{
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <option value="normal">{t('tasks.task_type_normal')}</option>
                  <option value="dynamic">{t('tasks.task_type_dynamic')}</option>
                  <option value="iso">{t('tasks.task_type_iso')}</option>
                </select>
              </div>

              {/* Conditional Approver UI */}
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
                </div>
              ) : selectedTask.taskType === 'dynamic' ? (
                <div className="editor-field" style={{ marginTop: '16px' }}>
                  <div className="approvers-dynamic-notice">
                    <div className="notice-icon">⚡</div>
                    <div className="notice-content">
                      <h5>{t('tasks.task_type_dynamic').split('—')[0].trim()}</h5>
                      <p>{t('tasks.dynamic_approvers_placeholder')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="editor-field" style={{ marginTop: '16px' }}>
                  <div className="approvers-iso-notice">
                    <div className="notice-icon">🛡️</div>
                    <div className="notice-content">
                      <h5>{t('tasks.task_type_iso').split('—')[0].trim()}</h5>
                      <p>{t('tasks.iso_approvers_placeholder')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="editor-section">
              <h4>{t('tasks.linked_forms')}</h4>
              <p className="form-desc" style={{ marginBottom: '10px' }}>{t('tasks.select_global_forms')}</p>

              {/* 📋 Associated Forms Summary */}
              <div className="associated-forms-summary">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <h5 style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('tasks.linked_forms_summary_title')}
                  </h5>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {(selectedTask.formIds || []).length} {t('tasks.linked_forms').toLowerCase()}
                  </span>
                </div>

                {(!selectedTask.formIds || selectedTask.formIds.length === 0) ? (
                  <div className="no-linked-forms-banner">
                    <span style={{ fontSize: '1.25rem' }}>📋</span>
                    <span>{t('tasks.no_linked_forms_yet')}</span>
                  </div>
                ) : (
                  <div className="summary-cards-stack">
                    {selectedTask.formIds.map((id, idx) => {
                      const form = forms.find(f => f.id === id);
                      if (!form) return null;

                      const questionCount = form.questions.length;

                      return (
                        <div 
                          key={id} 
                          className="form-summary-card" 
                          style={{ padding: '12px 14px', cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedForm(form.id);
                            setCurrentView('forms');
                          }}
                          title={t('tasks.click_to_edit_form')}
                        >
                          <div className="summary-card-header" style={{ marginBottom: 0, alignItems: 'center' }}>
                            <div className="summary-card-title-group" style={{ minWidth: 0, flex: 1, gap: '10px' }}>
                              <span className="summary-card-icon" style={{ flexShrink: 0 }}>📄</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h4 className="summary-card-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0px' }}>{form.title}</h4>
                                {form.description ? (
                                  <p className="summary-card-desc" style={{ marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.description}</p>
                                ) : null}
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'inline-block', marginTop: '4px' }}>
                                  {questionCount} {questionCount === 1 ? t('tasks.questions_count_label') : t('tasks.questions_count_label_plural')}
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                              {/* Up Button */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleReorderForm(form.id, 'up')}
                                title={t('common.up')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: idx === 0 ? 'var(--text-muted)' : 'var(--primary)',
                                  opacity: idx === 0 ? 0.25 : 0.8,
                                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => { if (idx > 0) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                ▲
                              </button>
                              
                              {/* Down Button */}
                              <button
                                type="button"
                                disabled={idx === (selectedTask.formIds || []).length - 1}
                                onClick={() => handleReorderForm(form.id, 'down')}
                                title={t('common.down')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: idx === (selectedTask.formIds || []).length - 1 ? 'var(--text-muted)' : 'var(--primary)',
                                  opacity: idx === (selectedTask.formIds || []).length - 1 ? 0.25 : 0.8,
                                  cursor: idx === (selectedTask.formIds || []).length - 1 ? 'not-allowed' : 'pointer',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => { if (idx < (selectedTask.formIds || []).length - 1) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                ▼
                              </button>

                              {/* Separator line */}
                              <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.08)', margin: '0 2px' }}></span>

                              {/* Unlink Button */}
                              <button 
                                type="button" 
                                className="btn-unlink-form" 
                                onClick={() => handleRemoveForm(form.id)}
                                title={t('tasks.linked_forms_unlink_tooltip')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn-premium-action"
                  style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => { setFormSearch(''); setShowFormModal(true); }}
                >
                  📄 {t('tasks.link_forms_button')}
                </button>
              </div>
            </div>

            {selectedIndex > 0 && (
              <div className="editor-section">
                <h4>{t('tasks.activation_condition')}</h4>
                <p className="form-desc" style={{ marginBottom: '15px' }}>{t('tasks.activation_desc')}</p>

                <div className="editor-field">
                  <label>{t('tasks.depends_on')}</label>
                  <select
                    className="form-input"
                    value={selectedTask.condition ? `${selectedTask.condition.dependentTaskId}|${selectedTask.condition.formId}|${selectedTask.condition.questionId}` : ''}
                    onChange={(e) => handleConditionChange('condition', 'question', e.target.value)}
                  >
                    <option value="">{t('tasks.always_execute')}</option>
                    {availableQuestions.map((item) => (
                      <option key={`${item.taskId}|${item.formId}|${item.question.id}`} value={`${item.taskId}|${item.formId}|${item.question.id}`}>
                        {item.taskName} &gt; {item.formTitle} &gt; {item.question.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTask.condition && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                <p className="form-desc" style={{ marginBottom: '15px' }}>{t('tasks.skip_desc')}</p>

                <div className="editor-field">
                  <label>{t('tasks.skip_depends_on')}</label>
                  <select
                    className="form-input"
                    value={selectedTask.skipCondition ? `${selectedTask.skipCondition.dependentTaskId}|${selectedTask.skipCondition.formId}|${selectedTask.skipCondition.questionId}` : ''}
                    onChange={(e) => handleConditionChange('skipCondition', 'question', e.target.value)}
                  >
                    <option value="">{t('tasks.never_skip')}</option>
                    {availableQuestions.map((item) => (
                      <option key={`skip-${item.taskId}|${item.formId}|${item.question.id}`} value={`${item.taskId}|${item.formId}|${item.question.id}`}>
                        {item.taskName} &gt; {item.formTitle} &gt; {item.question.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTask.skipCondition && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
          </div>
        )}
      </div>

      {showFormModal && selectedTask && (
        <div className="modal-overlay-clear" onClick={() => setShowFormModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-card-header">
              <h2>{t('tasks.link_forms_modal_title')}</h2>
              <button className="btn-close-modal" onClick={() => setShowFormModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-card-body" style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="editor-field" style={{ marginBottom: 0 }}>
                <label>{t('common.search')}</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder={t('tasks.search_form')}
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {forms.length === 0 ? (
                <div className="dropdown-info-card">
                  <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📝</span>
                  <strong>{t('tasks.no_forms_created_title')}</strong>
                  <p style={{ margin: 0, opacity: 0.8 }}>{t('tasks.no_forms_created_desc')}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingRight: '4px' }}>
                  
                  {/* 1. SECTION: Available Forms */}
                  <div>
                    <div className="dropdown-category-title" style={{ marginTop: 0, paddingLeft: 0, fontSize: '11px' }}>
                      {t('tasks.available_forms_title')} ({availableForms.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {availableForms.length > 0 ? (
                        availableForms.map(f => (
                          <div 
                            key={f.id} 
                            className="form-dropdown-option available" 
                            style={{ border: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => handleAddForm(f.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <span>📄</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: '13px' }}>{f.title}</span>
                                {f.description && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</span>}
                              </div>
                            </div>
                            <span className="option-badge available" style={{ marginLeft: '10px', flexShrink: 0 }}>
                              {f.questions.length} {f.questions.length === 1 ? t('tasks.questions_count_label') : t('tasks.questions_count_label_plural')}
                            </span>
                          </div>
                        ))
                      ) : (
                        searchTerm !== '' ? (
                          <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            🔍 {t('tasks.no_forms_matching', { searchTerm: formSearch })}
                          </div>
                        ) : (
                          totalFreeFormsCount === 0 ? (
                            <div className="dropdown-info-card warning" style={{ margin: '4px 0', width: '100%' }}>
                              <span style={{ fontSize: '1.3rem', marginBottom: '4px' }}>💡</span>
                              <strong style={{ color: '#d97706' }}>{t('tasks.all_forms_assigned_title')}</strong>
                              <p style={{ margin: 0, opacity: 0.85, fontSize: '11px', lineHeight: '1.4' }}>
                                {t('tasks.all_forms_assigned_desc')}
                              </p>
                            </div>
                          ) : (
                            <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {t('tasks.no_available_forms')}
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>

                  {/* 2. SECTION: Forms already linked to current task */}
                  {alreadyLinkedForms.length > 0 && (
                    <div>
                      <div className="dropdown-category-title" style={{ paddingLeft: 0, fontSize: '11px' }}>
                        {t('tasks.linked_to_this_step')} ({alreadyLinkedForms.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {alreadyLinkedForms.map(f => (
                          <div 
                            key={f.id} 
                            className="form-dropdown-option linked"
                            style={{ border: '1px solid rgba(59, 130, 246, 0.2)', padding: '10px 12px', opacity: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px' }}
                            onClick={() => handleRemoveForm(f.id)}
                            title={t('tasks.linked_forms_unlink_tooltip')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: '13px', color: 'var(--primary)' }}>{f.title}</span>
                                {f.description && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</span>}
                              </div>
                            </div>
                            <span className="option-badge linked" style={{ marginLeft: '10px', flexShrink: 0 }}>
                              {t('common.unlink')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. SECTION: Forms linked to other tasks */}
                  {linkedToOtherForms.length > 0 && (
                    <div>
                      <div className="dropdown-category-title" style={{ paddingLeft: 0, fontSize: '11px' }}>
                        {t('tasks.assigned_to_other_steps')} ({linkedToOtherForms.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {linkedToOtherForms.map(f => (
                          <div 
                            key={f.id} 
                            className="form-dropdown-option assigned-other"
                            style={{ border: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px' }}
                            title={t('tasks.assigned_to_step', { stepName: otherTasksForms.get(f.id) })}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <span>🔒</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: '13px' }}>{f.title}</span>
                                {f.description && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</span>}
                              </div>
                            </div>
                            <span className="option-badge assigned-other" style={{ marginLeft: '10px', flexShrink: 0 }}>
                              {otherTasksForms.get(f.id)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setShowFormModal(false)}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
