const $ = (selector) => document.querySelector(selector);
let state = {tasks: [], notes: '', sessions: 0, completed: 0};
let startedAt = null;
let sessionTimer = null;

async function api(path, options = {}) {
  const response = await fetch(path, {headers: {'Content-Type': 'application/json'}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function renderTasks() {
  const html = state.tasks.map(task => `<label class="task ${task.done ? 'done' : ''}"><input type="checkbox" data-task="${task.id}" ${task.done ? 'checked' : ''}><span class="task-title">${escapeHtml(task.title)}</span><span class="tag">${task.tag}</span></label>`).join('');
  $('#task-list').innerHTML = html || '<p class="muted">Задач пока нет.</p>';
  $('#task-preview').innerHTML = state.tasks.slice(0, 4).map(task => `<label class="task ${task.done ? 'done' : ''}"><input type="checkbox" data-task="${task.id}" ${task.done ? 'checked' : ''}><span class="task-title">${escapeHtml(task.title)}</span></label>`).join('');
  document.querySelectorAll('[data-task]').forEach(input => input.addEventListener('change', async () => { state = await api(`/api/tasks/${input.dataset.task}/toggle`, {method:'POST'}); render(); }));
}

function render() {
  renderTasks();
  $('#notes-editor').value = state.notes || '';
  $('#quick-note').value = state.notes || '';
  $('#completed-stat').textContent = state.completed;
  $('#sessions-stat').textContent = state.sessions;
  $('#progress-stat').textContent = state.tasks.length ? `${Math.round(state.completed / state.tasks.length * 100)}%` : '0%';
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function showView(view) { document.querySelectorAll('.view').forEach(item => item.classList.remove('active-view')); $(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); $('#page-title').textContent = ({dashboard:'Добро пожаловать',tasks:'Задачи',notes:'Заметки',settings:'Настройки'})[view]; }
function formatTime(total) { const h = String(Math.floor(total / 3600)).padStart(2,'0'); const m = String(Math.floor(total % 3600 / 60)).padStart(2,'0'); const s = String(total % 60).padStart(2,'0'); return `${h}:${m}:${s}`; }

document.querySelectorAll('[data-view]').forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));
$('#add-task').addEventListener('click', async () => { const input = $('#new-task'); if (!input.value.trim()) return; state = await api('/api/tasks', {method:'POST', body:JSON.stringify({title: input.value})}); input.value = ''; render(); });
$('#new-task').addEventListener('keydown', event => { if (event.key === 'Enter') $('#add-task').click(); });
async function saveNotes(value) { state = await api('/api/notes', {method:'POST', body:JSON.stringify({notes:value})}); render(); }
$('#save-note').addEventListener('click', () => saveNotes($('#quick-note').value));
$('#save-notes').addEventListener('click', () => saveNotes($('#notes-editor').value));
$('#session-button').addEventListener('click', async () => { if (!startedAt) { startedAt = Date.now(); $('#session-button').textContent = '■ Завершить сессию'; sessionTimer = setInterval(() => { $('#clock').textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); }, 1000); } else { clearInterval(sessionTimer); startedAt = null; state = await api('/api/sessions', {method:'POST'}); $('#session-button').textContent = '▶ Начать сессию'; $('#clock').textContent = '00:00:00'; render(); } });

setInterval(() => { if (!startedAt) $('#clock').textContent = new Date().toLocaleTimeString('ru-RU'); }, 1000);
api('/api/state').then(data => { state = data; render(); }).catch(error => alert(error.message));
