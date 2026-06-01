import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from '../../../../components/ui/Icons';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  error: string;
  setError: (error: string) => void;
}

export const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  workflowName,
  setWorkflowName,
  error,
  setError,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card-header">
          <h2>{t('dashboard.create_modal_title')}</h2>
          <button className="btn-close-modal" onClick={onClose}>
            <IconClose size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-card-body">
            <div className="form-group">
              <label className="modal-label">{t('dashboard.create_modal_label')}</label>
              <input
                type="text"
                className="modal-input"
                placeholder={t('dashboard.create_modal_placeholder')}
                value={workflowName}
                onChange={(e) => {
                  setWorkflowName(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {error && <p className="modal-error-message">⚠️ {error}</p>}
            </div>
          </div>
          <div className="modal-card-footer">
            <button
              type="button"
              className="btn-modal-secondary"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-modal-primary">
              {t('dashboard.create_modal_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DuplicateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  error: string;
  setError: (error: string) => void;
}

export const DuplicateWorkflowModal: React.FC<DuplicateWorkflowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  workflowName,
  setWorkflowName,
  error,
  setError,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card-header">
          <h2>{t('dashboard.duplicate_modal_title') || t('common.duplicate')}</h2>
          <button className="btn-close-modal" onClick={onClose}>
            <IconClose size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-card-body">
            <div className="form-group">
              <label className="modal-label">{t('dashboard.create_modal_label')}</label>
              <input
                type="text"
                className="modal-input"
                placeholder={t('dashboard.create_modal_placeholder')}
                value={workflowName}
                onChange={(e) => {
                  setWorkflowName(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {error && <p className="modal-error-message">⚠️ {error}</p>}
            </div>
          </div>
          <div className="modal-card-footer">
            <button
              type="button"
              className="btn-modal-secondary"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-modal-primary">
              {t('common.duplicate') || 'Duplicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
