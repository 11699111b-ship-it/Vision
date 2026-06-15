import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { boop } from '../utils/audioEngine';
import QuestMapperOverlay from './QuestMapperOverlay';

// ── Inline add-focus form ──────────────────────────────────────────────────────
function AddFocusForm({ onClose }) {
  const [name, setName] = useState('');
  const { dispatch } = useAppContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { onClose(); return; }
    dispatch({ type: 'ADD_FOCUS', name: name.trim() });
    boop();
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(57,255,20,0.04)',
        border: '1px dashed rgba(57,255,20,0.22)',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 2,
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value.toUpperCase())}
        placeholder="JOB, BODY, SITE..."
        maxLength={16}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid rgba(57,255,20,0.3)',
          color: '#39FF14',
          fontFamily: 'Space Mono, monospace',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          outline: 'none',
          padding: '2px 0',
        }}
      />
      <button
        type="submit"
        style={{
          background: '#39FF14', border: 'none', borderRadius: 4,
          padding: '4px 10px', fontFamily: 'Space Mono, monospace',
          fontSize: 10, fontWeight: 700, color: '#000', cursor: 'pointer',
        }}
      >
        ADD
      </button>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, padding: '4px 7px', fontSize: 10,
          color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
        }}
      >
        ×
      </button>
    </form>
  );
}

// ── Single focus card ──────────────────────────────────────────────────────────
function FocusCard({ focus, onMap }) {
  const { dispatch } = useAppContext();
  const hasQuests = focus.linkedQuestIds.length > 0;

  return (
    <div
      style={{
        background: hasQuests ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${hasQuests ? 'rgba(57,255,20,0.18)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        position: 'relative',
        opacity: hasQuests ? 1 : 0.7,
      }}
    >
      {/* Delete × */}
      <button
        onClick={() => { boop(); dispatch({ type: 'DELETE_FOCUS', focusId: focus.id }); }}
        style={{
          position: 'absolute', top: 6, right: 7,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.15)', fontSize: 14, lineHeight: 1,
          padding: '1px 3px', borderRadius: 3,
        }}
        onMouseOver={e => { e.currentTarget.style.color = '#FF3B30'; e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; }}
        onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'none'; }}
      >
        ×
      </button>

      {/* Name */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700,
        color: hasQuests ? '#39FF14' : 'rgba(57,255,20,0.4)',
        letterSpacing: '0.05em', marginBottom: 2,
        paddingRight: 16,
      }}>
        {focus.name}
      </div>

      {/* Quest count */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: 9, marginBottom: 8,
        color: hasQuests ? 'rgba(255,255,255,0.28)' : 'rgba(255,165,0,0.5)',
      }}>
        {hasQuests
          ? `${focus.linkedQuestIds.length} quest${focus.linkedQuestIds.length !== 1 ? 's' : ''} linked`
          : 'no quests yet'}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {hasQuests && (
          <>
            <button
              onClick={() => { boop(); dispatch({ type: 'ADD_FOCUS_TO_SPRINT', focusId: focus.id }); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', fontSize: 10,
                color: '#39FF14', padding: 0, letterSpacing: '0.03em',
              }}
            >
              + Add to sprint
            </button>
            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
          </>
        )}
        <button
          onClick={() => onMap(focus.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            color: hasQuests ? 'rgba(0,229,255,0.55)' : 'rgba(255,165,0,0.65)',
            padding: 0,
          }}
        >
          {hasQuests ? 'map' : '+ map quests'}
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function FocusModePanel() {
  const { focusItems } = useAppContext();
  const [open, setOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mappingFocusId, setMappingFocusId] = useState(null);

  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <>
      {mappingFocusId && (
        <QuestMapperOverlay
          focusId={mappingFocusId}
          onClose={() => setMappingFocusId(null)}
        />
      )}

      <div style={{
        borderBottom: '1px solid rgba(57,255,20,0.1)',
        background: 'rgba(57,255,20,0.008)',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 16px', cursor: 'pointer', userSelect: 'none',
          }}
        >
          <ChevronIcon size={10} color="rgba(57,255,20,0.55)" style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
            color: '#39FF14', letterSpacing: '0.14em', flex: 1,
          }}>
            FOCUS MODE
          </span>
          <button
            onClick={e => { e.stopPropagation(); setShowAddForm(v => !v); boop(); }}
            style={{
              background: 'rgba(57,255,20,0.08)',
              border: '1px solid rgba(57,255,20,0.28)',
              borderRadius: 5, padding: '3px 9px',
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              color: '#39FF14', cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            + ADD
          </button>
        </div>

        {/* Body */}
        {open && (
          <div style={{ padding: '6px 12px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {showAddForm && (
                <AddFocusForm onClose={() => setShowAddForm(false)} />
              )}
              {focusItems.map(focus => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  onMap={id => setMappingFocusId(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
