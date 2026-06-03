const fs = require('fs');

// We will simulate localStorage
let DB = {
  students: [
    {
      id: 'abc',
      name: 'Test Student',
      history: [{ date: '10 ene' }],
      measurements: [{ weight: 80 }]
    }
  ],
  version: 9
};

const KEY = 'fittrack_v9';
let mockStorage = {
  [KEY]: JSON.stringify(DB)
};

const localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => mockStorage[k] = v
};

function migrateV9ToV10(p) {
  if (!p.students) return p;
  p.students = p.students.map(s => {
    s.syncStatus = s.syncStatus || 'pending';
    s.createdAt = s.createdAt || new Date().toISOString();
    s.updatedAt = s.updatedAt || new Date().toISOString();
    s.routineSyncStatus = s.routineSyncStatus || 'pending';
    s.routineUpdatedAt = s.routineUpdatedAt || new Date().toISOString();
    s.notesSyncStatus = s.notesSyncStatus || 'pending';
    s.isDeleted = s.isDeleted || false;

    if (s.history) {
      s.history.forEach(h => {
        if (!h.id) h.id = crypto.randomUUID();
        h.syncStatus = h.syncStatus || 'pending';
      });
    }
    if (s.measurements) {
      s.measurements.forEach(m => {
        if (!m.id) m.id = crypto.randomUUID();
        m.syncStatus = m.syncStatus || 'pending';
      });
    }
    return s;
  });
  p.version = 10;
  return p;
}

function loadState() {
  try {
    const d = localStorage.getItem(KEY);
    if (!d) return null;
    let p = JSON.parse(d);
    
    // Apply migrations
    if (p.students) {
      const currentYear = new Date().getFullYear();
      
      p.students = p.students.map(s => {
        const newExNotes = {};
        if (s.exerciseNotes) {
          const allExs = s.routine ? s.routine.flatMap(d => d.exercises) : [];
          Object.entries(s.exerciseNotes).forEach(([k, v]) => {
            const match = allExs.find(e => e.name === k);
            if (match) newExNotes[match.id] = v;
            else newExNotes[k] = v; // Keep by name if not found
          });
        }
        
        if (s.history) {
          s.history.forEach(sess => {
            if (!sess.dateISO) {
              const parts = (sess.date || '').split(' ');
              if (parts.length === 2) {
                const months = { 'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11 };
                const mStr = parts[1].toLowerCase().replace('.', '');
                const m = months[mStr];
                if (m !== undefined) {
                  const dateObj = new Date(currentYear, m, parseInt(parts[0]));
                  if (dateObj > new Date()) dateObj.setFullYear(currentYear - 1);
                  sess.dateISO = dateObj.toISOString();
                } else {
                  sess.dateISO = new Date().toISOString();
                }
              } else {
                sess.dateISO = new Date().toISOString();
              }
            }
          });
          s.history.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
        }

        return {notes: '', exerciseNotes: newExNotes, ...s};
      });
    }
    if (!p.theme) p.theme = 'emerald';
    
    if (!p.version || p.version < 10) {
      p = migrateV9ToV10(p);
      localStorage.setItem(KEY, JSON.stringify(p));
    }
    
    return p;
  } catch (e) {
    console.error("CAUGHT ERROR:", e);
    return null;
  }
}

let loaded = loadState();
console.log(loaded);
