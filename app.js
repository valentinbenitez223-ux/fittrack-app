(function(){
'use strict';

// ═══════════════════════════════════════════════════════════
//  LAYER 1 — DATA STRUCTURES & BASE CONFIGURATION
// ═══════════════════════════════════════════════════════════
const KEY = 'fittrack_v9';

// Default routine based on gym-standard guidelines
const BASE_ROUTINE = [
  {id: 0, day: 'Lunes', focus: 'Pecho + Espalda', isRest: false, exercises: [
    {id: 'l1', name: 'Press de banca', sets: 4, reps: 8, weight: 50},
    {id: 'l2', name: 'Press inclinado', sets: 4, reps: 10, weight: 40},
    {id: 'l3', name: 'Aperturas', sets: 4, reps: 10, weight: 15},
    {id: 'l4', name: 'Remo c/ barra', sets: 4, reps: 10, weight: 50},
    {id: 'l5', name: 'Remo c/ mancuerna', sets: 4, reps: 10, weight: 20},
    {id: 'l6', name: 'Pullover', sets: 4, reps: 10, weight: 15}
  ]},
  {id: 1, day: 'Martes', focus: 'Bíceps + Tríceps + Abs', isRest: false, exercises: [
    {id: 'm1', name: 'Curl de bíceps', sets: 3, reps: 10, weight: 15},
    {id: 'm2', name: 'Curl martillo', sets: 3, reps: 10, weight: 14},
    {id: 'm3', name: 'Tríceps barra', sets: 3, reps: 8, weight: 20},
    {id: 'm4', name: 'Tríceps mancuerna', sets: 3, reps: 10, weight: 10},
    {id: 'm5', name: 'Abdominales', sets: 3, reps: 20, weight: 0}
  ]},
  {id: 2, day: 'Miércoles', focus: 'Descanso', isRest: true, exercises: []},
  {id: 3, day: 'Jueves', focus: 'Piernas + Hombros', isRest: false, exercises: [
    {id: 'j1', name: 'Sentadilla c/ barra', sets: 4, reps: 10, weight: 40},
    {id: 'j2', name: 'Peso muerto', sets: 4, reps: 10, weight: 50},
    {id: 'j3', name: 'Hip thrust', sets: 4, reps: 12, weight: 50},
    {id: 'j4', name: 'Estocada', sets: 4, reps: 10, weight: 10},
    {id: 'j5', name: 'Elevaciones laterales', sets: 3, reps: 10, weight: 5},
    {id: 'j6', name: 'Press militar', sets: 3, reps: 10, weight: 15},
    {id: 'j7', name: 'Gemelos', sets: 4, reps: 15, weight: 30}
  ]},
  {id: 4, day: 'Viernes', focus: 'Pecho + Espalda', isRest: false, exercises: [
    {id: 'v1', name: 'Press de banca', sets: 4, reps: 8, weight: 50},
    {id: 'v2', name: 'Press inclinado', sets: 4, reps: 10, weight: 40},
    {id: 'v3', name: 'Remo c/ barra', sets: 4, reps: 10, weight: 50},
    {id: 'v4', name: 'Remo c/ mancuerna', sets: 4, reps: 10, weight: 20}
  ]},
  {id: 5, day: 'Sábado', focus: 'Descanso', isRest: true, exercises: []},
  {id: 6, day: 'Domingo', focus: 'Descanso', isRest: true, exercises: []}
];

// Helper Functions
const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
};

const clone = x => JSON.parse(JSON.stringify(x));
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const todayI = () => {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // Mon=0, Tue=1, ..., Sun=6
};
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const initls = n => {
  const p = n.trim().split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
};
const bmi = (w, h) => (w / Math.pow(h / 100, 2)).toFixed(1);
const bmiLbl = b => b < 18.5 ? ['Bajo peso', 'var(--blue)'] : b < 25 ? ['Normal', 'var(--em)'] : b < 30 ? ['Sobrepeso', 'var(--amber)'] : ['Obesidad', 'var(--red)'];
const estDur = d => d.exercises.length * 4;
const todayStr = () => new Date().toLocaleDateString('es-AR', {day: 'numeric', month: 'short'});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function totalVolume(s) {
  let t = 0;
  s.history.forEach(sess => sess.exercises.forEach(ex => {
    t += parseFloat(ex.actualWeight || 0) * parseInt(ex.actualReps || 0) * (ex.sets || 4);
  }));
  return t < 1000 ? t.toFixed(0) : (t / 1000).toFixed(1) + 't';
}

function calcStreak(s) {
  if (!s.history || !s.history.length) return 0;
  
  const getWeekStr = (isoStr) => {
    const d = new Date(isoStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  
  const weeks = [...new Set(s.history.map(sess => getWeekStr(sess.dateISO)))].sort((a, b) => b.localeCompare(a));
  
  let streak = 0;
  const currentWeekStr = getWeekStr(new Date().toISOString());
  
  const getPrevWeekStr = (weekStr) => {
    const [y, m, d] = weekStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  };
  
  const lastWeekStr = getPrevWeekStr(currentWeekStr);
  
  if (weeks[0] !== currentWeekStr && weeks[0] !== lastWeekStr) {
    return 0;
  }
  
  let expectedWeek = weeks[0];
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i] === expectedWeek) {
      streak++;
      expectedWeek = getPrevWeekStr(expectedWeek);
    } else {
      break;
    }
  }
  return streak;
}

function allExerciseNames(s) {
  return [...new Set(s.history.flatMap(sess => sess.exercises.map(ex => ex.name)))].sort();
}

function freshStudent(name) {
  return {
    id: generateId(), 
    name, 
    isDeleted: false,
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    routineSyncStatus: 'pending',
    routineUpdatedAt: new Date().toISOString(),
    notesSyncStatus: 'pending',
    notes: '', 
    exerciseNotes: {}, 
    routine: clone(BASE_ROUTINE), 
    history: [], 
    measurements: []
  };
}

// ═══════════════════════════════════════════════════════════
//  LAYER 2 — APPLICATION STATE & DATA PERSISTENCE
// ═══════════════════════════════════════════════════════════
function loadState() {
  try {
    const d = localStorage.getItem(KEY);
    if (!d) return null;
    const p = JSON.parse(d);
    
    // Apply migrations
    if (p.students) {
      const currentYear = new Date().getFullYear();
      
      p.students = p.students.map(s => {
        // Migrate exerciseNotes mapping (name -> ID)
        const newExNotes = {};
        if (s.exerciseNotes) {
          const allExs = s.routine ? s.routine.flatMap(d => d.exercises) : [];
          Object.entries(s.exerciseNotes).forEach(([k, v]) => {
            const match = allExs.find(e => e.name === k);
            if (match) newExNotes[match.id] = v;
            else newExNotes[k] = v; // Keep by name if not found
          });
        }
        
        // Migrate history dates to dateISO
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
          // Sort history by date descending
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
  } catch {
    return null;
  }
}

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
        if (!h.id) h.id = generateId();
        h.syncStatus = h.syncStatus || 'pending';
      });
    }
    if (s.measurements) {
      s.measurements.forEach(m => {
        if (!m.id) m.id = generateId();
        m.syncStatus = m.syncStatus || 'pending';
      });
    }
    return s;
  });
  p.version = 10;
  return p;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(DB));
    if (window.SyncEngine) window.SyncEngine.triggerPush();
  } catch {}
}

function markRoutineUpdated(s) {
  s.routineUpdatedAt = new Date().toISOString();
  s.routineSyncStatus = 'pending';
}

function markStudentUpdated(s) {
  s.updatedAt = new Date().toISOString();
  s.syncStatus = 'pending';
}

const DB = loadState() || {
  theme: 'emerald',
  students: []
};
if (!DB.presets) DB.presets = [];

// Auto-populate default presets if none exist
if (DB.presets.length === 0 && !DB.presetsInitialized) {
  DB.presets = [
    { id: generateId(), name: 'Pecho y Espalda (Fuerza)', focus: 'Pecho + Espalda', exercises: clone(BASE_ROUTINE[0].exercises).map(e => ({...e, id: generateId()})) },
    { id: generateId(), name: 'Brazos y Core', focus: 'Bíceps + Tríceps + Abs', exercises: clone(BASE_ROUTINE[1].exercises).map(e => ({...e, id: generateId()})) },
    { id: generateId(), name: 'Piernas y Hombros', focus: 'Piernas + Hombros', exercises: clone(BASE_ROUTINE[3].exercises).map(e => ({...e, id: generateId()})) },
    { id: generateId(), name: 'Pecho y Espalda (Vol)', focus: 'Pecho + Espalda', exercises: clone(BASE_ROUTINE[4].exercises).map(e => ({...e, id: generateId()})) }
  ];
  DB.presetsInitialized = true;
  persist();
}

// Memory-only UX States
const UI = {
  view: 'list',      // 'list' | 'student' | 'workout'
  studentId: null,
  tab: 'plan',       // 'plan' | 'strength' | 'body' | 'history' | 'notes'
  modal: null,       // null | string key
  modalData: {},
  search: '',
  selExercise: '',
  noteSaved: false,
  
  // Active workout states
  wDay: null, 
  wData: [], 
  wStart: 0, 
  wElapsed: 0, 
  wTimerRef: null,
  
  // Rest timer states
  rtSec: 90, 
  rtRemain: 90, 
  rtRef: null,
  
  // Edit Routine states
  editDayIdx: null,
  editPresetId: null
};

function getStudent() {
  return DB.students.find(s => s.id === UI.studentId);
}

// ═══════════════════════════════════════════════════════════
//  LAYER 3 — DOM INJECTION & UTILITIES
// ═══════════════════════════════════════════════════════════
function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k.startsWith('data-')) {
      const camelCaseKey = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      node.dataset[camelCaseKey] = v;
    } else {
      node[k] = v;
    }
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return node;
}

const div = (attrs, ...kids) => el('div', attrs, ...kids);
const span = (attrs, ...kids) => el('span', attrs, ...kids);
const btn = (attrs, ...kids) => el('button', attrs, ...kids);
const icon = cls => {
  const i = document.createElement('i');
  i.className = cls;
  return i;
};

function stampTemplate(id) {
  const tpl = document.getElementById(id);
  root.innerHTML = '';
  root.appendChild(tpl.content.cloneNode(true));
  return root;
}

function setText(id, val) {
  const n = document.getElementById(id);
  if (n) n.textContent = val;
}

function setStyle(id, prop, val) {
  const n = document.getElementById(id);
  if (n) n.style[prop] = val;
}

