import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Check, Plus } from 'lucide-react';
import usePersistentCollapse from '../hooks/usePersistentCollapse';
import { useAppContext } from '../context/AppContext';
import { boop } from '../utils/audioEngine';
import QuestMapperOverlay from './QuestMapperOverlay';

const FREQ_COLORS = { Daily: '#39FF14', Weekly: '#00E5FF', Monthly: '#FFA500', Quarterly: '#cc44ff' };

// ── Inline add-focus form (creates a new focus card) ───────────────────────────
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
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(57,255,20,0.04)',
        border: '1px dashed rgba(57,255,20,0.22)',
        borderRadius: 8, padding: '10px 12px', marginBottom: 8,
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value.toUpperCase())}
        placeholder="JOB, BODY, SITE..."
        maxLength={16}
        style={{
          flex: 1, background: 'transparent', border: 'none',
          borderBottom: '1px solid rgba(57,255,20,0.3)', color: '#39FF14',
          fontFamily: 'Space Mono, monospace', fontWeight: 700,
          letterSpacing: '0.06em', outline: 'none', padding: '2px 0',
        }}
      />
      <button type="submit" style={{
        background: '#39FF14', border: 'none', borderRadius: 4, padding: '4px 10px',
        fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, color: '#000', cursor: 'pointer',
      }}>
        ADD
      </button>
      <button type="button" onClick={onClose} style={{
        background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
        padding: '4px 7px', fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
      }}>
        ×
      </button>
    </form>
  );
}

// ── Inline add-custom-quest form (adds a custom quest to one focus) ─────────────
function AddCustomQuestForm({ focusId, onClose }) {
  const [text, setText] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [tag, setTag] = useState('Daily Power-Up');
  const { dispatch } = useAppContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: 'ADD_FOCUS_CUSTOM_QUEST', focusId, text: text.trim(), frequency, tag });
    boop();
    onClose();
  };

  const selectStyle = {
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff',
    fontSize: 11, padding: '5px 7px', borderRadius: 6, cursor: 'pointer', flex: 1,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'rgba(0,229,255,0.025)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 8, padding: '10px 12px', marginTop: 6,
      }}
    >
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Custom quest name..."
        required
        style={{
          background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', fontFamily: 'system-ui, sans-serif', outline: 'none',
          padding: '4px 0', width: '100%',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <select style={selectStyle} value={frequency} onChange={e => setFrequency(e.target.value)}>
          <option>Daily</option><option>Weekly</option><option>Monthly</option>
        </select>
        <select style={selectStyle} value={tag} onChange={e => setTag(e.target.value)}>
          <option>Daily Power-Up</option><option>Autopilot Bots</option><option>Big Missions</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="submit" style={{
          background: '#39FF14', border: 'none', borderRadius: 6, color: '#000', fontSize: 11,
          fontFamily: 'Space Mono, monospace', fontWeight: 700, padding: '5px 14px', cursor: 'pointer',
        }}>
          ADD
        </button>
        <button type="button" onClick={onClose} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
          color: 'rgba(255,255,255,0.35)', fontSize: 11, padding: '5px 10px', cursor: 'pointer',
        }}>
          CANCEL
        </button>
      </div>
    </form>
  );
}

