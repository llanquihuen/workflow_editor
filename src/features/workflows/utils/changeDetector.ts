import type { Workflow } from '../../../types/workflow.types';

export const detectWorkflowChanges = (
  original: Workflow | null,
  current: Workflow,
  t: (key: string, options?: any) => string
): string => {
  if (!original) {
    return t('changes.init');
  }

  const changes: string[] = [];

  // 1. Check Name
  if ((original.name || '').trim() !== (current.name || '').trim()) {
    changes.push(
      t('changes.rename_workflow', {
        current: current.name,
        original: original.name,
      })
    );
  }

  // 2. Check Enabled Status
  if (original.enabled !== current.enabled) {
    changes.push(
      current.enabled ? t('changes.enable_workflow') : t('changes.disable_workflow')
    );
  }

  // 3. Compare Tasks
  const originalTasksMap = new Map(original.tasks.map(t => [t.id, t]));
  const currentTasksMap = new Map(current.tasks.map(t => [t.id, t]));

  // Added Tasks
  current.tasks.forEach(task => {
    if (!originalTasksMap.has(task.id)) {
      changes.push(t('changes.add_task', { name: task.name }));
    }
  });

  // Deleted Tasks
  original.tasks.forEach(task => {
    if (!currentTasksMap.has(task.id)) {
      changes.push(t('changes.delete_task', { name: task.name }));
    }
  });

  // Modified Tasks
  current.tasks.forEach(task => {
    const origT = originalTasksMap.get(task.id);
    if (origT) {
      const taskChanges: string[] = [];
      if ((origT.name || '').trim() !== (task.name || '').trim()) {
        taskChanges.push(t('changes.task_fields.name', { value: task.name }));
      }
      if (origT.order !== task.order) {
        taskChanges.push(t('changes.task_fields.order', { value: task.order }));
      }
      
      // Compare approvers
      const origApprovers = origT.approverIds || [];
      const currApprovers = task.approverIds || [];
      if (JSON.stringify([...origApprovers].sort()) !== JSON.stringify([...currApprovers].sort())) {
        taskChanges.push(t('changes.task_fields.approvers'));
      }

      // Compare forms
      const origForms = origT.formIds || [];
      const currForms = task.formIds || [];
      if (JSON.stringify([...origForms].sort()) !== JSON.stringify([...currForms].sort())) {
        taskChanges.push(t('changes.task_fields.forms'));
      }

      // Compare condition
      if (JSON.stringify(origT.condition) !== JSON.stringify(task.condition)) {
        taskChanges.push(t('changes.task_fields.condition'));
      }

      if (taskChanges.length > 0) {
        changes.push(
          t('changes.modify_task', {
            name: task.name,
            details: taskChanges.join(', '),
          })
        );
      }
    }
  });

  // 4. Compare Forms
  const originalFormsMap = new Map((original.forms || []).map(f => [f.id, f]));
  const currentFormsMap = new Map((current.forms || []).map(f => [f.id, f]));

  // Added Forms
  (current.forms || []).forEach(form => {
    if (!originalFormsMap.has(form.id)) {
      changes.push(t('changes.add_form', { title: form.title }));
    }
  });

  // Deleted Forms
  (original.forms || []).forEach(form => {
    if (!currentFormsMap.has(form.id)) {
      changes.push(t('changes.delete_form', { title: form.title }));
    }
  });

  // Modified Forms
  (current.forms || []).forEach(form => {
    const origF = originalFormsMap.get(form.id);
    if (origF) {
      const formChanges: string[] = [];
      if ((origF.title || '').trim() !== (form.title || '').trim()) {
        formChanges.push(t('changes.form_fields.title', { value: form.title }));
      }
      if ((origF.description || '').trim() !== (form.description || '').trim()) {
        formChanges.push(t('changes.form_fields.description'));
      }
      if (JSON.stringify(origF.questions) !== JSON.stringify(form.questions)) {
        formChanges.push(t('changes.form_fields.questions'));
      }

      if (formChanges.length > 0) {
        changes.push(
          t('changes.modify_form', {
            title: form.title,
            details: formChanges.join(', '),
          })
        );
      }
    }
  });

  if (changes.length === 0) {
    return t('changes.no_changes');
  }

  return changes.join('\n');
};
