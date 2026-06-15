import type { FormQuestion } from '../../../../../types/workflow.types';
import { IconLink, IconLock, IconDelete } from '../../../../../components/ui/Icons';

interface CollapsedQuestionItemProps {
  question: FormQuestion;
  questionNumber: string;
  requiredLabel: string;
  conditionalLabel: string;
  sensitiveLabel: string;
  onExpand: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isUpDisabled: boolean;
  isDownDisabled: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
}

export const CollapsedQuestionItem = ({
  question,
  questionNumber,
  requiredLabel,
  conditionalLabel,
  sensitiveLabel,
  onExpand,
  onDelete,
  onMoveUp,
  onMoveDown,
  isUpDisabled,
  isDownDisabled,
  moveUpLabel,
  moveDownLabel
}: CollapsedQuestionItemProps) => {
  return (
    <div
      className={`question-editor-card collapsed ${question.type === 'disclaimer' ? 'disclaimer-card' : ''} ${question.dependencyQuestion ? 'conditional-card' : ''}`}
      data-q-id={question.id}
    >
      <div className="card-header">
        <div
          className="question-number-chip"
          style={question.type === 'disclaimer' ? { backgroundColor: '#0f766e', color: 'white' } : {}}
        >
          {questionNumber}
        </div>
        <button className="btn-icon btn-collapse collapsed" onClick={onExpand}>
          ▼
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', minWidth: 0, overflow: 'hidden' }}>
          <span className="label-input collapsed-label" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', minWidth: 0, width: 0 }} title={question.label}>
            {question.label}
          </span>

          {question.type === 'disclaimer' && (
            <span className="node-badge badge-disclaimer" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
              DISCLAIMER
            </span>
          )}
          {question.required && question.type !== 'disclaimer' && <span title={requiredLabel} style={{ fontSize: 'var(--text-md)', color: '#ef4444', fontWeight: 700 }}>*</span>}
          {question.dependencyQuestion && question.type !== 'disclaimer' && (
            <span title={conditionalLabel} style={{ display: 'inline-flex', alignItems: 'center', color: '#fbbf24' }}>
              <IconLink size={12} />
            </span>
          )}
          {question.isSensitive && question.type !== 'disclaimer' && (
            <span title={sensitiveLabel} style={{ display: 'inline-flex', alignItems: 'center', color: '#a78bfa' }}>
              <IconLock size={12} />
            </span>
          )}
        </div>

        {/* Up / Down Reorder Buttons */}
        <button
          type="button"
          className="btn-icon"
          disabled={isUpDisabled}
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            minWidth: '26px',
            borderRadius: '6px',
            border: '1px solid var(--panel-border)',
            background: 'transparent',
            color: isUpDisabled ? 'var(--text-muted)' : 'var(--primary)',
            opacity: isUpDisabled ? 0.25 : 1,
            cursor: isUpDisabled ? 'not-allowed' : 'pointer',
            padding: 0,
            fontSize: 'var(--text-xs)'
          }}
          title={moveUpLabel}
        >
          ▲
        </button>
        <button
          type="button"
          className="btn-icon"
          disabled={isDownDisabled}
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            minWidth: '26px',
            borderRadius: '6px',
            border: '1px solid var(--panel-border)',
            background: 'transparent',
            color: isDownDisabled ? 'var(--text-muted)' : 'var(--primary)',
            opacity: isDownDisabled ? 0.25 : 1,
            cursor: isDownDisabled ? 'not-allowed' : 'pointer',
            padding: 0,
            fontSize: 'var(--text-xs)',
            marginRight: 'var(--spacing-xs)'
          }}
          title={moveDownLabel}
        >
          ▼
        </button>

        <button 
          className="btn-icon form-delete-btn" 
          onClick={onDelete}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconDelete size={12} />
        </button>

      </div>
    </div>
  );
};
