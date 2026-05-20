import type { FormQuestion } from '../types/workflow.types';

interface CollapsedQuestionItemProps {
  question: FormQuestion;
  questionNumber: string;
  requiredLabel: string;
  conditionalLabel: string;
  sensitiveLabel: string;
  onExpand: () => void;
  onDelete: () => void;
}

export const CollapsedQuestionItem = ({
  question,
  questionNumber,
  requiredLabel,
  conditionalLabel,
  sensitiveLabel,
  onExpand,
  onDelete
}: CollapsedQuestionItemProps) => {
  return (
    <div className="question-editor-card collapsed">
      <div className="card-header">
        <div className="question-number-chip">{questionNumber}</div>
        <button className="btn-icon btn-collapse collapsed" onClick={onExpand}>
          ▼
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span className="label-input collapsed-label" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={question.label}>
            {question.label}
          </span>

          {question.required && <span title={requiredLabel} style={{ fontSize: '1rem', color: '#ef4444', fontWeight: 700 }}>*</span>}
          {question.condition && <span title={conditionalLabel} style={{ fontSize: '0.9rem' }}>🔗</span>}
          {question.isSensitive && <span title={sensitiveLabel} style={{ fontSize: '0.9rem' }}>🔒</span>}
        </div>

        <button className="btn-icon danger" onClick={onDelete}>🗑</button>
      </div>
    </div>
  );
};