// ═══════════════════════════════════════════════════════════
//  LAYER 4 — VIEW RENDER ENGINE
// ═══════════════════════════════════════════════════════════
function renderList() {
  stampTemplate('t-list');

  const today = todayStr();
  const active = DB.students.filter(s => s.history.length && s.history[0].date === today).length;
  setText('stat-total', DB.students.length);
  setText('stat-today', active);
  setText('stat-hist', DB.students.filter(s => s.history.length).length);

  document.getElementById('search-inp').value = UI.search;

  const list = document.getElementById('student-list');
  const filtered = DB.students.filter(s => !s.isDeleted && s.name.toLowerCase().includes(UI.search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!filtered.length) {
    list.appendChild(div({style: {textAlign: 'center', padding: '48px 16px', color: 'var(--t3)'}},
      icon('fa-solid fa-users-slash'), document.createTextNode(UI.search ? ' Sin resultados' : ' Agregá tu primer alumno')
    ));
    return;
  }

  const todayStrIso = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const groups = {
    today: [],
    pending: [],
    normal: []
  };
  
  filtered.forEach(s => {
    if (!s.history.length) {
      groups.pending.push(s);
    } else {
      const lastSessionDate = new Date(s.history[0].dateISO);
      if (lastSessionDate.toISOString().split('T')[0] === todayStrIso) {
        groups.today.push(s);
      } else if (lastSessionDate < sevenDaysAgo) {
        groups.pending.push(s);
      } else {
        groups.normal.push(s);
      }
    }
  });

  const renderCard = (s, i) => {
    const last = s.history.length ? s.history[0].date : '—';
    const sessions = s.history.length;
    const lastW = s.measurements.length ? s.measurements[s.measurements.length - 1].weight : null;

    const card = div({
      'data-action': 'open-student',
      'data-sid': s.id,
      className: 'card card-i au',
      style: {display: 'flex', gap: '14px', alignItems: 'center', animationDelay: (i * 0.04) + 's'}
    },
      div({style: {
        width: '46px', height: '46px', borderRadius: '50%', background: 'var(--em-dim)',
        border: '1.5px solid var(--em-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: '0', fontFamily: 'Syne, sans-serif', fontWeight: '700', fontSize: '17px', color: 'var(--em)'
      }},
        initls(s.name)
      ),
      div({style: {flex: '1', minWidth: '0'}},
        div({className: 'syne', style: {fontWeight: '700', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}, s.name),
        div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '2px'}}, `Último: ${last} · ${sessions} sesión${sessions !== 1 ? 'es' : ''}`)
      ),
      div({style: {display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'}},
        lastW ? div({className: 'syne', style: {fontSize: '14px', fontWeight: '700'}}, lastW + 'kg') : null,
        icon('fa-solid fa-chevron-right')
      )
    );
    list.appendChild(card);
  };

  if (groups.today.length && !UI.search) {
    list.appendChild(div({className: 'syne', style: {fontSize: '12px', fontWeight: '800', color: 'var(--em)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '4px', marginBottom: '-4px'}}, 'Actividad de Hoy'));
    groups.today.forEach(renderCard);
  }
  
  if (groups.pending.length && !UI.search) {
    list.appendChild(div({className: 'syne', style: {fontSize: '12px', fontWeight: '800', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '12px', marginBottom: '-4px'}}, 'Atención Requerida (>7 días)'));
    groups.pending.forEach(renderCard);
  }
  
  if (groups.normal.length || UI.search) {
    if (!UI.search && (groups.today.length || groups.pending.length)) {
      list.appendChild(div({className: 'syne', style: {fontSize: '12px', fontWeight: '800', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '12px', marginBottom: '-4px'}}, 'Todos los alumnos'));
    }
    const targetList = UI.search ? filtered : groups.normal;
    targetList.forEach(renderCard);
  }
}

function renderStudent() {
  const s = getStudent();
  if (!s) {
    UI.view = 'list';
    renderList();
    return;
  }

  stampTemplate('t-student-shell');
  setText('s-name', s.name);

  // Configure tab links
  document.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.dataset.tab === UI.tab;
    b.classList.toggle('on', on);
    let ul = b.querySelector('.tab-ul');
    if (on && !ul) {
      ul = div({className: 'tab-ul'});
      b.appendChild(ul);
    } else if (!on && ul) {
      ul.remove();
    }
  });

  fillTab(s);
}

function moveDay(idx, dir) {
  const s = getStudent();
  const target = idx + dir;
  if (target >= 0 && target < s.routine.length) {
    const temp = s.routine[idx];
    s.routine[idx] = s.routine[target];
    s.routine[target] = temp;
    persist();
    fillTab(s);
  }
}

function fillTab(s) {
  const content = document.getElementById('tab-content');
  if (!content) return;
  content.innerHTML = '';
  
  const node =
    UI.tab === 'plan'     ? buildTabPlan(s)     :
    UI.tab === 'strength' ? buildTabStrength(s) :
    UI.tab === 'body'     ? buildTabBody(s)     :
    UI.tab === 'history'  ? buildTabHistory(s)  :
                            buildTabNotes(s);
  content.appendChild(node);
}

// ── TAB: ROUTINE (PLAN) ──
function buildTabPlan(s) {
  const today = todayI();
  const wrap = div({style: {display: 'flex', flexDirection: 'column', gap: '12px'}});

  // Stats Grid
  const stats = div({style: {display: 'flex', gap: '10px', marginBottom: '4px'}});
  [
    [calcStreak(s), 'Racha (sem)', 'var(--em)'],
    [s.history.length, 'Sesiones', null],
    [totalVolume(s), 'Volumen', null]
  ].forEach(([v, l, c]) => {
    stats.appendChild(div({className: 'sm', style: {flex: '1'}},
      div({className: 'v', style: c ? {color: c} : {}}, String(v)),
      div({className: 'l'}, l)
    ));
  });
  wrap.appendChild(stats);
  
  wrap.appendChild(div({style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px'}},
    div({className: 'syne', style: {fontSize: '12px', fontWeight: '800', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.05em'}}, 'Diseño de la Rutina'),
    div({style: {fontSize: '11px', color: 'var(--t3)'}}, 'Tocá el ícono ⚙️ para editar')
  ));

  s.routine.forEach((day, idx) => {
    const isToday = idx === today;
    const isRest = day.isRest;
    const card = div({
      className: 'card' + (isRest ? '' : ' card-i au'),
      style: {
        position: 'relative', overflow: 'hidden',
        ...(isToday && !isRest ? {borderColor: 'var(--em)'} : {}),
        ...(isRest ? {opacity: '.45'} : {})
      },
      ...(!isRest ? {'data-action': 'start-workout', 'data-day-idx': idx} : {})
    });

    if (isToday && !isRest) {
      card.appendChild(div({className: 'today-b'}, 'HOY'));
    }

    const row = div({style: {display: 'flex', alignItems: 'center', gap: '14px'}});
    row.appendChild(div({style: {width: '36px', textAlign: 'center', flexShrink: '0'}},
      div({className: 'syne', style: {
        fontSize: '11px', fontWeight: '800',
        color: isToday && !isRest ? 'var(--em)' : 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em'
      }}, day.day.slice(0, 3))
    ));

    const info = div({style: {flex: '1', minWidth: '0'}});
    info.appendChild(div({className: 'syne', style: {
      fontWeight: '700', fontSize: '15px',
      ...(isToday && !isRest ? {color: 'var(--em)'} : {})
    }}, day.focus));

    if (!isRest) {
      info.appendChild(div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '3px'}},
        `${day.exercises.length} ejercicios · ~${estDur(day)} min`));
    }
    row.appendChild(info);

    if (idx > 0) {
      const upBtn = btn({style: {background: 'none', border: 'none', color: 'var(--t3)', padding: '6px', cursor: 'pointer'}}, icon('fa-solid fa-arrow-up'));
      upBtn.onclick = e => { e.stopPropagation(); moveDay(idx, -1); };
      row.appendChild(upBtn);
    }
    if (idx < s.routine.length - 1) {
      const dnBtn = btn({style: {background: 'none', border: 'none', color: 'var(--t3)', padding: '6px', cursor: 'pointer'}}, icon('fa-solid fa-arrow-down'));
      dnBtn.onclick = e => { e.stopPropagation(); moveDay(idx, 1); };
      row.appendChild(dnBtn);
    }

    const editBtn = btn({
      'data-action': 'open-edit-day', 'data-idx': String(idx),
      style: {width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '15px', zIndex: '2'}
    }, icon('fa-solid fa-gear'));
    
    editBtn.onclick = e => { 
      e.stopPropagation(); 
      UI.editDayIdx = idx;
      openModal('editDay');
    };
    row.appendChild(editBtn);

    if (!isRest) {
      const pb = div({style: {
        width: '36px', height: '36px', borderRadius: '50%',
        background: isToday ? 'var(--em)' : 'var(--s2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: isToday ? '#030308' : 'var(--t2)', flexShrink: '0', fontSize: '13px',
        border: isToday ? 'none' : '1px solid var(--bd)'
      }});
      pb.appendChild(icon('fa-solid fa-play'));
      row.appendChild(pb);
    } else {
      row.appendChild(icon('fa-solid fa-moon'));
    }
    card.appendChild(row);

    // Mini Exercise tag chips
    if (!isRest && day.exercises.length) {
      const pills = div({style: {marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px'}});
      day.exercises.slice(0, 4).forEach(ex => {
        pills.appendChild(span({className: 'pill pill-b', style: {fontSize: '9px', padding: '3px 8px'}}, 
          ex.name.split(' ').slice(0, 2).join(' ')
        ));
      });
      if (day.exercises.length > 4) {
        pills.appendChild(span({className: 'pill', style: {background: 'var(--s3)', color: 'var(--t3)', fontSize: '9px', padding: '3px 8px'}},
          `+${day.exercises.length - 4}`
        ));
      }
      card.appendChild(pills);
    }
    wrap.appendChild(card);
  });
  
  wrap.appendChild(btn({
    className: 'btn-i',
    'data-action': 'add-day',
    style: {width: '100%', padding: '14px', border: '1px dashed var(--bd)', borderRadius: 'var(--r)', color: 'var(--t3)', fontFamily: 'Syne, sans-serif', fontWeight: '700', fontSize: '14px'}
  }, icon('fa-solid fa-plus'), ' Agregar Día a la Rutina'));
  
  return wrap;
}

// ── TAB: STRENGTH PROGRESION ──
function buildTabStrength(s) {
  const names = allExerciseNames(s);
  if (!names.length) {
    return buildEmpty('fa-dumbbell', 'Sin datos de fuerza aún', 'Completá tu primer entrenamiento registrado para activar este gráfico.');
  }

  const sel = names.includes(UI.selExercise) ? UI.selExercise : names[0];
  const prog = s.history
    .map(sess => {
      const ex = sess.exercises.find(e => e.name === sel);
      if (!ex) return null;
      const w = parseFloat(ex.actualWeight);
      const r = ex.actualReps;
      const rm = (w > 0 && r > 0) ? Math.round(w * (1 + 0.0333 * r)) : 0;
      const vol = (w * r * ex.sets) || 0; // Volumen proyectado
      return {date: sess.date, weight: w, reps: r, rm, vol};
    })
    .filter(Boolean).reverse();

  const pr = prog.length ? Math.max(...prog.map(d => d.weight)) : 0;
  const prRm = prog.length ? Math.max(...prog.map(d => d.rm)) : 0;
  const lastRm = prog.length ? prog[prog.length - 1].rm : 0;
  const prevRm = prog.length > 1 ? prog[prog.length - 2].rm : null;
  const diff = prevRm !== null ? ((lastRm - prevRm) / prevRm * 100).toFixed(1) : null;
  const diffPos = diff !== null && parseFloat(diff) >= 0;
  const target = s.routine.flatMap(d => d.exercises).find(e => e.name === sel);

  const wrap = div({style: {display: 'flex', flexDirection: 'column', gap: '14px'}});

  // Dropdown exercise selector
  const selEl = el('select', {className: 'inp syne', style: {fontWeight: '700', fontSize: '14px'}});
  names.forEach(n => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    if (n === sel) o.selected = true;
    selEl.appendChild(o);
  });
  wrap.appendChild(selEl);

  // Statistics Display
  const stats = div({style: {display: 'flex', gap: '8px'}});
  [
    [prRm + 'kg', 'Récord 1RM', 'var(--em)'],
    [pr + 'kg', 'Récord Absoluto', null],
    [diff !== null ? (diffPos ? '+' : '') + diff + '%' : '—', diff !== null ? 'Progreso 1RM' : null, diffPos ? 'var(--em)' : 'var(--red)']
  ].forEach(([v, l, c]) => {
    stats.appendChild(div({className: 'sm', style: {flex: '1'}},
      div({className: 'v', style: c ? {color: c, fontSize: '16px'} : {fontSize: '16px'}}, v),
      l ? div({className: 'l'}, l) : null
    ));
  });
  wrap.appendChild(stats);

  // 1RM Widget
  const estimated1RM = (lastRm > 0) ? lastRm : 0;
  
  const rmWidget = div({className: 'card', style: {padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'linear-gradient(145deg, var(--s2) 0%, rgba(20,20,36,0.5) 100%)', borderColor: 'var(--em-border)'}});
  rmWidget.appendChild(div({style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center'}},
    div({className: 'syne', style: {fontSize: '13px', fontWeight: '800', color: 'var(--t1)'}}, 'Calculadora 1RM Estimado'),
    div({className: 'syne', id: 'rm-result', style: {fontSize: '20px', fontWeight: '800', color: 'var(--em)'}}, estimated1RM ? estimated1RM + 'kg' : '—')
  ));
  const rmGrid = div({style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}});
  rmGrid.appendChild(el('input', {id: 'rm-w', className: 'inp', type: 'number', placeholder: 'Peso', value: prog.length ? prog[prog.length - 1].weight : '', 'data-action': 'calc-rm', style: {fontSize: '14px', padding: '10px'}}));
  rmGrid.appendChild(el('input', {id: 'rm-r', className: 'inp', type: 'number', placeholder: 'Reps', value: prog.length ? prog[prog.length - 1].reps : '', 'data-action': 'calc-rm', style: {fontSize: '14px', padding: '10px'}}));
  rmWidget.appendChild(rmGrid);
  wrap.appendChild(rmWidget);

  // Base routine target info
  if (target) {
    wrap.appendChild(div({className: 'card', style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px'}},
      div({style: {fontSize: '13px', color: 'var(--t2)'}}, 'Objetivo en Rutina'),
      div({className: 'syne', style: {fontWeight: '700', color: 'var(--t1)'}}, `${target.sets}×${target.reps} @ ${target.weight}kg`)
    ));
  }

  // Draw SVG Progresion Line Chart (Charting 1RM)
  if (prog.length > 1) {
    const chartDiv = div({className: 'card', style: {padding: '18px 14px 14px'}});
    chartDiv.innerHTML = buildLineChartSVG(prog, 'rm', 'kg', 'var(--em)');
    wrap.appendChild(chartDiv);
  } else {
    wrap.appendChild(div({className: 'card', style: {textAlign: 'center', padding: '28px 16px', color: 'var(--t3)', fontSize: '13px'}},
      'Necesitás completar al menos 2 sesiones de este ejercicio para generar el gráfico de evolución de 1RM.'
    ));
  }

  // Progresion List
  if (prog.length) {
    wrap.appendChild(div({className: 'syne', style: {fontSize: '11px', fontWeight: '800', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '6px'}}, 'Historial de cargas'));
    const rows = div({style: {display: 'flex', flexDirection: 'column'}});
    prog.slice().reverse().slice(0, 5).forEach(d => {
      rows.appendChild(div({className: 'exrow', style: {display: 'flex', justifyContent: 'space-between'}},
        span({style: {color: 'var(--t2)', fontSize: '14px'}}, d.date),
        div({style: {textAlign: 'right'}},
          span({className: 'syne', style: {fontWeight: '700', display: 'block'}}, `${d.weight}kg × ${d.reps}`),
          span({style: {fontSize: '10px', color: 'var(--t3)'}}, `Volumen: ${d.vol}kg`)
        )
      ));
    });
    wrap.appendChild(rows);
  }

  return wrap;
}

function buildLineChartSVG(data, key, unit, colorVar) {
  const vals = data.map(d => d[key]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min;
  const W = 340, H = 120, pad = 12;
  
  const isVar = colorVar.startsWith('var(');
  const color = isVar 
    ? getComputedStyle(document.documentElement).getPropertyValue(colorVar.slice(4, -1)).trim() || '#10b981'
    : colorVar;
  
  const pts = data.map((d, i) => {
    let pctY = range === 0 ? 0.5 : 1 - (d[key] - min) / range;
    return [
      pad + ((i / (data.length - 1)) * (W - pad * 2)),
      pad + pctY * (H - pad * 2)
    ];
  });
  
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
  const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4 : 2.5}" fill="${color}" ${i !== pts.length - 1 ? 'fill-opacity=".5"' : ''}/>`).join('');
  
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px">
      <div class="syne" style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">Progresión de Carga</div>
      <div class="syne" style="font-size:22px;font-weight:800;color:${color}">${vals[vals.length - 1]}${unit}</div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;overflow:visible">
      <defs>
        <linearGradient id="lg-${key}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity=".25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#lg-${key})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:6px">
      <span style="font-size:10px;color:var(--t3);font-weight:600;">${data[0].date}</span>
      <span style="font-size:10px;color:var(--t3);font-weight:600;">${data[data.length - 1].date}</span>
    </div>`;
}

// ── TAB: BODY COMPOSITION ──
function buildTabBody(s) {
  const wrap = div({style: {display: 'flex', flexDirection: 'column', gap: '14px'}});

  const addBtn = span({
    className: 'pill pill-g',
    style: {cursor: 'pointer', border: '1px solid var(--em-border)', padding: '8px 16px', fontSize: '12px', alignSelf: 'flex-end'},
    'data-action': 'open-add-measurement'
  },
    icon('fa-solid fa-plus'), ' Registrar Medición'
  );
  wrap.appendChild(addBtn);

  const m = s.measurements;
  if (!m.length) {
    wrap.appendChild(buildEmpty('fa-weight-scale', 'Sin mediciones corporales', 'Agregá los datos corporales del alumno (peso, altura, % de grasa) con el botón superior.'));
    return wrap;
  }

  const last = m[m.length - 1];
  const prev = m.length > 1 ? m[m.length - 2] : null;
  const b = parseFloat(bmi(last.weight, last.height));
  const [bLabel, bColor] = bmiLbl(b);
  const wDiff = prev ? (last.weight - prev.weight).toFixed(1) : null;
  const fDiff = prev && last.fat && prev.fat ? (last.fat - prev.fat).toFixed(1) : null;

  // Body stats grid
  const stats = div({style: {display: 'flex', gap: '8px'}});
  stats.appendChild(buildStatCard(last.weight + 'kg', 'Peso', null, wDiff ? {val: wDiff, pos: parseFloat(wDiff) <= 0} : null));
  stats.appendChild(buildStatCard(String(b), 'IMC', bColor, null, bLabel, bColor));
  stats.appendChild(buildStatCard(last.fat ? last.fat + '%' : '—', 'Grasa', null, fDiff ? {val: fDiff, pos: parseFloat(fDiff) <= 0} : null));
  wrap.appendChild(stats);

  // SVG weight progress line chart
  if (m.length > 1) {
    const c = div({className: 'card', style: {padding: '18px 14px 14px'}});
    c.innerHTML = buildLineChartSVG(m, 'weight', 'kg', 'var(--em)');
    wrap.appendChild(c);
  }

  // Body fat vs muscle comparison dual chart
  if (m.length > 1 && m.some(x => x.fat || x.muscle)) {
    const c = div({className: 'card', style: {padding: '18px 14px 14px'}});
    c.innerHTML = buildDualChartSVG(m);
    wrap.appendChild(c);
  }

  // Weight entries history log
  wrap.appendChild(div({className: 'syne', style: {fontSize: '11px', fontWeight: '800', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '6px'}}, 'Historial de mediciones'));
  m.slice().reverse().forEach(item => {
    wrap.appendChild(div({className: 'card', style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px'}},
      div({},
        div({className: 'syne', style: {fontWeight: '700', fontSize: '15px'}}, item.date),
        div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '2px'}}, 'Talla: ' + item.height + 'cm')
      ),
      div({style: {textAlign: 'right'}},
        div({className: 'syne', style: {fontSize: '16px', fontWeight: '800', color: 'var(--t1)'}}, item.weight + 'kg'),
        (item.fat || item.muscle) ? div({style: {fontSize: '11px', color: 'var(--t3)', marginTop: '3px', fontWeight: '600'}} ,
          (item.fat ? 'Grasa: ' + item.fat + '% ' : '') + (item.muscle ? '· Músc: ' + item.muscle + '%' : '')
        ) : null
      )
    ));
  });
  return wrap;
}

function buildStatCard(val, label, valColor, diff, sub, subColor) {
  return div({className: 'sm', style: {flex: '1'}},
    div({className: 'v', style: valColor ? {color: valColor} : {}}, val),
    div({className: 'l'}, label),
    sub ? div({style: {fontSize: '10px', color: subColor || 'var(--t3)', marginTop: '2px', fontWeight: '700', letterSpacing: '0.02em', textTransform: 'uppercase'}}, sub) : null,
    diff ? div({className: 'syne ' + (diff.pos ? 'diff-p' : 'diff-n'), style: {fontSize: '11px', fontWeight: '700', marginTop: '3px'}},
      (diff.pos ? '' : '+') + diff.val + (label === 'Grasa' ? '%' : 'kg')
    ) : null
  );
}

function buildDualChartSVG(data) {
  const W = 340, H = 110, pad = 12;
  function line(vals, color) {
    const clean = vals.filter(v => v != null);
    if (clean.length < 2) return '';
    const mn = Math.min(...clean);
    const mx = Math.max(...clean);
    const r = mx - mn || 1;
    const pts = vals.map((v, i) => v != null ? [pad + ((i / (vals.length - 1)) * (W - pad * 2)), pad + (1 - (v - mn) / r) * (H - pad * 2)] : null);
    const d = pts.map((p, i) => p ? ((!pts.slice(0, i).find(Boolean) ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)) : '').filter(Boolean).join(' ');
    const dots = pts.map(p => p ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="${color}" fill-opacity=".7"/>` : '').join('');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
  }
  return `
    <div class="syne" style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Evolución Corporal (% Comp)</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;overflow:visible">
      ${line(data.map(d => d.fat), 'var(--red)')}
      ${line(data.map(d => d.muscle), 'var(--blue)')}
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:6px">
      <span style="font-size:10px;color:var(--t3);font-weight:600;">${data[0].date}</span>
      <span style="font-size:10px;color:var(--t3);font-weight:600;">${data[data.length - 1].date}</span>
    </div>
    <div style="display:flex;gap:16px;margin-top:10px;justify-content:center">
      <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);font-weight:600;"><span style="width:12px;height:4px;background:var(--blue);border-radius:2px;display:inline-block"></span>Masa Muscular</span>
      <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);font-weight:600;"><span style="width:12px;height:4px;background:var(--red);border-radius:2px;display:inline-block"></span>Masa Grasa</span>
    </div>`;
}

// ── TAB: WORKOUT HISTORY ──
function buildCalendarWidget(s) {
  const getLocalYMD = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const dates = new Set(s.history.map(sess => getLocalYMD(sess.dateISO)));
  const wrap = div({className: 'card', style: {padding: '16px'}});
  wrap.appendChild(div({className: 'syne', style: {fontSize: '13px', fontWeight: '800', color: 'var(--t1)', marginBottom: '12px'}}, 'Actividad este mes'));
  
  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  
  const grid = div({style: {display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px'}});
  ['L','M','M','J','V','S','D'].forEach(day => {
    grid.appendChild(div({style: {textAlign: 'center', fontSize: '10px', color: 'var(--t3)', fontWeight: '700'}}, day));
  });

  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startOffset; i++) grid.appendChild(div());

  for (let i = 1; i <= daysInMonth; i++) {
    const ymd = `${d.getFullYear()}-${d.getMonth() + 1}-${i}`;
    const hasWorkout = dates.has(ymd);
    const isToday = i === d.getDate();

    const cell = div({
      style: {
        aspectRatio: '1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: '700', fontFamily: 'Syne, sans-serif',
        background: hasWorkout ? 'var(--em-dim)' : 'rgba(255,255,255,0.02)',
        color: hasWorkout ? 'var(--em)' : (isToday ? 'var(--t1)' : 'var(--t3)'),
        border: isToday ? '1px solid var(--bd2)' : '1px solid transparent',
        boxShadow: hasWorkout ? '0 0 8px rgba(0,229,160,0.1)' : 'none'
      }
    }, String(i));
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);
  return wrap;
}

function buildTabHistory(s) {
  const wrap = div({style: {display: 'flex', flexDirection: 'column', gap: '14px'}});
  
  wrap.appendChild(buildCalendarWidget(s));

  if (!s.history.length) {
    wrap.appendChild(buildEmpty('fa-clock-rotate-left', 'Sin sesiones registradas', 'No hay entrenamientos guardados en el historial de este alumno.'));
    return wrap;
  }
  s.history.forEach(sess => {
    const card = div({className: 'card', style: {padding: '16px'}});
    
    // session card header
    const hdr = div({style: {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--bd)'}});
    hdr.appendChild(div({},
      span({className: 'pill pill-g', style: {marginBottom: '6px', display: 'inline-flex'}}, sess.dayName),
      div({className: 'syne', style: {fontWeight: '700', fontSize: '15px'}}, sess.date),
      div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '2px'}}, sess.focus)
    ));
    hdr.appendChild(div({style: {textAlign: 'right'}},
      sess.duration ? div({style: {fontSize: '12px', color: 'var(--t2)'}}, icon('fa-regular fa-clock'), ' ' + sess.duration + ' min') : null,
      div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '4px'}} , sess.exercises.length + ' ejerc.')
    ));
    card.appendChild(hdr);
    
    // exercised completed rows
    const rows = div({});
    sess.exercises.forEach(ex => {
      rows.appendChild(div({className: 'exrow', style: {padding: '8px 0'}},
        span({style: {color: 'var(--t2)', fontSize: '13px'}}, ex.name),
        span({className: 'syne', style: {fontWeight: '700', fontSize: '13px'}}, `${ex.actualWeight}kg × ${ex.actualReps}`)
      ));
    });
    card.appendChild(rows);
    wrap.appendChild(card);
  });
  return wrap;
}

// ── TAB: COACH NOTES ──
function buildTabNotes(s) {
  const wrap = div({style: {display: 'flex', flexDirection: 'column', gap: '12px'}});
  wrap.appendChild(div({style: {fontSize: '13px', color: 'var(--t2)'}}, `Notas y restricciones físicas del alumno.`));
  
  const ta = el('textarea', {className: 'inp', style: {height: '240px', resize: 'none', lineHeight: '1.6'}});
  ta.placeholder = 'Restricciones, lesiones, objetivos específicos, etc...';
  ta.value = s.notes || '';
  ta.dataset.action = 'notes-input';
  wrap.appendChild(ta);
  
  const saveBtn = btn({className: 'btn-p', 'data-action': 'save-notes'}, 'Guardar Notas');
  wrap.appendChild(saveBtn);
  
  const msgDiv = div({id: 'note-save-msg', style: {textAlign: 'center', color: 'var(--em)', fontSize: '13px', marginTop: '6px', opacity: UI.noteSaved ? '1' : '0', transition: 'opacity 0.3s'}});
  msgDiv.appendChild(icon('fa-solid fa-check'));
  msgDiv.appendChild(document.createTextNode(' Guardado correctamente'));
  wrap.appendChild(msgDiv);
  
  return wrap;
}

// ═══════════════════════════════════════════════════════════
//  LAYER 5 — ACTIVE WORKOUT VIEW
// ═══════════════════════════════════════════════════════════
function renderWorkout() {
  stampTemplate('t-workout-shell');
  setText('wd-day', UI.wDay.day);
  setText('wd-focus', UI.wDay.focus);

  rebuildExerciseList();
  updateWorkoutProgress();
}

function rebuildExerciseList() {
  const list = document.getElementById('exercise-list');
  if (!list) return;
  list.innerHTML = '';
  UI.wData.forEach((ex, idx) => {
    list.appendChild(buildExCard(ex, idx));
  });
}

function buildExCard(ex, idx) {
  const done = ex.completed;
  const card = div({
    className: 'card',
    style: {
      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
      ...(done ? {borderColor: 'var(--em-border)', background: 'rgba(0, 229, 160, 0.03)'} : {})
    }
  });
  card.id = `ex-card-${idx}`;

  // Card Header Row
  const top = div({style: {display: 'flex', alignItems: 'center', gap: '12px', marginBottom: done ? '0' : '14px'}});
  
  // Completed checkbox
  const ck = div({className: 'ex-ck' + (done ? ' done' : ''), 'data-action': 'toggle-ex', 'data-idx': String(idx)});
  ck.appendChild(icon('fa-solid fa-check'));
  top.appendChild(ck);

  const info = div({style: {flex: '1', minWidth: '0'}});
  info.appendChild(div({className: 'syne', style: {
    fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px',
    ...(done ? {textDecoration: 'line-through', color: 'var(--t3)'} : {})
  }}, ex.name, 
    btn({'data-action': 'toggle-ex-notes', 'data-idx': String(idx), style: {background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: '0', fontSize: '13px'}}, icon('fa-solid fa-pen-to-square'))
  ));
  
  info.appendChild(div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '2px'}},
    `${ex.sets} series · ${ex.reps} reps · ${ex.weight}kg objetivo`
  ));
  top.appendChild(info);

  if (!done) {
    const rb = span({
      className: 'pill pill-a',
      style: {cursor: 'pointer', fontSize: '10px', padding: '4px 10px'},
      'data-action': 'open-rest-timer'
    },
      icon('fa-solid fa-stopwatch'), ' Descanso'
    );
    top.appendChild(rb);
  } else {
    top.appendChild(span({className: 'pill pill-g', style: {fontSize: '10px', padding: '4px 10px'}}, icon('fa-solid fa-check'), ' Listo'));
  }
  card.appendChild(top);

  // Dynamic set weight and reps input adjustment
  if (!done) {
    const grid = div({style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}});
    
    // Weight input column
    const wCol = div({});
    wCol.appendChild(div({className: 'syne', style: {fontSize: '10px', fontWeight: '700', color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '5px'}}, 'Peso (kg)'));
    const wRow = div({style: {display: 'flex', alignItems: 'center', gap: '6px'}});
    wRow.appendChild(btn({'data-action': 'dec-w', 'data-idx': String(idx), style: {width: '32px', height: '36px', background: 'var(--s3)', border: '1px solid var(--bd)', borderRadius: 'var(--r3)', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}, '−'));
    
    const wInp = el('input', {type: 'number', className: 'ni', 'data-action': 'inp-w', 'data-idx': String(idx), value: String(ex.actualWeight), step: '2.5', min: '0'});
    wRow.appendChild(wInp);
    
    wRow.appendChild(btn({'data-action': 'inc-w', 'data-idx': String(idx), style: {width: '32px', height: '36px', background: 'var(--s3)', border: '1px solid var(--bd)', borderRadius: 'var(--r3)', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}, '+'));
    wCol.appendChild(wRow);
    grid.appendChild(wCol);

    // Reps input column
    const rCol = div({});
    rCol.appendChild(div({className: 'syne', style: {fontSize: '10px', fontWeight: '700', color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '5px'}}, 'Reps'));
    const rRow = div({style: {display: 'flex', alignItems: 'center', gap: '6px'}});
    rRow.appendChild(btn({'data-action': 'dec-r', 'data-idx': String(idx), style: {width: '32px', height: '36px', background: 'var(--s3)', border: '1px solid var(--bd)', borderRadius: 'var(--r3)', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}, '−'));
    
    const rInp = el('input', {type: 'number', className: 'ni', 'data-action': 'inp-r', 'data-idx': String(idx), value: String(ex.actualReps), step: '1', min: '0'});
    rRow.appendChild(rInp);
    
    rRow.appendChild(btn({'data-action': 'inc-r', 'data-idx': String(idx), style: {width: '32px', height: '36px', background: 'var(--s3)', border: '1px solid var(--bd)', borderRadius: 'var(--r3)', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}, '+'));
    rCol.appendChild(rRow);
    grid.appendChild(rCol);

    card.appendChild(grid);
  }
  
  if (ex.showNotes) {
    const s = getStudent();
    const noteText = (s.exerciseNotes && s.exerciseNotes[ex.id]) ? s.exerciseNotes[ex.id] : '';
    const noteWrap = div({style: {marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}});
    const ta = el('textarea', {className: 'inp', 'data-action': 'inp-ex-note', 'data-idx': String(idx), style: {height: '60px', fontSize: '13px'}, placeholder: 'Anotaciones para este ejercicio...'});
    ta.value = noteText;
    noteWrap.appendChild(ta);
    card.appendChild(noteWrap);
  }
  
  return card;
}

function patchExCard(idx) {
  const ex = UI.wData[idx];
  const old = document.getElementById(`ex-card-${idx}`);
  if (!old) return;
  const fresh = buildExCard(ex, idx);
  old.parentNode.replaceChild(fresh, old);
  updateWorkoutProgress();
}

function updateWorkoutProgress() {
  const done = UI.wData.filter(e => e.completed).length;
  const total = UI.wData.length;
  const pct = total ? Math.round(done / total * 100) : 0;
  
  setStyle('wd-bar', 'width', pct + '%');
  setText('wd-count', `${done}/${total}`);
  
  const finBtn = document.getElementById('btn-finish');
  if (finBtn) {
    finBtn.disabled = done === 0;
    finBtn.textContent = done === 0 ? 'Completá al menos un ejercicio' : `Guardar sesión · ${done} ejerc. listos`;
    const ic = icon('fa-solid fa-circle-check');
    finBtn.prepend(ic, ' ');
  }
}

// ═══════════════════════════════════════════════════════════
//  LAYER 6 — MODAL GENERATORS
// ═══════════════════════════════════════════════════════════
function openModal(key, data = {}) {
  UI.modal = key;
  UI.modalData = data;
  closeModalDOM();
  const node = buildModal(key, data);
  if (node) document.getElementById('root').appendChild(node);
}

function closeModalDOM() {
  const old = document.getElementById('modal-overlay');
  if (old) old.remove();
}

function buildModal(key) {
  const overlay = div({id: 'modal-overlay', className: 'modal-bg', 'data-action': 'close-modal-bg'});

  // Settings Modal
  if (key === 'settings') {
    const thm = DB.theme || 'emerald';
    const tBtns = [
      {k: 'emerald', n: 'Esmeralda', c: '#00e5a0'},
      {k: 'blue', n: 'Océano', c: '#4d9fff'},
      {k: 'amber', n: 'Ámbar', c: '#ffb340'},
      {k: 'purple', n: 'Violeta', c: '#b366ff'},
      {k: 'rose', n: 'Rosa', c: '#ff4d6d'}
    ].map(t => div({
      'data-action': 'set-theme', 'data-val': t.k,
      style: {
        flex: '1', minWidth: '55px', padding: '12px 4px', borderRadius: 'var(--r2)', cursor: 'pointer',
        border: '1px solid ' + (thm === t.k ? t.c : 'var(--bd2)'),
        background: thm === t.k ? 'var(--s2)' : 'rgba(255,255,255,0.02)',
        textAlign: 'center', transition: 'all 0.2s'
      }
    },
      div({style: {width: '24px', height: '24px', borderRadius: '50%', background: t.c, margin: '0 auto 8px'}}),
      div({className: 'syne', style: {fontSize: '11px', fontWeight: '700', color: thm === t.k ? 'var(--t1)' : 'var(--t3)'}}, t.n)
    ));

    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px'}}, 'Ajustes'),
      div({style: {color: 'var(--t2)', fontSize: '14px', marginBottom: '24px'}}, 'Personalización y respaldo de datos.'),
      
      div({className: 'syne', style: {fontSize: '11px', fontWeight: '800', marginBottom: '12px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em'}}, 'Color de Acento'),
      div({style: {display: 'flex', gap: '6px', marginBottom: '28px', flexWrap: 'wrap'}}, ...tBtns),
      
      div({className: 'syne', style: {fontSize: '11px', fontWeight: '800', marginBottom: '12px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em'}}, 'Datos de la Aplicación'),
      btn({className: 'btn-g', 'data-action': 'export-data', style: {marginBottom: '10px'}}, icon('fa-solid fa-download'), 'Exportar Backup (JSON)'),
      btn({className: 'btn-g', 'data-action': 'import-data-click', style: {marginBottom: '24px'}}, icon('fa-solid fa-upload'), 'Importar Backup (JSON)'),
      
      btn({className: 'btn-p', 'data-action': 'close-modal'}, 'Cerrar Ajustes')
    );
    overlay.appendChild(box);
  }

  // User Manual Modal
  else if (key === 'manual') {
    const pStyle = {style: {color: 'var(--t2)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap'}};
    const hStyle = {className: 'syne', style: {fontSize: '16px', fontWeight: '800', color: 'var(--t1)', marginBottom: '8px', marginTop: '24px'}};
    const box = div({className: 'modal-box', style: {maxHeight: '85vh', overflowY: 'auto'}},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px'}}, '🏋️‍♂️ Manual de Uso'),
      div(pStyle, 'Bienvenido a FitTrack Pro. Esta aplicación no es un simple bloc de notas; es un CRM (Gestor de Relaciones) de Entrenamiento. Está diseñada con el principio de máxima eficiencia en el gimnasio: tocar la pantalla lo menos posible para obtener la mayor cantidad de datos estadísticos.'),
      
      div(hStyle, '📱 1. Instalación en el Celular (App Nativa)'),
      div(pStyle, 'Para tener la mejor experiencia (sin barra del navegador y pantalla completa):\nEn Android (Chrome): Abre el enlace. Toca los 3 puntos arriba a la derecha y selecciona "Añadir a la pantalla de inicio".\nEn iPhone (Safari): Abre el enlace. Toca el ícono de compartir cuadrado con una flecha hacia arriba (abajo al medio) y selecciona "Añadir a inicio".\nA partir de ahora, ábrela siempre desde ese icono nuevo en tu pantalla.'),
      
      div(hStyle, '👥 2. Pantalla Principal: "Mis Alumnos"'),
      div(pStyle, 'Esta es tu base de operaciones. Aquí tienes la visión global de tu cartera de clientes.\n- Tarjetas de Alumno: Muestran el nombre, hace cuántas sesiones no entrenan y su último peso registrado.\n- Segmentación Automática: La app agrupa a los alumnos de forma inteligente. Si alguien lleva más de 7 días sin entrenar, aparecerá destacado en naranja bajo "Atención Requerida". Es tu señal para enviarle un mensaje y retenerlo.\n- Buscador Inteligente: Escribe las primeras letras de su nombre para encontrarlo al instante.\n- Botón (+): Añade un nuevo alumno. Al crearlo, la app le asigna automáticamente la "Rutina Base".'),
      
      div(hStyle, '⚙️ 3. Perfil del Alumno: La "Rutina"'),
      div(pStyle, 'Al tocar un alumno, entras a su perfil. La primera pestaña es la Rutina.\n- Marcador "HOY": La app resalta el día actual para que sepas qué le toca de un vistazo.\n- Editor de Rutina (El engranaje ⚙️): Si la rutina base no le sirve, toca el engranaje al lado del nombre del día. Podrás eliminar ejercicios, añadir nuevos o reordenarlos. ¡Este cambio solo afecta a este alumno en particular!\n- Iniciar Entrenamiento (Botón Play ▶️): Esto es lo que tocas cuando el alumno llega al gimnasio.'),
      
      div(hStyle, '⏱️ 4. El "Modo Entrenamiento" Activo'),
      div(pStyle, 'Aquí registras lo que sucede en el "barro" de la sesión.\n- Ajuste Rápido (+/-): La app te muestra el peso que levantó la sesión anterior. Si hoy está más fuerte, súbele 2.5kg.\n- Temporizador de Descanso: Tras cada serie, toca el botón ámbar. Elije el tiempo y la app te avisará.\n- Check de Completado: Fundamental marcarlo al terminar.\n- Automatización de Carga Progresiva: Al tocar "Guardar Sesión", la app reescribe la rutina base de ese alumno con los pesos que levantó hoy.'),
      
      div(hStyle, '📈 5. Pestaña "Fuerza"'),
      div(pStyle, 'El peso en la balanza no importa si no hay fuerza.\n- Selector de Ejercicio: Un menú desplegable que lista todos los ejercicios que el alumno ha hecho.\n- Gráfico Evolutivo: Traza la curva de fuerza a lo largo del tiempo.\n- Calculadora de 1RM Estimado: El número en grande es el 1RM (Repetición Máxima) estimado histórico del alumno. Arriba, te muestra cuánto mejoró respecto a la sesión anterior.'),
      
      div(hStyle, '⚖️ 6. Pestaña "Físico"'),
      div(pStyle, 'Para el seguimiento del cambio estético.\n- Registro Avanzado (+): Permite ingresar Peso y Altura obligatoriamente (para calcular el IMC automático) y, opcionalmente, % de Grasa y Músculo.\n- Gráfico de Peso: Visualiza la pérdida o ganancia de peso.\n- Gráfico Dual: Si registraste porcentajes, la app dibujará una gráfica comparativa para ver cómo se cruzan las curvas de recomposición corporal a lo largo del tiempo.'),
      
      div(hStyle, '🛡️ 7. Seguridad y Backups'),
      div(pStyle, 'ATENCIÓN: Esta app usa la filosofía Local-First para ser ultrarrápida. Los datos de los alumnos viven dentro de tu celular. Si borras el caché del navegador, pierdes los datos.\nEl Rescate: Desde la pantalla principal "Mis Alumnos", toca el botón de Ajustes.\nToca "Exportar Backup". Esto te descargará un archivo .json. Guárdalo en tu Google Drive una vez por semana.\nSi cambias de celular, entras a Ajustes -> "Importar Backup" y seleccionas el archivo. Recuperarás a todos tus alumnos.'),
      
      btn({className: 'btn-p', 'data-action': 'close-modal', style: {marginTop: '24px'}}, 'Cerrar Manual')
    );
    overlay.appendChild(box);
  }

  // Backup Reminder Modal
  else if (key === 'backupPrompt') {
    const box = div({className: 'modal-box modal-c', style: {textAlign: 'center', padding: '32px 24px'}},
      div({style: {color: 'var(--em)', marginBottom: '16px'}}, icon('fa-solid fa-shield-halved fa-3x')),
      div({className: 'syne', style: {fontSize: '20px', fontWeight: '800', marginBottom: '12px'}}, 'Hora del Respaldo'),
      div({style: {color: 'var(--t2)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5'}}, 'Para asegurar que no pierdas el progreso de tus alumnos si el navegador borra sus datos, te recomendamos descargar un backup hoy.'),
      btn({className: 'btn-p', 'data-action': 'export-data', style: {width: '100%', marginBottom: '10px'}}, icon('fa-solid fa-download'), 'Descargar Backup (JSON)'),
      btn({className: 'btn-g', 'data-action': 'close-modal', style: {width: '100%'}}, 'Más tarde')
    );
    overlay.appendChild(box);
  }

  // Preset Manager Modal
  else if (key === 'presetManager') {
    const list = div({style: {display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '50vh', overflowY: 'auto'}});
    
    if (!DB.presets || !DB.presets.length) {
      list.appendChild(div({style: {color: 'var(--t3)', fontSize: '13px', textAlign: 'center', padding: '20px 0'}}, 'No hay presets guardados. Creá uno nuevo.'));
    } else {
      DB.presets.forEach(p => {
        const row = div({style: {display: 'flex', alignItems: 'center', background: 'var(--s2)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--bd)'}},
          div({style: {flex: '1', cursor: 'pointer'}, 'data-action': 'open-edit-preset', 'data-pid': p.id},
            div({className: 'syne', style: {fontWeight: '700', fontSize: '15px', color: 'var(--t1)'}}, p.name),
            div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '2px'}}, `${p.exercises.length} ejercicios · ${p.focus}`)
          ),
          btn({className: 'btn-i', 'data-action': 'delete-preset', 'data-pid': p.id, style: {padding: '8px', color: 'var(--red)'}}, icon('fa-solid fa-trash'))
        );
        list.appendChild(row);
      });
    }

    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px'}}, 'Gestor de Presets'),
      div({style: {color: 'var(--t2)', fontSize: '13px', marginBottom: '20px'}}, 'Creá plantillas de rutinas para aplicarlas rápidamente a tus alumnos.'),
      list,
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-modal'}, 'Cerrar'),
        btn({className: 'btn-p', style: {flex: '1'}, 'data-action': 'open-create-preset'}, icon('fa-solid fa-plus'), ' Nuevo Preset')
      )
    );
    overlay.appendChild(box);
  }

  // Edit Preset Modal
  else if (key === 'editPreset') {
    const p = DB.presets.find(x => x.id === UI.editPresetId);
    if (!p) return null;
    
    const exList = div({style: {display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '40vh', overflowY: 'auto'}});
    
    if (!p.exercises.length) {
      exList.appendChild(div({style: {color: 'var(--t3)', fontSize: '13px', textAlign: 'center', padding: '20px 0'}}, 'Aún no hay ejercicios en este preset.'));
    } else {
      p.exercises.forEach((ex, i) => {
        const exRow = div({style: {display: 'flex', alignItems: 'center', background: 'var(--s2)', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid var(--bd)'}},
          div({style: {flex: '1'}},
            div({className: 'syne', style: {fontWeight: '700', fontSize: '14px', color: 'var(--t1)'}}, ex.name),
            div({style: {fontSize: '11px', color: 'var(--t3)', marginTop: '2px'}}, `${ex.sets}x${ex.reps} @ ${ex.weight}kg`)
          ),
          div({style: {display: 'flex', gap: '4px'}},
            btn({className: 'btn-i', 'data-action': 'move-preset-ex-up', 'data-idx': String(i), disabled: i === 0, style: {padding: '6px', opacity: i === 0 ? '0.3' : '1'}}, icon('fa-solid fa-arrow-up')),
            btn({className: 'btn-i', 'data-action': 'move-preset-ex-down', 'data-idx': String(i), disabled: i === p.exercises.length - 1, style: {padding: '6px', opacity: i === p.exercises.length - 1 ? '0.3' : '1'}}, icon('fa-solid fa-arrow-down')),
            btn({className: 'btn-i', 'data-action': 'remove-preset-ex', 'data-idx': String(i), style: {padding: '6px', color: 'var(--red)'}}, icon('fa-solid fa-trash'))
          )
        );
        exList.appendChild(exRow);
      });
    }

    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '20px', fontWeight: '800', marginBottom: '16px'}}, 'Editar Preset'),
      
      div({style: {display: 'flex', gap: '10px', marginBottom: '16px'}},
        div({style: {flex: '1'}},
          div({style: {fontSize: '11px', fontWeight: '700', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px'}}, 'Nombre del Preset'),
          el('input', {className: 'inp', value: p.name, 'data-action': 'edit-preset-name', placeholder: 'Ej: Push Day', style: {width: '100%'}})
        ),
        div({style: {flex: '1'}},
          div({style: {fontSize: '11px', fontWeight: '700', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px'}}, 'Enfoque'),
          el('input', {className: 'inp', value: p.focus, 'data-action': 'edit-preset-focus', placeholder: 'Pecho/Tríceps', style: {width: '100%'}})
        )
      ),
      
      div({style: {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px'}},
        div({className: 'syne', style: {fontSize: '14px', fontWeight: '800'}}, 'Ejercicios'),
        btn({className: 'btn-p', style: {padding: '6px 12px', fontSize: '12px'}, 'data-action': 'open-add-preset-ex'}, icon('fa-solid fa-plus'), ' Agregar')
      ),
      exList,
      
      btn({className: 'btn-g', 'data-action': 'open-presets', style: {width: '100%'}}, 'Volver')
    );
    overlay.appendChild(box);
  }

  // Add Exercise to Preset Modal
  else if (key === 'addExerciseToPreset') {
    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '20px', fontWeight: '800', marginBottom: '16px'}}, 'Nuevo Ejercicio (Preset)'),
      el('input', {id: 'new-pex-name', className: 'inp', placeholder: 'Nombre (ej: Press Militar)', style: {marginBottom: '12px', width: '100%'}}),
      div({style: {display: 'flex', gap: '8px', marginBottom: '20px'}},
        el('input', {id: 'new-pex-sets', className: 'inp', type: 'number', placeholder: 'Series', style: {flex: '1'}}),
        el('input', {id: 'new-pex-reps', className: 'inp', type: 'number', placeholder: 'Reps', style: {flex: '1'}}),
        el('input', {id: 'new-pex-weight', className: 'inp', type: 'number', placeholder: 'Peso', style: {flex: '1'}})
      ),
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-add-preset-ex'}, 'Cancelar'),
        btn({className: 'btn-p', style: {flex: '1'}, 'data-action': 'confirm-add-preset-ex'}, 'Guardar')
      )
    );
    overlay.appendChild(box);
    setTimeout(() => document.getElementById('new-pex-name')?.focus(), 80);
  }

  // Select Preset Modal
  else if (key === 'selectPreset') {
    const list = div({style: {display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '50vh', overflowY: 'auto'}});
    
    if (!DB.presets || !DB.presets.length) {
      list.appendChild(div({style: {color: 'var(--t3)', fontSize: '13px', textAlign: 'center', padding: '20px 0'}}, 'No hay presets guardados para cargar.'));
    } else {
      DB.presets.forEach(p => {
        const row = div({
          'data-action': 'apply-preset', 'data-pid': p.id,
          className: 'card card-i', style: {display: 'flex', alignItems: 'center', padding: '14px', borderRadius: 'var(--r)'}
        },
          div({style: {flex: '1'}},
            div({className: 'syne', style: {fontWeight: '700', fontSize: '15px', color: 'var(--t1)'}}, p.name),
            div({style: {fontSize: '12px', color: 'var(--t3)', marginTop: '2px'}}, `${p.exercises.length} ejercicios · ${p.focus}`)
          ),
          div({style: {color: 'var(--t2)'}}, icon('fa-solid fa-chevron-right'))
        );
        list.appendChild(row);
      });
    }

    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px'}}, 'Cargar Preset'),
      div({style: {color: 'var(--t2)', fontSize: '13px', marginBottom: '20px'}}, 'Selecciona un preset para aplicarlo a este día.'),
      list,
      btn({className: 'btn-g', 'data-action': 'close-modal'}, 'Cancelar')
    );
    overlay.appendChild(box);
  }

  // Add Alumno Modal
  else if (key === 'addStudent') {
    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px'}}, 'Nuevo Alumno'),
      div({style: {color: 'var(--t2)', fontSize: '13px', marginBottom: '20px'}}, 'Se le asignará la Rutina Base de 4 días automáticamente.'),
      el('input', {id: 'modal-name', className: 'inp', placeholder: 'Nombre completo del alumno', 'data-action': 'modal-name-inp', style: {marginBottom: '16px'}}),
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-modal'}, 'Cancelar'),
        btn({className: 'btn-p', style: {flex: '1'}, 'data-action': 'confirm-add-student'}, 'Crear')
      )
    );
    overlay.appendChild(box);
    setTimeout(() => document.getElementById('modal-name')?.focus(), 80);
  }

  // Student Actions Context Modal
  else if (key === 'editStudent') {
    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '20px', fontWeight: '800', marginBottom: '18px'}}, 'Opciones del Alumno'),
      btn({
        'data-action': 'open-delete-student',
        style: {
          width: '100%', padding: '16px', background: 'var(--red-dim)', border: '1px solid var(--red-border)',
          borderRadius: 'var(--r2)', color: 'var(--red)', fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
          fontWeight: '700', cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px'
        }
      },
        icon('fa-solid fa-trash'), 'Eliminar Alumno'
      ),
      btn({className: 'btn-g', 'data-action': 'close-modal'}, 'Cerrar')
    );
    overlay.appendChild(box);
  }

  // Delete Confirmation Modal
  else if (key === 'deleteStudent') {
    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: 'var(--red)'}}, '¿Eliminar Alumno?'),
      div({style: {color: 'var(--t2)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5'}}, 'Esta acción borrará de forma permanente al alumno, sus rutinas registradas y todo su historial de progresos. No se puede deshacer.'),
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-modal'}, 'Cancelar'),
        btn({className: 'btn-p', style: {flex: '1', background: 'var(--red)', boxShadow: '0 4px 12px rgba(255, 77, 109, 0.25)'}, 'data-action': 'confirm-delete-student'}, 'Confirmar')
      )
    );
    overlay.appendChild(box);
  }

  // Cancel Workout Warning Modal
  else if (key === 'cancelWorkout') {
    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '8px'}}, '¿Salir del Entrenamiento?'),
      div({style: {color: 'var(--t2)', fontSize: '14px', marginBottom: '24px'}}, 'Si salís ahora, perderás el progreso no guardado de esta sesión.'),
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-modal'}, 'Continuar'),
        btn({className: 'btn-p', style: {flex: '1', background: 'var(--s3)', color: 'var(--t2)', border: '1px solid var(--bd2)', boxShadow: 'none'}, 'data-action': 'confirm-cancel-workout'}, 'Salir')
      )
    );
    overlay.appendChild(box);
  }

  // Edit Routine Day Modal
  else if (key === 'editDay') {
    const s = getStudent();
    const day = s.routine[UI.editDayIdx];
    
    const exList = div({style: {display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '40vh', overflowY: 'auto'}});
    
    if (day.isRest) {
      exList.appendChild(div({style: {color: 'var(--t3)', fontSize: '13px', textAlign: 'center', padding: '20px 0'}}, 'Día de descanso. No hay ejercicios.'));
    } else {
      day.exercises.forEach((ex, i) => {
        const exRow = div({style: {display: 'flex', alignItems: 'center', background: 'var(--s2)', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid var(--bd)'}},
          div({style: {flex: '1'}},
            div({className: 'syne', style: {fontWeight: '700', fontSize: '14px', color: 'var(--t1)'}}, ex.name),
            div({style: {fontSize: '11px', color: 'var(--t3)', marginTop: '2px'}}, `${ex.sets}x${ex.reps} @ ${ex.weight}kg`)
          ),
          div({style: {display: 'flex', gap: '4px'}},
            btn({className: 'btn-i', 'data-action': 'move-ex-up', 'data-idx': String(i), disabled: i === 0, style: {padding: '6px', opacity: i === 0 ? '0.3' : '1'}}, icon('fa-solid fa-arrow-up')),
            btn({className: 'btn-i', 'data-action': 'move-ex-down', 'data-idx': String(i), disabled: i === day.exercises.length - 1, style: {padding: '6px', opacity: i === day.exercises.length - 1 ? '0.3' : '1'}}, icon('fa-solid fa-arrow-down')),
            btn({className: 'btn-i', 'data-action': 'remove-ex', 'data-idx': String(i), style: {padding: '6px', color: 'var(--red)'}}, icon('fa-solid fa-trash'))
          )
        );
        exList.appendChild(exRow);
      });
    }

    const box = div({className: 'modal-box'},
      div({style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}},
        div({className: 'syne', style: {fontSize: '20px', fontWeight: '800'}}, `Editar Día`),
        div({style: {display: 'flex', gap: '8px'}},
          btn({className: 'btn-i', 'data-action': 'open-select-preset', style: {color: 'var(--blue)', padding: '4px 8px'}}, icon('fa-solid fa-download'), ' Preset'),
          btn({className: 'btn-i', 'data-action': 'delete-day', style: {color: 'var(--red)', padding: '4px 8px'}}, icon('fa-solid fa-trash'), ' Borrar Día')
        )
      ),
      
      div({style: {display: 'flex', gap: '10px', marginBottom: '16px'}},
        div({style: {flex: '1'}},
          div({style: {fontSize: '11px', fontWeight: '700', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px'}}, 'Nombre del Día'),
          el('input', {className: 'inp', value: day.day, 'data-action': 'edit-day-name', placeholder: 'Ej: Lunes o Día 1', style: {width: '100%'}})
        ),
        div({style: {flex: '1'}},
          div({style: {fontSize: '11px', fontWeight: '700', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px'}}, 'Enfoque / Grupo'),
          el('input', {className: 'inp', value: day.focus, 'data-action': 'edit-day-focus', style: {width: '100%'}})
        )
      ),
      
      div({style: {display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: 'var(--s2)', borderRadius: 'var(--r)'}},
        el('input', {type: 'checkbox', checked: day.isRest, 'data-action': 'toggle-day-rest', style: {width: '18px', height: '18px'}}),
        div({className: 'syne', style: {fontWeight: '700', fontSize: '14px'}}, 'Marcar como día de descanso')
      ),
      
      div({style: {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px'}},
        div({className: 'syne', style: {fontSize: '14px', fontWeight: '800'}}, 'Ejercicios'),
        !day.isRest ? btn({className: 'btn-p', style: {padding: '6px 12px', fontSize: '12px'}, 'data-action': 'open-add-ex'}, icon('fa-solid fa-plus'), ' Agregar') : null
      ),
      exList,
      
      btn({className: 'btn-g', 'data-action': 'close-modal', style: {width: '100%'}}, 'Cerrar')
    );
    overlay.appendChild(box);
  }

  // Add Exercise Modal
  else if (key === 'addExerciseToDay') {
    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '20px', fontWeight: '800', marginBottom: '16px'}}, 'Nuevo Ejercicio'),
      el('input', {id: 'new-ex-name', className: 'inp', placeholder: 'Nombre (ej: Press Militar)', style: {marginBottom: '12px', width: '100%'}}),
      div({style: {display: 'flex', gap: '8px', marginBottom: '20px'}},
        el('input', {id: 'new-ex-sets', className: 'inp', type: 'number', placeholder: 'Series', style: {flex: '1'}}),
        el('input', {id: 'new-ex-reps', className: 'inp', type: 'number', placeholder: 'Reps', style: {flex: '1'}}),
        el('input', {id: 'new-ex-weight', className: 'inp', type: 'number', placeholder: 'Peso', style: {flex: '1'}})
      ),
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-add-ex'}, 'Cancelar'),
        btn({className: 'btn-p', style: {flex: '1'}, 'data-action': 'confirm-add-ex'}, 'Guardar')
      )
    );
    overlay.appendChild(box);
    setTimeout(() => document.getElementById('new-ex-name')?.focus(), 80);
  }

  // Add Body Measurement Modal
  else if (key === 'addMeasurement') {
    const s = getStudent();
    const lastH = s.measurements.length ? s.measurements[s.measurements.length - 1].height : '';
    
    const grid = div({style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px'}});
    [
      ['Peso (kg) *', 'm-weight', 'number', '0.1', ''],
      ['Altura (cm) *', 'm-height', 'number', '1', lastH],
      ['% Grasa', 'm-fat', 'number', '0.1', ''],
      ['% Músculo', 'm-muscle', 'number', '0.1', '']
    ].forEach(([label, id, type, step, val]) => {
      const col = div({});
      col.appendChild(div({className: 'syne', style: {fontSize: '11px', fontWeight: '800', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px'}}, label));
      col.appendChild(el('input', {id, type, className: 'inp', step, value: String(val)}));
      grid.appendChild(col);
    });

    const box = div({className: 'modal-box'},
      div({className: 'syne', style: {fontSize: '22px', fontWeight: '800', marginBottom: '16px'}}, 'Nueva Medición'),
      grid,
      div({style: {display: 'flex', gap: '10px'}},
        btn({className: 'btn-g', style: {flex: '1'}, 'data-action': 'close-modal'}, 'Cancelar'),
        btn({className: 'btn-p', style: {flex: '1'}, 'data-action': 'confirm-add-measurement'}, 'Guardar')
      )
    );
    overlay.appendChild(box);
  }

  // Rest Stopwatch Timer Popup
  else if (key === 'restTimer') {
    const {rtRemain, rtSec} = UI;
    const r = 40;
    const circ = 2 * Math.PI * r;
    const pct = 1 - (rtRemain / rtSec);
    
    const box = div({className: 'modal-box modal-c', style: {textAlign: 'center', padding: '32px 24px'}},
      div({className: 'syne', style: {fontSize: '13px', fontWeight: '800', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '20px'}}, 'Tiempo de Descanso'),
      div({style: {position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'}},
        (() => {
          const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          s.setAttribute('width', '100');
          s.setAttribute('height', '100');
          s.setAttribute('viewBox', '0 0 100 100');
          
          const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          bg.setAttribute('cx', '50');
          bg.setAttribute('cy', '50');
          bg.setAttribute('r', String(r));
          bg.setAttribute('fill', 'none');
          bg.setAttribute('stroke', 'var(--s3)');
          bg.setAttribute('stroke-width', '6');
          
          const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          fg.id = 'rt-ring';
          fg.setAttribute('cx', '50');
          fg.setAttribute('cy', '50');
          fg.setAttribute('r', String(r));
          fg.setAttribute('fill', 'none');
          fg.setAttribute('stroke', 'var(--em)');
          fg.setAttribute('stroke-width', '6');
          fg.setAttribute('stroke-linecap', 'round');
          fg.setAttribute('class', 'pring');
          fg.setAttribute('stroke-dasharray', circ.toFixed(1));
          fg.setAttribute('stroke-dashoffset', (circ * pct).toFixed(1));
          fg.style.transition = 'stroke-dashoffset .9s linear';
          
          s.appendChild(bg);
          s.appendChild(fg);
          return s;
        })(),
        div({id: 'rt-display', className: 'syne', style: {position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '26px', fontWeight: '800', color: 'var(--t1)'}}, fmt(rtRemain))
      ),
      div({style: {display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px'}},
        ...[30, 60, 90, 120].map(sec => btn({className: 'chip' + (UI.rtSec === sec ? ' on' : ''), 'data-action': 'set-rest-sec', 'data-sec': String(sec)}, sec + 's'))
      ),
      btn({className: 'btn-g', 'data-action': 'close-modal'}, 'Cerrar')
    );
    overlay.appendChild(box);
  }

  else return null;
  return overlay;
}

function buildEmpty(ic, title, sub) {
  return div({style: {textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--bd)', borderRadius: 'var(--r)', background: 'var(--s1)', marginTop: '4px'}},
    icon('fa-solid ' + ic + ' fa-2x'),
    div({className: 'syne', style: {fontWeight: '700', fontSize: '16px', marginTop: '16px', marginBottom: '6px'}}, title),
    div({style: {fontSize: '13px', color: 'var(--t3)', lineHeight: '1.5'}}, sub)
  );
}

// ═══════════════════════════════════════════════════════════
//  LAYER 7 — INDEPENDENT TIMER ENGINE
// ═══════════════════════════════════════════════════════════
function persistActiveSession() {
  if (UI.view === 'workout' && UI.wDay) {
    DB.activeSession = {
      studentId: UI.studentId,
      wDay: UI.wDay,
      wData: UI.wData,
      wStart: UI.wStart
    };
    persist();
  }
}

function startWorkoutTimer(isRestore = false) {
  clearWorkoutTimer();
  if (!isRestore) {
    UI.wStart = Date.now() - UI.wElapsed * 1000;
    persistActiveSession();
  }
  UI.wTimerRef = setInterval(() => {
    UI.wElapsed = Math.max(0, Math.floor((Date.now() - UI.wStart) / 1000));
    const el = document.getElementById('workout-timer');
    if (el) el.textContent = fmt(UI.wElapsed);
  }, 1000);
}

function clearWorkoutTimer() {
  if (UI.wTimerRef) {
    clearInterval(UI.wTimerRef);
    UI.wTimerRef = null;
  }
}

function startRestTimer(sec) {
  if (UI.rtRef) {
    clearInterval(UI.rtRef);
    UI.rtRef = null;
  }
  UI.rtSec = sec;
  UI.rtRemain = sec;
  UI.rtTarget = Date.now() + sec * 1000;
  openModal('restTimer');
  
  UI.rtRef = setInterval(() => {
    UI.rtRemain = Math.max(0, Math.ceil((UI.rtTarget - Date.now()) / 1000));
    const disp = document.getElementById('rt-display');
    const ring = document.getElementById('rt-ring');
    
    if (disp) disp.textContent = fmt(UI.rtRemain);
    if (ring) {
      const circ = 2 * Math.PI * 40;
      ring.setAttribute('stroke-dashoffset', (circ * (1 - UI.rtRemain / UI.rtSec)).toFixed(1));
    }
    
    if (UI.rtRemain <= 0) {
      clearInterval(UI.rtRef);
      UI.rtRef = null;
      // Vibrar si la API es soportada
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 250);
}

function stopRestTimer() {
  if (UI.rtRef) {
    clearInterval(UI.rtRef);
    UI.rtRef = null;
  }
}

// ═══════════════════════════════════════════════════════════
//  LAYER 8 — DELEGATED GLOBAL EVENTS ROUTER
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  // Navigation Click Controls
  if (action === 'go-list') {
    UI.view = 'list';
    UI.studentId = null;
    renderList();
    return;
  }
  
  if (action === 'open-settings') { openModal('settings'); return; }
  if (action === 'open-manual') { openModal('manual'); return; }
  if (action === 'open-presets') { openModal('presetManager'); return; }
  if (action === 'set-theme') {
    DB.theme = t.dataset.val;
    persist();
    document.documentElement.setAttribute('data-theme', DB.theme);
    openModal('settings');
    return;
  }
  if (action === 'export-data') { doExport(); return; }
  if (action === 'import-data-click') {
    let inp = document.getElementById('hidden-import');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.id = 'hidden-import';
      inp.accept = '.json';
      inp.style.display = 'none';
      inp.onchange = handleImport;
      document.body.appendChild(inp);
    }
    inp.click();
    return;
  }

  if (action === 'open-student') {
    UI.view = 'student';
    UI.studentId = String(t.dataset.sid);
    UI.tab = 'plan';
    renderStudent();
    return;
  }

  // Student CRUD Operations
  if (action === 'open-add-student') { openModal('addStudent'); return; }
  if (action === 'confirm-add-student') { doAddStudent(); return; }
  
  if (action === 'open-edit-student') { openModal('editStudent'); return; }
  if (action === 'open-delete-student') { openModal('deleteStudent'); return; }
  if (action === 'confirm-delete-student') { doDeleteStudent(); return; }

  // Presets CRUD
  if (action === 'open-create-preset') {
    const p = { id: generateId(), name: 'Nuevo Preset', focus: 'General', exercises: [] };
    DB.presets.unshift(p);
    persist();
    UI.editPresetId = p.id;
    openModal('editPreset');
    return;
  }
  if (action === 'open-edit-preset') {
    UI.editPresetId = t.dataset.pid;
    openModal('editPreset');
    return;
  }
  if (action === 'delete-preset') {
    if (confirm('¿Eliminar este preset?')) {
      DB.presets = DB.presets.filter(x => x.id !== t.dataset.pid);
      persist();
      openModal('presetManager');
    }
    return;
  }
  if (action === 'open-add-preset-ex') {
    openModal('addExerciseToPreset');
    return;
  }
  if (action === 'close-add-preset-ex') {
    openModal('editPreset');
    return;
  }
  if (action === 'confirm-add-preset-ex') {
    const name = document.getElementById('new-pex-name')?.value.trim();
    const sets = parseInt(document.getElementById('new-pex-sets')?.value) || 4;
    const reps = parseInt(document.getElementById('new-pex-reps')?.value) || 10;
    const weight = parseFloat(document.getElementById('new-pex-weight')?.value) || 0;
    
    if (name) {
      const p = DB.presets.find(x => x.id === UI.editPresetId);
      if (p) {
        p.exercises.push({ id: generateId(), name, sets, reps, weight });
        persist();
      }
    }
    openModal('editPreset');
    return;
  }
  if (action === 'move-preset-ex-up') {
    const p = DB.presets.find(x => x.id === UI.editPresetId);
    const i = +t.dataset.idx;
    if (p && i > 0) {
      [p.exercises[i - 1], p.exercises[i]] = [p.exercises[i], p.exercises[i - 1]];
      persist();
      openModal('editPreset');
    }
    return;
  }
  if (action === 'move-preset-ex-down') {
    const p = DB.presets.find(x => x.id === UI.editPresetId);
    const i = +t.dataset.idx;
    if (p && i < p.exercises.length - 1) {
      [p.exercises[i + 1], p.exercises[i]] = [p.exercises[i], p.exercises[i + 1]];
      persist();
      openModal('editPreset');
    }
    return;
  }
  if (action === 'remove-preset-ex') {
    const p = DB.presets.find(x => x.id === UI.editPresetId);
    if (p) {
      p.exercises.splice(+t.dataset.idx, 1);
      persist();
      openModal('editPreset');
    }
    return;
  }

  // Active workout flow
  if (action === 'start-workout') {
    const idx = +t.dataset.dayIdx;
    const s = getStudent();
    const day = s.routine[idx];
    if (day.isRest) return;
    
    UI.wDay = day;
    UI.wData = clone(day.exercises).map(ex => ({...ex, completed: false, showNotes: false, actualWeight: ex.weight, actualReps: ex.reps}));
    UI.wElapsed = 0;
    UI.view = 'workout';
    renderWorkout();
    startWorkoutTimer();
    return;
  }

  if (action === 'cancel-workout') {
    const done = UI.wData.filter(e => e.completed).length;
    if (done > 0) {
      openModal('cancelWorkout');
    } else {
      clearWorkoutTimer();
      UI.view = 'student';
      UI.tab = 'plan';
      renderStudent();
    }
    return;
  }

  if (action === 'confirm-cancel-workout') {
    clearWorkoutTimer();
    closeModalDOM();
    delete DB.activeSession;
    persist();
    UI.modal = null;
    UI.view = 'student';
    UI.tab = 'plan';
    renderStudent();
    return;
  }

  if (action === 'finish-workout') { doFinishWorkout(); return; }

  // Editor de Rutinas Actions
  if (action === 'open-select-preset') {
    openModal('selectPreset');
    return;
  }
  if (action === 'apply-preset') {
    const preset = DB.presets.find(x => x.id === t.dataset.pid);
    const s = getStudent();
    if (preset && s && UI.editDayIdx !== null) {
      s.routine[UI.editDayIdx].focus = preset.focus;
      s.routine[UI.editDayIdx].isRest = false;
      s.routine[UI.editDayIdx].exercises = preset.exercises.map(ex => ({
        ...ex,
        id: generateId()
      }));
      markRoutineUpdated(s);
      persist();
      fillTab(s);
      openModal('editDay');
    }
    return;
  }
  
  if (action === 'add-day') {
    const s = getStudent();
    s.routine.push({day: `Día ${s.routine.length + 1}`, focus: 'Nuevo Enfoque', isRest: false, exercises: []});
    markRoutineUpdated(s);
    persist();
    fillTab(s);
    return;
  }
  if (action === 'delete-day') {
    const s = getStudent();
    s.routine.splice(UI.editDayIdx, 1);
    markRoutineUpdated(s);
    persist();
    closeModalDOM();
    fillTab(s);
    return;
  }
  if (action === 'open-edit-day') {
    UI.editDayIdx = +t.dataset.idx;
    openModal('editDay');
    return;
  }
  if (action === 'toggle-day-rest') {
    const s = getStudent();
    s.routine[UI.editDayIdx].isRest = t.checked;
    markRoutineUpdated(s);
    persist();
    openModal('editDay');
    fillTab(s); // Update background
    return;
  }
  if (action === 'move-ex-up') {
    const s = getStudent();
    const arr = s.routine[UI.editDayIdx].exercises;
    const i = +t.dataset.idx;
    if (i > 0) {
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      markRoutineUpdated(s);
      persist();
      openModal('editDay');
      fillTab(s);
    }
    return;
  }
  if (action === 'move-ex-down') {
    const s = getStudent();
    const arr = s.routine[UI.editDayIdx].exercises;
    const i = +t.dataset.idx;
    if (i < arr.length - 1) {
      [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      markRoutineUpdated(s);
      persist();
      openModal('editDay');
      fillTab(s);
    }
    return;
  }
  if (action === 'remove-ex') {
    const s = getStudent();
    s.routine[UI.editDayIdx].exercises.splice(+t.dataset.idx, 1);
    markRoutineUpdated(s);
    persist();
    openModal('editDay');
    fillTab(s);
    return;
  }
  if (action === 'open-add-ex') {
    openModal('addExerciseToDay');
    return;
  }
  if (action === 'close-add-ex') {
    openModal('editDay');
    return;
  }
  if (action === 'confirm-add-ex') {
    const name = document.getElementById('new-ex-name')?.value.trim();
    const sets = parseInt(document.getElementById('new-ex-sets')?.value) || 4;
    const reps = parseInt(document.getElementById('new-ex-reps')?.value) || 10;
    const weight = parseFloat(document.getElementById('new-ex-weight')?.value) || 0;
    
    if (name) {
      const s = getStudent();
      s.routine[UI.editDayIdx].exercises.push({
        id: generateId(),
        name, sets, reps, weight
      });
      markRoutineUpdated(s);
      persist();
      fillTab(s);
    }
    openModal('editDay');
    return;
  }

  // Active workout inputs adjusters
  if (action === 'toggle-ex') {
    const idx = +t.dataset.idx;
    UI.wData[idx].completed = !UI.wData[idx].completed;
    patchExCard(idx);
    persistActiveSession();
    return;
  }
  if (action === 'toggle-ex-notes') {
    const idx = +t.dataset.idx;
    UI.wData[idx].showNotes = !UI.wData[idx].showNotes;
    patchExCard(idx);
    persistActiveSession();
    return;
  }

  if (action === 'inc-w') { adjWeight(+t.dataset.idx, 2.5); return; }
  if (action === 'dec-w') { adjWeight(+t.dataset.idx, -2.5); return; }
  if (action === 'inc-r') { adjReps(+t.dataset.idx, 1); return; }
  if (action === 'dec-r') { adjReps(+t.dataset.idx, -1); return; }
  
  if (action === 'open-rest-timer') { startRestTimer(UI.rtSec || 90); return; }
  if (action === 'set-rest-sec') { startRestTimer(+t.dataset.sec); return; }

  // Measurements CRUD
  if (action === 'open-add-measurement') { openModal('addMeasurement'); return; }
  if (action === 'confirm-add-measurement') { doAddMeasurement(); return; }

  // Notes tab trigger
  if (action === 'save-notes') { doSaveNotes(); return; }

  // Modals generic close triggers
  if (action === 'close-modal' || action === 'close-modal-bg') {
    if (e.target !== t && action === 'close-modal-bg') return;
    stopRestTimer();
    closeModalDOM();
    UI.modal = null;
    return;
  }
});

// Dynamic Tab Click Triggers
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (!t || t.dataset.action) return;
  switchTab(t.dataset.tab);
});

// Live inputs routing
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.action === 'inp-w') {
    UI.wData[+t.dataset.idx].actualWeight = parseFloat(t.value) || 0;
    updateWorkoutProgress();
    persistActiveSession();
    return;
  }
  if (t.dataset.action === 'inp-r') {
    UI.wData[+t.dataset.idx].actualReps = parseInt(t.value) || 0;
    updateWorkoutProgress();
    persistActiveSession();
    return;
  }
  if (t.dataset.action === 'calc-rm') {
    const p = t.closest('.card');
    if (!p) return;
    const w = parseFloat(p.querySelector('#rm-w')?.value) || 0;
    const r = parseInt(p.querySelector('#rm-r')?.value) || 0;
    const res = (w > 0 && r > 0) ? Math.round(w * (1 + 0.0333 * r)) + 'kg' : '—';
    const resultEl = p.querySelector('#rm-result');
    if (resultEl) resultEl.textContent = res;
    return;
  }
  if (t.dataset.action === 'inp-ex-note') {
    const ex = UI.wData[+t.dataset.idx];
    const s = getStudent();
    if (!s.exerciseNotes) s.exerciseNotes = {};
    s.exerciseNotes[ex.id] = t.value;
    persist();
    return;
  }
  if (t.id === 'search-inp') {
    return; // Handled by debounced listener
  }
  
  // Dynamic Select dropdowns for charts
  if (t.tagName === 'SELECT' && UI.tab === 'strength') {
    UI.selExercise = t.value;
    fillTab(getStudent());
    return;
  }
});

document.addEventListener('input', debounce(e => {
  if (e.target.id === 'search-inp') {
    UI.search = e.target.value;
    renderList();
  }
}, 200));

document.addEventListener('change', e => {
  if (e.target.dataset.action === 'edit-day-focus') {
    const s = getStudent();
    s.routine[UI.editDayIdx].focus = e.target.value;
    markRoutineUpdated(s);
    persist();
    fillTab(s);
  }
  if (e.target.dataset.action === 'edit-day-name') {
    const s = getStudent();
    s.routine[UI.editDayIdx].day = e.target.value;
    markRoutineUpdated(s);
    persist();
    fillTab(s);
  }
  if (e.target.dataset.action === 'edit-preset-name') {
    const p = DB.presets.find(x => x.id === UI.editPresetId);
    if (p) {
      p.name = e.target.value;
      persist();
    }
  }
  if (e.target.dataset.action === 'edit-preset-focus') {
    const p = DB.presets.find(x => x.id === UI.editPresetId);
    if (p) {
      p.focus = e.target.value;
      persist();
    }
  }
});

// Modal submit key binding
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const sName = document.getElementById('modal-name');
    if (sName && document.activeElement === sName) {
      doAddStudent();
    }
  }
});

function switchTab(tab) {
  UI.tab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('on', on);
    let ul = b.querySelector('.tab-ul');
    if (on && !ul) {
      ul = div({className: 'tab-ul'});
      b.appendChild(ul);
    } else if (!on && ul) {
      ul.remove();
    }
  });
  fillTab(getStudent());
}

// ═══════════════════════════════════════════════════════════
//  LAYER 9 — ACTIONS (STATE CHANGE MUTATIONS)
// ═══════════════════════════════════════════════════════════
function doAddStudent() {
  const inp = document.getElementById('modal-name');
  const name = (inp?.value || '').trim();
  if (!name) return;
  
  DB.students.push(freshStudent(name));
  persist();
  
  closeModalDOM();
  UI.modal = null;
  UI.search = '';
  renderList();
}

function doDeleteStudent() {
  if (DB.activeSession && String(DB.activeSession.studentId) === String(UI.studentId)) {
    delete DB.activeSession;
  }
  const s = DB.students.find(x => String(x.id) === String(UI.studentId));
  if (s) {
    s.isDeleted = true;
    markStudentUpdated(s);
  }
  persist();
  
  closeModalDOM();
  UI.modal = null;
  UI.studentId = null;
  UI.view = 'list';
  renderList();
}

function doFinishWorkout() {
  const completed = UI.wData.filter(e => e.completed);
  if (!completed.length) return;

  const entry = {
    id: generateId(),
    date: todayStr(),
    dateISO: new Date().toISOString(),
    dayName: UI.wDay.day,
    focus: UI.wDay.focus,
    duration: Math.round(UI.wElapsed / 60) || undefined,
    exercises: completed.map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      actualWeight: ex.actualWeight,
      actualReps: ex.actualReps
    })),
    syncStatus: 'pending'
  };

  const s = getStudent();
  s.history.unshift(entry);

  // Progressive Overload Automation
  const dayIdx = s.routine.findIndex(d => d.day === UI.wDay.day);
  if (dayIdx !== -1) {
    UI.wData.forEach(wEx => {
      if (!wEx.completed) return;
      const rEx = s.routine[dayIdx].exercises.find(e => e.id === wEx.id);
      if (rEx) {
        rEx.weight = parseFloat(wEx.actualWeight) || rEx.weight;
        rEx.reps = parseInt(wEx.actualReps) || rEx.reps;
      }
    });
    markRoutineUpdated(s);
  }

  delete DB.activeSession;
  persist();
  clearWorkoutTimer();

  UI.view = 'student';
  UI.tab = 'history';
  UI.wDay = null;
  UI.wData = [];
  renderStudent();
}

function doAddMeasurement() {
  const w = parseFloat(document.getElementById('m-weight')?.value);
  const h = parseFloat(document.getElementById('m-height')?.value);
  const f = parseFloat(document.getElementById('m-fat')?.value) || null;
  const mu = parseFloat(document.getElementById('m-muscle')?.value) || null;
  if (!w || !h) return;

  const s = getStudent();
  s.measurements.push({id: generateId(), date: todayStr(), weight: w, height: h, fat: f, muscle: mu, syncStatus: 'pending'});
  persist();

  closeModalDOM();
  UI.modal = null;
  fillTab(s);
}

function doSaveNotes() {
  const ta = document.querySelector('[data-action="notes-input"]');
  if (!ta) return;
  
  const s = getStudent();
  s.notes = ta.value;
  s.notesSyncStatus = 'pending';
  persist();

  UI.noteSaved = true;
  const msg = document.getElementById('note-save-msg');
  if (msg) msg.style.opacity = '1';
  
  setTimeout(() => {
    UI.noteSaved = false;
    if (msg) msg.style.opacity = '0';
  }, 2000);
}

function adjWeight(idx, delta) {
  const val = Math.max(0, parseFloat(UI.wData[idx].actualWeight || 0) + delta);
  UI.wData[idx].actualWeight = parseFloat(val.toFixed(1));
  patchExCard(idx);
  persistActiveSession();
}

function adjReps(idx, delta) {
  UI.wData[idx].actualReps = Math.max(0, parseInt(UI.wData[idx].actualReps || 0) + delta);
  patchExCard(idx);
  persistActiveSession();
}

function doExport() {
  const data = JSON.stringify(DB, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FitTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const p = JSON.parse(ev.target.result);
      if (p && typeof p === 'object' && Array.isArray(p.students)) {
        Object.assign(DB, p);
        if (!DB.theme) DB.theme = 'emerald';
        persist();
        document.documentElement.setAttribute('data-theme', DB.theme);
        alert('Datos importados correctamente.');
        location.reload();
      } else {
        alert('Error: El archivo no tiene el formato correcto (faltan alumnos o el archivo está dañado).');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON.');
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════
//  LAYER 10 — BOOTSTRAP INITIALIZATION
// ═══════════════════════════════════════════════════════════

function checkBackupPrompt() {
  const lastPrompt = localStorage.getItem('fittrack_last_backup_prompt');
  const now = Date.now();
  if (!lastPrompt || (now - parseInt(lastPrompt) > 7 * 24 * 60 * 60 * 1000)) {
    setTimeout(() => {
      openModal('backupPrompt');
      localStorage.setItem('fittrack_last_backup_prompt', now.toString());
    }, 1500);
  }
}

const root = document.getElementById('root');
document.documentElement.setAttribute('data-theme', DB.theme || 'emerald');

if (DB.activeSession && DB.activeSession.wDay) {
  UI.view = 'workout';
  UI.studentId = DB.activeSession.studentId;
  UI.wDay = DB.activeSession.wDay;
  UI.wData = DB.activeSession.wData;
  UI.wStart = DB.activeSession.wStart;
  UI.wElapsed = Math.max(0, Math.floor((Date.now() - UI.wStart) / 1000));
  renderWorkout();
  startWorkoutTimer(true);
} else {
  renderList();
}
checkBackupPrompt();

})();
