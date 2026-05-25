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
          {question.condition && (
            <span title={conditionalLabel} style={{ display: 'inline-flex', alignItems: 'center', color: '#fbbf24' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
          )}
          {question.isSensitive && (
            <span title={sensitiveLabel} style={{ display: 'inline-flex', alignItems: 'center', color: '#a78bfa' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
          )}
        </div>

        <button 
          className="btn-icon form-delete-btn" 
          onClick={onDelete}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

      </div>
    </div>
  );
};
