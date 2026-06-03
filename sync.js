// ═══════════════════════════════════════════════════════════
// MOTOR DE SINCRONIZACIÓN SUPABASE (LOCAL-FIRST) v2
// ═══════════════════════════════════════════════════════════

// === CONFIGURACIÓN DE SUPABASE ===
// IMPORTANTE: Reemplaza estas constantes con las de tu proyecto en Supabase.
const SUPABASE_URL = 'https://gwpkeeboywqsydjqumzk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGtlZWJveXdxc3lkanF1bXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE4NDksImV4cCI6MjA5NjA2Nzg0OX0.Ysat6PVUMQEfd0Q6LnIniX98tF7blD2fTjtlVN8Nuu0';

function getSupabase() {
  if (!window.supabase) return null;
  try {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.error('Error inicializando cliente Supabase:', e);
    return null;
  }
}

const supabase = getSupabase();

window.SyncEngine = {
  user: null,
  workspaceId: null,
  isSyncing: false,
  lastSyncAt: localStorage.getItem('fitTrackLastSync') || null,

  init() {
    // Delegar click en el botón de sync manual (siempre activo para reportar errores)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="manual-sync"]');
      if (btn) {
        if (!supabase) {
          alert('Error: No se pudo conectar con Supabase. Verifica tu conexión o que la clave y URL sean correctas.');
          return;
        }
        if (!this.user) this.showLoginModal();
        else this.syncAll();
      }
    });

    if (!supabase) {
      console.error('Supabase no está cargado');
      this.updateUI('error');
      return;
    }

    // Comprobar sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        this.user = session.user;
        this.fetchWorkspace();
      } else {
        this.showLoginModal();
        this.updateUI('offline');
      }
    });

    // Escuchar cambios de auth
    supabase.auth.onAuthStateChange((_event, session) => {
      this.user = session?.user || null;
      if (this.user) {
        this.fetchWorkspace();
      }
    });


    // Auto-sync interval (cada 3 minutos)
    setInterval(() => {
      if (this.user && this.workspaceId && navigator.onLine) {
        this.syncAll();
      }
    }, 180000);
  },

  async fetchWorkspace() {
    this.updateUI('syncing');
    const { data, error } = await supabase.from('users').select('workspace_id').eq('id', this.user.id).single();
    if (data && data.workspace_id) {
      this.workspaceId = data.workspace_id;
      this.updateUI('synced');
      this.pullRemoteChanges();
    } else {
      console.error('El usuario no tiene workspace asignado.', error);
      this.updateUI('error');
    }
  },

  updateUI(state) {
    const icon = document.getElementById('sync-status-icon');
    if (!icon) return;
    
    icon.className = 'fa-solid fa-cloud';
    icon.style.color = 'var(--t3)';

    if (state === 'synced') {
      icon.className = 'fa-solid fa-cloud-check';
      icon.style.color = 'var(--em)';
    } else if (state === 'syncing') {
      icon.className = 'fa-solid fa-rotate fa-spin';
      icon.style.color = 'var(--blue)';
    } else if (state === 'error') {
      icon.className = 'fa-solid fa-cloud-xmark';
      icon.style.color = 'var(--red)';
    } else if (state === 'offline') {
      icon.style.color = 'var(--t3)';
    }
  },

  async syncAll() {
    if (this.isSyncing || !this.user || !this.workspaceId || !navigator.onLine) return;
    this.isSyncing = true;
    this.updateUI('syncing');

    try {
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      this.updateUI('synced');
    } catch (e) {
      console.error('Error sincronizando:', e);
      this.updateUI('error');
    } finally {
      this.isSyncing = false;
    }
  },

  async pushLocalChanges() {
    // Escanea DB local y hace push de entidades pending
    if (!window.DB || !window.DB.students) return;

    for (let s of window.DB.students) {
      // 1. Student metadata
      if (s.syncStatus === 'pending') {
        const { error } = await supabase.from('students').upsert({
          id: s.id,
          workspace_id: this.workspaceId,
          name: s.name,
          is_deleted: !!s.isDeleted,
          created_by: this.user.id
          // updated_at is handled by server trigger
        });
        if (!error) s.syncStatus = 'synced';
      }

      // 2. Routine
      if (s.routineSyncStatus === 'pending') {
        const { error } = await supabase.from('routines').upsert({
          student_id: s.id,
          content: s.routine,
          created_by: this.user.id
        });
        if (!error) s.routineSyncStatus = 'synced';
      }

      // 3. Notes (Upsert)
      if (s.notesSyncStatus === 'pending') {
        const { error } = await supabase.from('notes').upsert({
          student_id: s.id,
          content: s.notes || '',
          created_by: this.user.id
        });
        if (!error) s.notesSyncStatus = 'synced';
      }

      // 4. Measurements (Append only)
      for (let m of s.measurements) {
        if (m.syncStatus === 'pending') {
          const { error } = await supabase.from('measurements').insert({
            id: m.id,
            student_id: s.id,
            weight: m.weight,
            height: m.height,
            fat: m.fat,
            muscle: m.muscle,
            date_str: m.date,
            created_by: this.user.id
          });
          if (!error) m.syncStatus = 'synced';
        }
      }

      // 5. Sessions (Append only)
      for (let sess of s.history) {
        if (sess.syncStatus === 'pending') {
          const { error } = await supabase.from('sessions').insert({
            id: sess.id,
            student_id: s.id,
            exercises: sess.exercises,
            day_name: sess.dayName,
            focus: sess.focus,
            duration: sess.duration,
            date_iso: sess.dateISO,
            created_by: this.user.id
          });
          if (!error) sess.syncStatus = 'synced';
        }
      }
    }

    if (window.persist) window.persist();
  },

  async pullRemoteChanges() {
    if (!window.DB || !window.DB.students) return;
    
    // FULL RESTORE check
    const isFullRestore = !this.lastSyncAt;
    const lastSync = this.lastSyncAt || '2000-01-01T00:00:00Z';
    
    let maxServerTime = 0;
    const updateMaxTime = (isoString) => {
      const t = new Date(isoString).getTime();
      if (t > maxServerTime) maxServerTime = t;
    };

    // Pull Students (Last write wins)
    const { data: students } = await supabase.from('students').select('*').gt('updated_at', lastSync);
    if (students && students.length) {
      students.forEach(rem => {
        updateMaxTime(rem.updated_at);
        let loc = window.DB.students.find(x => x.id === rem.id);
        if (!loc) {
          loc = { id: rem.id, name: rem.name, isDeleted: rem.is_deleted, routine: [], history: [], measurements: [], notes: '', createdAt: rem.created_at, updatedAt: rem.updated_at, syncStatus: 'synced' };
          window.DB.students.push(loc);
        } else if (new Date(rem.updated_at) > new Date(loc.updatedAt || 0)) {
          loc.name = rem.name;
          loc.isDeleted = rem.is_deleted;
          loc.updatedAt = rem.updated_at;
          loc.syncStatus = 'synced';
        }
      });
    }

    // Pull Routines (Last write wins)
    const { data: routines } = await supabase.from('routines').select('*').gt('updated_at', lastSync);
    if (routines && routines.length) {
      routines.forEach(rem => {
        updateMaxTime(rem.updated_at);
        const loc = window.DB.students.find(x => x.id === rem.student_id);
        if (loc && new Date(rem.updated_at) > new Date(loc.routineUpdatedAt || 0)) {
          loc.routine = rem.content;
          loc.routineUpdatedAt = rem.updated_at;
          loc.routineSyncStatus = 'synced';
        }
      });
    }

    // Pull Notes (Last Write Wins)
    const { data: notes } = await supabase.from('notes').select('*').gt('updated_at', lastSync);
    if (notes && notes.length) {
      notes.forEach(rem => {
        updateMaxTime(rem.updated_at);
        const loc = window.DB.students.find(x => x.id === rem.student_id);
        if (loc && (!loc.notesUpdatedAt || new Date(rem.updated_at) > new Date(loc.notesUpdatedAt))) {
          loc.notes = rem.content;
          loc.notesUpdatedAt = rem.updated_at;
          loc.notesSyncStatus = 'synced';
        }
      });
    }

    // Pull Measurements (Append only)
    const { data: measurements } = await supabase.from('measurements').select('*').gt('created_at', lastSync);
    if (measurements && measurements.length) {
      measurements.forEach(rem => {
        updateMaxTime(rem.created_at);
        const loc = window.DB.students.find(x => x.id === rem.student_id);
        if (loc && !loc.measurements.find(m => m.id === rem.id)) {
          loc.measurements.push({
            id: rem.id, date: rem.date_str, weight: rem.weight, height: rem.height, fat: rem.fat, muscle: rem.muscle, syncStatus: 'synced'
          });
          loc.measurements.sort((a,b) => new Date(a.date) - new Date(b.date));
        }
      });
    }

    // Pull Sessions (Append only)
    const { data: sessions } = await supabase.from('sessions').select('*').gt('created_at', lastSync);
    if (sessions && sessions.length) {
      sessions.forEach(rem => {
        updateMaxTime(rem.created_at);
        const loc = window.DB.students.find(x => x.id === rem.student_id);
        if (loc && !loc.history.find(s => s.id === rem.id)) {
          loc.history.push({
            id: rem.id, dateISO: rem.date_iso, date: rem.date_iso.split('T')[0], dayName: rem.day_name, focus: rem.focus, duration: rem.duration, exercises: rem.exercises, syncStatus: 'synced'
          });
          loc.history.sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
        }
      });
    }

    if (maxServerTime > 0) {
      this.lastSyncAt = new Date(maxServerTime).toISOString();
      localStorage.setItem('fitTrackLastSync', this.lastSyncAt);
    }
    
    if (window.persist) window.persist();
    if (window.renderList && window.UI && window.UI.view === 'list') window.renderList();
  },

  triggerPush() {
    if (this.user && this.workspaceId && navigator.onLine) {
      this.pushLocalChanges();
    }
  },

  showLoginModal() {
    const root = document.getElementById('root');
    const old = document.getElementById('login-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'login-modal-overlay';
    overlay.className = 'modal-bg';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="syne" style="font-size: 22px; font-weight: 800; margin-bottom: 8px;">Acceso Colaborativo</div>
        <div style="color: var(--t2); font-size: 13px; margin-bottom: 20px;">Inicia sesión para sincronizar tus alumnos en la nube de forma segura.</div>
        
        <input id="sync-email" type="email" class="inp" placeholder="Correo electrónico" style="width: 100%; margin-bottom: 12px;">
        <input id="sync-pass" type="password" class="inp" placeholder="Contraseña" style="width: 100%; margin-bottom: 24px;">
        
        <div style="display: flex; gap: 10px;">
          <button onclick="document.getElementById('login-modal-overlay').remove()" class="btn-g" style="flex: 1;">Usar Offline</button>
          <button id="btn-sync-login" class="btn-p" style="flex: 1;">Ingresar</button>
        </div>
      </div>
    `;
    root.appendChild(overlay);

    document.getElementById('btn-sync-login').addEventListener('click', async () => {
      const email = document.getElementById('sync-email').value;
      const pass = document.getElementById('sync-pass').value;
      if (!email || !pass) return;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        alert('Error: ' + error.message);
      } else {
        overlay.remove();
        this.updateUI('synced');
        this.fetchWorkspace();
      }
    });
  }
};

// Iniciar al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (window.SyncEngine) window.SyncEngine.init(); }, 500);
  });
} else {
  setTimeout(() => { if (window.SyncEngine) window.SyncEngine.init(); }, 500);
}
