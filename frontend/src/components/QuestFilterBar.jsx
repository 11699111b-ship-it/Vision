import React from 'react';
import { Search, X } from 'lucide-react';

export function filterFloors(floors, query) {
  const q = query.trim().toLowerCase();
  if (!q) return floors;
  return floors.reduce((acc, floor) => {
    const filteredRooms = floor.rooms.reduce((racc, room) => {
      const allGoals = [...room.goals, ...(room.customGoals || [])];
      const filteredGoals = allGoals.reduce((gacc, goal) => {
        const matchesGoal = goal.name.toLowerCase().includes(q);
        const quests = matchesGoal
          ? goal.quests
          : goal.quests.filter(quest => quest.text.toLowerCase().includes(q));
        if (!quests.length) return gacc;
        return [...gacc, { ...goal, quests }];
      }, []);
      if (!filteredGoals.length) return racc;
      return [...racc, { ...room, goals: filteredGoals, customGoals: [] }];
    }, []);
    if (!filteredRooms.length) return acc;
    return [...acc, { ...floor, rooms: filteredRooms }];
  }, []);
}

export default function QuestFilterBar({ value, onChange }) {
  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${value ? 'rgba(57,255,20,0.25)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8, padding: '7px 10px',
        transition: 'border-color 0.15s',
      }}>
        <Search size={13} color={value ? '#39FF14' : 'rgba(255,255,255,0.28)'} style={{ flexShrink: 0 }} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="filter quests..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 13,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <X size={13} color="rgba(255,255,255,0.35)" />
          </button>
        )}
      </div>
    </div>
  );
}
