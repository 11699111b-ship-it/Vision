import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, Flame, Shield, Trophy } from 'lucide-react';
import Confetti from 'react-confetti';
import { useAppContext } from '../context/AppContext';
import ProgressRing from './ProgressRing';
import { boop, playSuccess, playTriumphant, playLowPitch } from '../utils/audioEngine';

// ── Section divider ──────────────────────────────────────────────────────────
function SectionHeader({ label, done, total }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-6">
      <span style={{
        fontSize: 11,
        fontFamily: 'Space Mono, monospace',
        letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.28)',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      {total > 0 && (
        <span style={{
          fontSize: 11,
          fontFamily: 'Space Mono, monospace',
          color: 'rgba(255,255,255,0.22)',
          flexShrink: 0,
        }}>
          {done}/{total}
        </span>
      )}
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ quest, goal, isCompleted, onToggle }) {
  return (
    <motion.div
      data-testid={`task-card-${quest.id}`}
      className="flex items-center gap-4 p-4 mb-2 cursor-pointer"
      style={{
        background: '#161616',
        borderRadius: 14,
        border: `1px solid ${isCompleted ? 'rgba(57,255,20,0.45)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'border-color 0.2s',
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { boop(); onToggle(quest.id); }}
    >
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: isCompleted ? '#39FF14' : 'rgba(255,255,255,0.14)',
        boxShadow: isCompleted ? '0 0 5px rgba(57,255,20,0.5)' : 'none',
        transition: 'all 0.2s',
      }} />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 16,
          fontWeight: 700,
          color: isCompleted ? 'rgba(255,255,255,0.38)' : '#ffffff',
          textDecorationLine: isCompleted ? 'line-through' : 'none',
          textDecorationColor: 'rgba(255,255,255,0.25)',
          margin: 0,
          lineHeight: 1.3,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}>
          {quest.text}
        </p>
        <p style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.26)',
          margin: '3px 0 0',
          letterSpacing: '0.12em',
          fontFamily: 'Space Mono, monospace',
          textTransform: 'uppercase',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {goal.name}
        </p>
      </div>

      {/* Toggle circle */}
      <motion.div
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${isCompleted ? '#39FF14' : 'rgba(255,255,255,0.18)'}`,
          background: isCompleted ? '#39FF14' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        animate={isCompleted ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.25 }}
      >
        {isCompleted && <Check size={14} color="#000" strokeWidth={3.5} />}
      </motion.div>
    </motion.div>
  );
}

// ── Submission overlay ────────────────────────────────────────────────────────
function SubmissionOverlay({ result, onClose }) {
  const { percentage, isPerfect } = result;
  const w = typeof window !== 'undefined' ? window.innerWidth : 800;
  const h = typeof window !== 'undefined' ? window.innerHeight : 600;

  const accent = percentage === 100 ? '#39FF14' : percentage >= 50 ? '#00E5FF' : '#ef4444';
  const label = percentage === 100
    ? 'MISSION ACCOMPLISHED'
    : percentage >= 50
      ? 'SOLID EFFORT'
      : 'RESET & CONQUER';
  const sub = percentage === 100
    ? 'Perfect week, Boss Anurag. You leveled up!'
    : percentage >= 50
      ? 'Almost there. Keep pushing, Boss Anurag.'
      : 'Rough week, but we kept the lights on.';

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {isPerfect && <Confetti width={w} height={h} recycle={false} numberOfPieces={400} colors={['#39FF14', '#00E5FF', '#FFA500', '#ffffff']} />}
      {!isPerfect && percentage >= 50 && <Confetti width={w} height={h} recycle={false} numberOfPieces={120} colors={['#00E5FF', '#39FF14']} />}

      <motion.div
        className="text-center p-10"
        style={{ background: '#111', borderRadius: 20, border: `1px solid ${accent}33`, maxWidth: 420, width: '90%' }}
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
      >
        <p className="font-orbitron mb-2" style={{ fontSize: 11, color: accent, letterSpacing: '0.2em' }}>
          WEEKLY MISSION COMPLETE
        </p>
        <p style={{
          fontSize: 72, fontWeight: 900, color: accent, lineHeight: 1, margin: '8px 0 16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {percentage}%
        </p>
        <p className="font-orbitron mb-1" style={{ fontSize: 13, color: '#ffffff', letterSpacing: '0.12em' }}>
          {label}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Space Mono, monospace', lineHeight: 1.65, marginBottom: 28 }}>
          {sub}
        </p>
        <motion.button
          data-testid="return-to-hq-btn"
          onClick={onClose}
          style={{
            background: accent, border: 'none', borderRadius: 10,
            color: percentage >= 50 ? '#000' : '#fff',
            fontSize: 13, fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
            letterSpacing: '0.15em', padding: '14px 32px', cursor: 'pointer', width: '100%',
          }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          RETURN TO HQ
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrackingMode() {
  const { activeSprint, questLookup, dailyProgress, streak, buffers, dispatch, submissionResult } = useAppContext();
  const { selectedQuestIds, completedTodayIds, completedWeeklyIds } = activeSprint;

  const dailyTasks = useMemo(() => selectedQuestIds.filter(id => questLookup[id]?.quest.frequency === 'Daily'), [selectedQuestIds, questLookup]);
  const weeklyTasks = useMemo(() => selectedQuestIds.filter(id => questLookup[id]?.quest.frequency !== 'Daily'), [selectedQuestIds, questLookup]);

  const dailyDone = completedTodayIds.filter(id => dailyTasks.includes(id)).length;
  const weeklyDone = completedWeeklyIds.filter(id => weeklyTasks.includes(id)).length;

  const handleToggle = (questId) => dispatch({ type: 'TOGGLE_COMPLETE', questId });

  const handleSubmit = () => {
    const total = selectedQuestIds.length;
    if (total === 0) return;
    const pct = Math.round(((dailyDone + weeklyDone) / total) * 100);
    if (pct === 100) { playTriumphant(); }
    else if (pct >= 50) { playSuccess(); }
    else { playLowPitch(); }
    dispatch({ type: 'SUBMIT_MISSION' });
  };

  return (
    <motion.div
      data-testid="tracking-mode-container"
      className="w-full h-screen flex flex-col"
      style={{ background: '#0a0a0a' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Nav */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.button
          data-testid="hq-visit-btn"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'hq-visit' })}
          className="flex items-center gap-2"
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
          whileHover={{ borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }}
          whileTap={{ scale: 0.95 }}
        >
          <Building2 size={14} color="#8B8B8D" />
          <span className="font-orbitron" style={{ fontSize: 9, color: '#8B8B8D', letterSpacing: '0.15em' }}>VISIT HQ</span>
        </motion.button>

        <h1 className="font-orbitron" style={{ fontSize: 11, color: '#39FF14', letterSpacing: '0.2em' }}>
          ACTIVE PROTOCOL
        </h1>

        <div style={{ width: 80 }} /> {/* spacer to keep title centered */}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>

        {/* Progress ring + streak */}
        <div className="flex flex-col items-center mb-2 pt-2">
          <ProgressRing percentage={dailyProgress} size={164} strokeWidth={9} />

          <p style={{
            fontSize: 52,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
            margin: '14px 0 8px',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            letterSpacing: '-0.02em',
          }}>
            {streak} <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.02em' }}>DAYS</span>
          </p>

          {/* Buffer pill */}
          <motion.div
            data-testid="buffer-badge"
            style={{
              padding: '5px 16px',
              borderRadius: 20,
              background: buffers > 0 ? 'rgba(57,255,20,0.08)' : 'rgba(239,68,68,0.14)',
              border: `1px solid ${buffers > 0 ? 'rgba(57,255,20,0.28)' : 'rgba(239,68,68,0.4)'}`,
            }}
            animate={buffers === 0 ? { borderColor: ['rgba(239,68,68,0.4)', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.4)'] } : {}}
            transition={{ duration: 1.8, repeat: buffers === 0 ? Infinity : 0 }}
          >
            <span style={{
              fontSize: 11,
              fontFamily: 'Space Mono, monospace',
              letterSpacing: '0.12em',
              color: buffers > 0 ? '#39FF14' : '#ef4444',
            }}>
              {buffers > 0
                ? `${buffers}/2 BUFFERS`
                : 'BUFFER USED'}
            </span>
          </motion.div>
        </div>

        {/* Daily tasks */}
        {dailyTasks.length > 0 && (
          <>
            <SectionHeader label="DAILY PROTOCOL" done={dailyDone} total={dailyTasks.length} />
            {dailyTasks.map(questId => {
              const entry = questLookup[questId];
              if (!entry) return null;
              return (
                <TaskCard
                  key={questId}
                  quest={entry.quest}
                  goal={entry.goal}
                  isCompleted={completedTodayIds.includes(questId)}
                  onToggle={handleToggle}
                />
              );
            })}
          </>
        )}

        {/* Weekly tasks */}
        {weeklyTasks.length > 0 && (
          <>
            <SectionHeader label="WEEKLY TASKS" done={weeklyDone} total={weeklyTasks.length} />
            {weeklyTasks.map(questId => {
              const entry = questLookup[questId];
              if (!entry) return null;
              return (
                <TaskCard
                  key={questId}
                  quest={entry.quest}
                  goal={entry.goal}
                  isCompleted={completedWeeklyIds.includes(questId)}
                  onToggle={handleToggle}
                />
              );
            })}
          </>
        )}

        {selectedQuestIds.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.2)', fontFamily: 'Space Mono, monospace', marginTop: 40 }}>
            No quests selected for this sprint.
          </p>
        )}

        <div style={{ height: 100 }} />
      </div>

      {/* Submit button */}
      <div className="px-5 pb-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.button
          data-testid="submit-mission-btn"
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-3 py-4 font-orbitron font-black"
          style={{
            background: 'transparent',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            letterSpacing: '0.2em',
            cursor: 'pointer',
          }}
          whileHover={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
          whileTap={{ scale: 0.97 }}
        >
          <Trophy size={14} />
          END & SUBMIT WEEKLY MISSION
        </motion.button>
      </div>

      {/* Submission overlay */}
      <AnimatePresence>
        {submissionResult && (
          <SubmissionOverlay result={submissionResult} onClose={() => dispatch({ type: 'CLEAR_SUBMISSION' })} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
