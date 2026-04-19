import React from 'react';
import { CourierDeliveryStage } from '../../store/courierStore';

interface Props {
  stage: CourierDeliveryStage;
}

export function StageTracker({ stage }: Props) {
  const steps = [
    {
      id: 1, label: "Restoran",
      state: stage === 1 ? 'active' : 'done',
      icon: stage === 1 ? (
        <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>
      ) : <polyline points="20 6 9 17 4 12" />
    },
    {
      id: 2, label: "Olindi",
      state: stage === 1 ? 'pending' : 'done',
      icon: stage > 1 ? <polyline points="20 6 9 17 4 12" /> : (
        <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>
      )
    },
    {
      id: 3, label: "Yo'lda",
      state: stage < 2 ? 'pending' : stage === 2 ? 'active' : 'done',
      icon: stage === 3 ? <polyline points="20 6 9 17 4 12" /> : (
        <><circle cx="12" cy="10" r="3" /><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" /></>
      )
    },
    {
      id: 4, label: "Topshirildi",
      state: stage === 3 ? 'done' : 'pending',
      icon: <polyline points="20 6 9 17 4 12" />
    }
  ];

  const lines = [
    { state: stage > 1 ? 'done' : 'pending' },
    { state: stage > 1 ? 'done' : 'pending' },
    { state: stage === 3 ? 'done' : 'pending' },
  ];

  return (
    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7080', marginBottom: '10px' }}>
        Yetkazish holati
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((step, idx) => {
          const isDone = step.state === 'done';
          const isActive = step.state === 'active';
          
          const bg = isDone ? '#1d9e75' : isActive ? '#2a3a8a' : 'rgba(255,255,255,0.06)';
          const border = isActive ? '2px solid #5b7fff' : 'none';
          const color = isDone ? '#1d9e75' : isActive ? '#a0b0ff' : '#6b7080';
          const strokeColor = isDone ? '#fff' : isActive ? '#a0b0ff' : '#3a3f55';
          
          return (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, border, position: 'relative', zIndex: 2, boxSizing: 'border-box'
                }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {step.icon}
                  </svg>
                </div>
                <div style={{ fontSize: '10px', textAlign: 'center', color, fontWeight: 500 }}>
                  {step.label}
                </div>
              </div>
              
              {idx < lines.length && (
                <div style={{
                  flex: 1, height: '2px', margin: '0 -2px',
                  marginBottom: '16px', position: 'relative', zIndex: 1,
                  background: lines[idx].state === 'done' ? '#1d9e75' : 'rgba(255,255,255,0.08)'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}