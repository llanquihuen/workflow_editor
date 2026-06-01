import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { DUMMY_USERS } from '../../../../utils/constants';

interface WorkflowSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowSettingsModal: React.FC<WorkflowSettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { workflow, updateWorkflow } = useWorkflowStore();

  const [ownerId, setOwnerId] = useState('');
  const [checkerId, setCheckerId] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const [prevWorkflowId, setPrevWorkflowId] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  if (workflow && (workflow.id !== prevWorkflowId || isOpen !== prevIsOpen)) {
    setPrevWorkflowId(workflow.id);
    setPrevIsOpen(isOpen);
    setOwnerId(workflow.ownerId || '');
    setCheckerId(workflow.checkerId || '');
    setOwnerName(workflow.ownerName || '');
  }

  if (!isOpen || !workflow) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find owner name from selected ID
    const selectedOwner = DUMMY_USERS.find(u => u.id === ownerId);
    // Clean name (remove department inside parentheses if present)
    const cleanOwnerName = selectedOwner ? selectedOwner.name.split(' (')[0] : ownerName;

    updateWorkflow({
      ...workflow,
      ownerId,
      checkerId,
      ownerName: cleanOwnerName,
      updatedAt: new Date().toLocaleDateString('en-US') // Update timestamp
    });

    onClose();
  };

  const cleanUserName = (fullName: string) => {
    return fullName.split(' (')[0];
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="modal-glass-card" style={{ maxWidth: '520px', animation: 'fadeIn 0.25s ease-out' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header styling matching the App's glass modal */}
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
          ⚙️ {t('dashboard.workflow_settings')}
        </h3>
        <p style={{ marginBottom: 'var(--spacing-xl)' }}>
          {t('dashboard.workflow_settings_desc') || 'Configura la gobernanza y asignación de responsabilidad de este flujo de trabajo.'}
        </p>

        <form onSubmit={handleSave}>
          
          {/* Version Governance Block */}
          <div className="form-group-modal" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <label>{t('common.save_version_governance') || 'Gobernanza de Versión y Metadata'}</label>
            <div className="settings-metadata-box" style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '6px',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              marginTop: 'var(--spacing-xs)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-md)'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('dashboard.col_id') || 'ID del Workflow'}</span>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)', wordBreak: 'break-all' }}>{workflow.id}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('dashboard.col_version') || 'Versión Actual'}</span>
                <strong style={{ fontSize: 'var(--text-base)', color: 'var(--primary)' }}>{workflow.version || 'v1.0'}</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 'var(--spacing-md)' }}>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('dashboard.workflow_settings_creation_date') || 'Fecha de Creación'}</span>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{workflow.creationDate || new Date().toLocaleDateString('en-US')}</strong>
              </div>
              <div style={{ textAlign: 'right', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 'var(--spacing-md)' }}>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('dashboard.workflow_settings_maker') || 'Operador Creador'}</span>
                <strong style={{ fontSize: 'var(--text-sm)', color: '#10b981' }}>{cleanUserName(workflow.makerId || 'admin')}</strong>
              </div>
            </div>
          </div>

          <div className="form-group-modal">
            <label>{t('dashboard.workflow_settings_owner') || 'Dueño del Flujo (Owner)'}</label>
            <select
              style={{
                width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'rgba(15, 23, 42, 0.5)', color: 'white', 
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontSize: 'var(--text-sm)',
                outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer'
              }}
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              required
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <option value="" disabled>{t('dashboard.workflow_settings_select_owner') || 'Selecciona el Dueño'}</option>
              {DUMMY_USERS.map(u => (
                <option key={u.id} value={u.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-modal">
            <label>{t('dashboard.workflow_settings_checker') || 'Verificador del Flujo (Checker)'}</label>
            <select
              style={{
                width: '100%', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'rgba(15, 23, 42, 0.5)', color: 'white', 
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontSize: 'var(--text-sm)',
                outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer'
              }}
              value={checkerId}
              onChange={(e) => setCheckerId(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <option value="">{t('dashboard.workflow_settings_select_checker') || 'Sin verificador asignado'}</option>
              {DUMMY_USERS.map(u => (
                <option key={u.id} value={u.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions" style={{ marginTop: '30px' }}>
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              {t('common.cancel') || 'Cancelar'}
            </button>
            <button type="submit" className="btn-modal-confirm">
              {t('common.save') || 'Aplicar Configuración'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .light-theme .settings-metadata-box {
          background: rgba(99, 102, 241, 0.08) !important;
          border-color: rgba(99, 102, 241, 0.2) !important;
        }
        .light-theme .settings-metadata-box > div[style*="borderTop"] {
          border-top-color: rgba(0, 0, 0, 0.08) !important;
        }
        .light-theme select {
          background: #f8fafc !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
        .light-theme select option {
          background: #fff !important;
          color: #0f172a !important;
        }
      `}</style>
    </div>
  );
};
