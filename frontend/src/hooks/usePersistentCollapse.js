import { useState, useEffect } from 'react';

// Persists each collapsible section's open/closed state in localStorage so the
// layout survives reloads. Keyed by a stable section id.
const KEY = 'superhero_hq_collapse';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export default function usePersistentCollapse(id, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    const all = readAll();
    return typeof all[id] === 'boolean' ? all[id] : defaultOpen;
  });

  useEffect(() => {
    const all = readAll();
    all[id] = open;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
  }, [id, open]);

  return [open, setOpen];
}
