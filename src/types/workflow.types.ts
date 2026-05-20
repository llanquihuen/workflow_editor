export type QuestionType = 'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'textarea';

export interface FormQuestionCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  isSensitive?: boolean; // Indica si la pregunta contiene información sensible
  options?: string[]; // Opciones para dropdown, radio, etc.
  condition?: FormQuestionCondition;
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
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
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
  skipCondition?: TaskCondition;
}

export interface Workflow {
  id: string;
  name: string;
  tasks: Task[];
  forms: Form[];
  ownerId?: string;
  updatedAt?: string;
  version?: string;
  rating?: number;
  enabled?: boolean;
}

