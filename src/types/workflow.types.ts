export type QuestionType = 'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'textarea';

export interface FormQuestionCondition {
  formId?: string; // Opcional: si está presente, la pregunta origen pertenece a otro formulario en el workflow
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
  displayNumber?: string; // Persistent hierarchical question number (e.g. "2.1")
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

export interface NotificationSettings {
  sendMail: boolean;
  sendWorkflowToParticipants: boolean;
  sendOtherUsers: boolean;
  sendMailReminders: string;
  sendMailOtherParticipants: string[];
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
  taskType?: 'normal' | 'dynamic' | 'iso';
  allApproverRequired?: boolean;
  expirationDays?: number;
  notificationSettings?: NotificationSettings;
  forms?: Form[]; // Utilizado exclusivamente para compatibilidad de anidamiento en la base de datos/API
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
  creationDate?: string;
  makerId?: string;
  checkerId?: string;
  ownerName?: string;
}

