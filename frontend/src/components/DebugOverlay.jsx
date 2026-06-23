import React, { useRef, useState } from 'react';
import { readDebugLog, clearDebugLog, isDebugEnabled, setDebugEnabled, BUILD_STAMP } from '../utils/debugLog';

// Sync-diagnostics overlay — hidden by default. Tap the top-right corner 5x
// within 2s to reveal/hide the 🐞 dot (see CLAUDE.md "Debug overlay"). Once
// revealed, tap the dot to view the load/sync event log.
export default function DebugOverlay() {
  const [enabled, setEnabled] = useState(isDebugEnabled);
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState([]);
  const tapTimesRef = useRef([]);

  const onCornerTap = () => {
    const now = Date.now();
    const recent = tapTimesRef.current.filter(t => now - t < 2000);
    recent.push(now);
    tapTimesRef.current = recent;
    if (recent.length >= 5) {
      tapTimesRef.current = [];
      const next = !enabled;
      setDebugEnabled(next);
      setEnabled(next);
      if (!next) setOpen(false);
    }
  };

  const toggle = () => {
    if (!open) setLog(readDebugLog());
    setOpen(o => !o);
  };

  return (
    <>
      {/* Invisible 5-tap hotspot, always present, top-right corner */}
      <div
        onClick={onCornerTap}
        style={{ position: 'fixed', top: 0, right: 0, width: 44, height: 44, zIndex: 99999 }}
        aria-hidden="true"
      />

      {enabled && (
        <button
          onClick={toggle}
          style={{
            position: 'fixed', left: 6, bottom: 6, zIndex: 99999,
            width: 22, height: 22, borderRadius: '50%',
            background: open ? '#39FF14' : 'rgba(57,255,20,0.35)',
            border: '1px solid #39FF14', color: '#000', fontSize: 11, lineHeight: '20px',
            padding: 0, cursor: 'pointer',
          }}
          aria-label="sync debug log"
        >🐞</button>
      )}

      {enabled && open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.95)',
          color: '#39FF14', font: '11px/1.45 monospace',
          padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 10px calc(env(safe-area-inset-bottom, 0px) + 10px)',
          boxSizing: 'border-box', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#fff', fontSize: 10, marginBottom: 8, wordBreak: 'break-word' }}>
              build: {BUILD_STAMP} · {log.length} events
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setLog(readDebugLog())} style={btn}>refresh</button>
              <button onClick={() => { clearDebugLog(); setLog([]); }} style={btn}>clear</button>
              <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(log, null, 2))} style={btn}>copy</button>
            </div>
          </div>
          {[...log].reverse().map((row, i) => (
            <div key={i} style={{ borderBottom: '1px solid #123', padding: '3px 0', wordBreak: 'break-all' }}>
              <span style={{ color: '#888' }}>{row.t}</span>{' '}
              <span style={{ color: '#fff' }}>{row.e}</span>{' '}
              {Object.entries(row).filter(([k]) => k !== 't' && k !== 'e').map(([k, v]) => (
                <span key={k} style={{ marginRight: 6 }}>{k}=<span style={{ color: '#9cf' }}>{JSON.stringify(v)}</span></span>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const btn = {
  flex: '1 1 0', minWidth: 0, background: '#111', color: '#39FF14', border: '1px solid #39FF14',
  fontSize: 11, padding: '8px 4px', borderRadius: 4, cursor: 'pointer',
};