// ── A single selectable quest row inside a focus card ──────────────────────────
function FocusQuestRow({ text, frequency, isSelected, onToggle, onDelete }) {
  const freqColor = FREQ_COLORS[frequency] || '#8B8B8D';
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px',
        borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
        background: isSelected ? 'rgba(57,255,20,0.04)' : 'transparent', transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${isSelected ? '#39FF14' : 'rgba(255,255,255,0.18)'}`,
        background: isSelected ? '#39FF14' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isSelected && <Check size={9} color="#000" strokeWidth={3.5} />}
      </div>
      <p style={{
        flex: 1, fontSize: 12.5, margin: 0, lineHeight: 1.4, minWidth: 0,
        color: isSelected ? '#fff' : '#D1D5DB',
        fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: isSelected ? 500 : 400,
      }}>
        {text}
      </p>
      <span style={{
        fontSize: 9, color: freqColor, fontFamily: 'Space Mono, monospace',
        border: `1px solid ${freqColor}25`, padding: '1px 4px', borderRadius: 3, flexShrink: 0,
      }}>
        {frequency[0]}
      </span>
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); boop(); onDelete(); }}
          title="Remove from focus"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)',
            fontSize: 13, lineHeight: 1, padding: '1px 3px', flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── A single focus card ─────────────────────────────────────────────────────────
function FocusCard({ focus, onMap }) {
  const { dispatch, questLookup, activeSprint } = useAppContext();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [open, setOpen] = usePersistentCollapse(`focus-card-${focus.id}`, true);

  const linked = focus.linkedQuestIds.map(id => questLookup[id]).filter(Boolean);
  const customQuests = focus.customQuests || [];
  const total = linked.length + customQuests.length;
  const hasQuests = total > 0;

  const allIds = [...focus.linkedQuestIds, ...customQuests.map(q => q.id)];
  const selectedCount = allIds.filter(id => activeSprint.selectedQuestIds.includes(id)).length;
  const isActive = selectedCount > 0;

  const ChevronIcon = open ? ChevronDown : ChevronRight;

  const toggle = (questId) => { boop(); dispatch({ type: 'TOGGLE_SPRINT_QUEST', questId }); };

  // Unlink a mapped (blueprint) quest from this focus. If it's currently in the
  // sprint, deselect it too so EP frees up — matching custom-quest delete.
  const unlinkMapped = (questId) => {
    if (activeSprint.selectedQuestIds.includes(questId)) {
      dispatch({ type: 'TOGGLE_SPRINT_QUEST', questId });
    }
    dispatch({ type: 'TOGGLE_QUEST_IN_FOCUS', focusId: focus.id, questId });
  };

  return (
    <div style={{
      background: isActive ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)',
      border: `1px solid ${isActive ? 'rgba(57,255,20,0.28)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 8, marginBottom: 8,
      opacity: isActive ? 1 : 0.72, transition: 'opacity 0.15s, border-color 0.15s',
    }}>
      {/* Header — always visible, tappable to collapse */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <ChevronIcon size={10} color={isActive ? 'rgba(57,255,20,0.6)' : 'rgba(255,255,255,0.2)'} style={{ flexShrink: 0 }} />
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: 12.5, fontWeight: 700,
          color: isActive ? '#39FF14' : 'rgba(57,255,20,0.5)', letterSpacing: '0.05em', flex: 1,
        }}>
          {focus.name}
        </span>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: 9,
          color: hasQuests ? 'rgba(255,255,255,0.3)' : 'rgba(255,165,0,0.55)',
        }}>
          {hasQuests ? `${selectedCount}/${total}` : 'no quests'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); boop(); dispatch({ type: 'DELETE_FOCUS', focusId: focus.id }); }}
          title="Delete focus"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.18)',
            fontSize: 15, lineHeight: 1, padding: '1px 3px', borderRadius: 3, flexShrink: 0,
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#FF3B30'; }}
          onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)'; }}
        >
          ×
        </button>
      </div>

      {/* Body — collapsible */}
      {open && (
        <div style={{ padding: '0 12px 10px' }}>
          {/* Checklist */}
          {hasQuests && (
            <div>
              {linked.map(entry => (
                <FocusQuestRow
                  key={entry.quest.id}
                  text={entry.quest.text}
                  frequency={entry.quest.frequency}
                  isSelected={activeSprint.selectedQuestIds.includes(entry.quest.id)}
                  onToggle={() => toggle(entry.quest.id)}
                  onDelete={() => unlinkMapped(entry.quest.id)}
                />
              ))}
              {customQuests.map(cq => (
                <FocusQuestRow
                  key={cq.id}
                  text={cq.text}
                  frequency={cq.frequency}
                  isSelected={activeSprint.selectedQuestIds.includes(cq.id)}
                  onToggle={() => toggle(cq.id)}
                  onDelete={() => dispatch({ type: 'DELETE_FOCUS_CUSTOM_QUEST', focusId: focus.id, questId: cq.id })}
                />
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: hasQuests ? 8 : 0 }}>
            <button
              onClick={() => onMap(focus.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', fontSize: 10,
                color: hasQuests ? 'rgba(0,229,255,0.6)' : 'rgba(255,165,0,0.7)', padding: 0,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              {hasQuests ? 'map quests' : '+ map quests'}
            </button>
            <button
              onClick={() => { setShowCustomForm(v => !v); boop(); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(57,255,20,0.6)', padding: 0,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <Plus size={10} /> add custom
            </button>
          </div>

          {showCustomForm && (
            <AddCustomQuestForm focusId={focus.id} onClose={() => setShowCustomForm(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function FocusModePanel() {
  const { focusItems } = useAppContext();
  const [open, setOpen] = usePersistentCollapse('focus', true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mappingFocusId, setMappingFocusId] = useState(null);

  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <>
      {mappingFocusId && (
        <QuestMapperOverlay focusId={mappingFocusId} onClose={() => setMappingFocusId(null)} />
      )}

      <div style={{
        borderBottom: '1px solid rgba(57,255,20,0.1)', background: 'rgba(57,255,20,0.008)', flexShrink: 0,
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', cursor: 'pointer', userSelect: 'none' }}
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
              background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.28)',
              borderRadius: 5, padding: '3px 9px', fontFamily: 'Space Mono, monospace',
              fontSize: 10, color: '#39FF14', cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            + ADD
          </button>
        </div>

        {/* Body */}
        {open && (
          <div style={{ padding: '6px 14px 12px' }}>
            {showAddForm && <AddFocusForm onClose={() => setShowAddForm(false)} />}
            {focusItems.map(focus => (
              <FocusCard key={focus.id} focus={focus} onMap={id => setMappingFocusId(id)} />
            ))}
            {focusItems.length === 0 && !showAddForm && (
              <p style={{
                fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)',
                textAlign: 'center', padding: '8px 0', margin: 0,
              }}>
                No focuses yet — tap + ADD to create one
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
