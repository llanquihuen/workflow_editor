export type QuestionType = 'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'textarea';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  options?: string[]; // Opciones para dropdown, radio, etc.
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
}

export interface UIMetadata {
  x: number;
  y: number;
}

export interface TaskCondition {
  dependentTaskId: string;
  formId: string;
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
}

export interface Task {
  id: string;
  name: string;
  order: number;
  approverIds?: string[];
  formIds?: string[];
  ui_metadata: UIMetadata;
  condition?: TaskCondition;
}

export interface Workflow {
  id: string;
  name: string;
  tasks: Task[];
  forms: Form[];
}
