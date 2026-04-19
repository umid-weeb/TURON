import React from 'react';
import { CourierDeliveryStage } from '../../store/courierStore';

type StepState = 'active' | 'done' | 'pending';

interface Props {
  stage: CourierDeliveryStage;
}

const checkIcon = <polyline points="20 6 9 17 4 12" />;
const houseIcon = (
  <>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </>
);
const clockIcon = (
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>
);
const pinIcon = (
  <>
    <circle cx="12" cy="10" r="3" />
    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
  </>
);

function getStepState(stage: CourierDeliveryStage, index: number): StepState {
  if (stage === 1) {
    return index === 0 ? 'active' : 'pending';
  }

  if (stage === 2) {
    if (index < 2) return 'done';
    return index === 2 ? 'active' : 'pending';
  }

  return 'done';
}

function getStepIcon(index: number, state: StepState) {
  if (state === 'done') return checkIcon;
  if (index === 0) return houseIcon;
  if (index === 1) return clockIcon;
  if (index === 2) return pinIcon;
  return checkIcon;
}

function getCircleStyle(state: StepState): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    boxSizing: 'border-box',
    background:
      state === 'done'
        ? '#1d9e75'
        : state === 'active'
          ? '#2a3a8a'
          : 'rgba(255,255,255,0.06)',
    border: state === 'active' ? '2px solid #5b7fff' : 'none',
  };
}

function getLabelColor(state: StepState) {
  if (state === 'done') return '#1d9e75';
  if (state === 'active') return '#a0b0ff';
  return '#6b7080';
}

function getStrokeColor(state: StepState) {
  if (state === 'done') return '#fff';
  if (state === 'active') return '#a0b0ff';
  return '#3a3f55';
}

export function StageTracker({ stage }: Props) {
  const steps = ['Restoran', 'Olindi', "Yo'lda", 'Topshirildi'];
  const lineDone = (index: number) => (stage === 2 && index < 2) || stage === 3;

  return (
    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#6b7080',
          marginBottom: 10,
        }}
      >
        Yetkazish holati
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((label, index) => {
          const state = getStepState(stage, index);

          return (
            <React.Fragment key={label}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  flex: 1,
                }}
              >
                <div style={getCircleStyle(state)}>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke={getStrokeColor(state)}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {getStepIcon(index, state)}
                  </svg>
                </div>
                <div style={{ fontSize: 10, textAlign: 'center', color: getLabelColor(state) }}>
                  {label}
                </div>
              </div>

              {index < steps.length - 1 ? (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    margin: '0 -2px',
                    marginBottom: 16,
                    position: 'relative',
                    zIndex: 1,
                    background: lineDone(index) ? '#1d9e75' : 'rgba(255,255,255,0.08)',
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
