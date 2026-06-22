'use client';
import { useState, useEffect } from 'react';
import type { World } from './WorldsPanel';

interface SwitchWorldModalProps {
  fromWorld: World;
  toWorld: World;
  onSwitch: () => void;
  onClose: () => void;
  switching: boolean;
}

type SwitchStep = 'confirm' | 'backing_up' | 'loading' | 'complete';

export const SwitchWorldModal = ({
  fromWorld,
  toWorld,
  onSwitch,
  onClose,
  switching
}: SwitchWorldModalProps) => {
  const [step, setStep] = useState<SwitchStep>('confirm');

  useEffect(() => {
    if (!switching) return;

    const executeSwitch = async () => {
      setStep('backing_up');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('loading');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('complete');
      await new Promise(resolve => setTimeout(resolve, 1500));
    };

    executeSwitch();
  }, [switching]);

  const handleConfirm = () => {
    onSwitch();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={() => !switching && onClose()}
    >
      <div
        style={{
          padding: '2rem',
          background: 'rgba(30, 20, 10, 0.95)',
          border: '1px solid rgba(184, 115, 51, 0.5)',
          borderRadius: '0.5rem',
          maxWidth: '500px',
          width: '90%',
          color: '#d4a373'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>
          {step === 'confirm' && 'Switch World?'}
          {step !== 'confirm' && '⏳ Switching...'}
        </h2>

        {step === 'confirm' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                Switch from <strong>{fromWorld.world_name}</strong> to <strong>{toWorld.world_name}</strong>?
              </p>
              <div style={{
                padding: '1rem',
                background: 'rgba(184, 115, 51, 0.05)',
                border: '1px solid rgba(184, 115, 51, 0.2)',
                borderRadius: '0.25rem',
                fontSize: '0.9rem'
              }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  ✓ Current world will be backed up to `/minecraft-backups/`
                </p>
                <p>
                  ✓ Target world will be loaded and set as active
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleConfirm}
                disabled={switching}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(100, 150, 100, 0.2)',
                  border: '1px solid rgba(100, 150, 100, 0.3)',
                  color: '#99dd99',
                  borderRadius: '0.25rem',
                  cursor: switching ? 'not-allowed' : 'pointer',
                  opacity: switching ? 0.6 : 1,
                  fontSize: '0.95rem',
                  fontWeight: 'bold'
                }}
              >
                Confirm Switch
              </button>
              <button
                onClick={onClose}
                disabled={switching}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(100, 100, 100, 0.2)',
                  border: '1px solid rgba(100, 100, 100, 0.3)',
                  color: '#999999',
                  borderRadius: '0.25rem',
                  cursor: switching ? 'not-allowed' : 'pointer',
                  opacity: switching ? 0.6 : 1,
                  fontSize: '0.95rem'
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step !== 'confirm' && (
          <div>
            <ProgressStep
              label="Backing up current world..."
              active={step === 'backing_up'}
              complete={['loading', 'complete'].includes(step)}
            />
            <ProgressStep
              label="Loading target world..."
              active={step === 'loading'}
              complete={step === 'complete'}
            />
            {step === 'complete' && (
              <>
                <ProgressStep
                  label="Complete!"
                  active={false}
                  complete={true}
                />
                <button
                  onClick={onClose}
                  style={{
                    width: '100%',
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(100, 150, 100, 0.2)',
                    border: '1px solid rgba(100, 150, 100, 0.3)',
                    color: '#99dd99',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 'bold'
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ProgressStepProps {
  label: string;
  active: boolean;
  complete: boolean;
}

const ProgressStep = ({ label, active, complete }: ProgressStepProps) => {
  return (
    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          background: complete ? 'rgba(100, 150, 100, 0.3)' : active ? 'rgba(184, 115, 51, 0.3)' : 'rgba(100, 100, 100, 0.1)',
          color: complete ? '#99dd99' : active ? '#d4a373' : '#666666',
          fontWeight: 'bold'
        }}
      >
        {complete ? '✓' : active ? '⟳' : '○'}
      </div>
      <span style={{
        color: complete ? '#99dd99' : active ? '#d4a373' : '#666666'
      }}>
        {label}
      </span>
    </div>
  );
};
