// ===== API Client =====
const API_BASE = `http://${window.location.hostname}:3001/api`;

const api = {
  async get(path) {
    const r = await fetch(API_BASE + path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(path) {
    const r = await fetch(API_BASE + path, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

// ===== Toast =====
function toast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove());
  }, 3000);
}

// ===== Loading =====
function showLoading() {
  if (document.querySelector('.loading-overlay')) return;
  const el = document.createElement('div');
  el.className = 'loading-overlay';
  el.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(el);
}
function hideLoading() {
  document.querySelector('.loading-overlay')?.remove();
}

// ===== Gantt Chart =====
class GanttChart {
  constructor() {
    this.tasks = [];
    this.filteredTasks = [];
    this.currentTaskId = null;
    this.filterStatus = 'all';
    this.filterSort = 'order';
    this.timeScale = 'day';
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.migrateFromLocalStorage();
    await this.loadTasks();
    this.renderTasks();
    this.renderGanttChart();
    this.updateStats();
  }

  // localStorage からデータ移行
  async migrateFromLocalStorage() {
    const saved = localStorage.getItem('gantt-tasks');
    if (!saved) return;
    try {
      const oldTasks = JSON.parse(saved);
      if (!oldTasks.length) { localStorage.removeItem('gantt-tasks'); return; }
      for (const t of oldTasks) {
        await api.post('/tasks', {
          name: t.name,
          start_date: t.startDate,
          end_date: t.endDate,
          progress: t.progress || 0,
          color: t.color || '#2563EB',
          status: 'todo'
        });
      }
      localStorage.removeItem('gantt-tasks');
      toast(`${oldTasks.length}件のタスクを移行しました`, 'success');
    } catch (e) {
      // マイグレーション失敗時は既存データを残す
    }
  }

  setupEventListeners() {
    document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskForm());
    document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());
    document.getElementById('cancelTaskBtn').addEventListener('click', () => this.hideTaskForm());

    document.getElementById('clearAllBtn').addEventListener('click', async () => {
      if (!confirm('すべてのタスクを削除しますか？')) return;
      showLoading();
      try {
        await api.delete('/tasks');
        this.tasks = [];
        this.applyFilter();
        this.renderTasks();
        this.renderGanttChart();
        this.updateStats();
        toast('すべてのタスクを削除しました', 'info');
      } catch (e) {
        toast('削除に失敗しました', 'error');
      } finally { hideLoading(); }
    });

    document.getElementById('exportBtn').addEventListener('click', () => this.exportTasks());
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => {
      this.importFromExcel(e.target.files[0]);
      e.target.value = '';
    });

    document.getElementById('progress').addEventListener('input', (e) => {
      document.getElementById('progressValue').textContent = e.target.value;
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
      const el = document.querySelector('.gantt-chart');
      const cur = parseFloat(getComputedStyle(el).getPropertyValue('--gantt-unit-width')) || 80;
      el.style.setProperty('--gantt-unit-width', Math.min(cur + 20, 160) + 'px');
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      const el = document.querySelector('.gantt-chart');
      const cur = parseFloat(getComputedStyle(el).getPropertyValue('--gantt-unit-width')) || 80;
      el.style.setProperty('--gantt-unit-width', Math.max(cur - 20, 40) + 'px');
    });
    document.getElementById('todayBtn').addEventListener('click', () => {
      document.querySelector('.gantt-today-line')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    document.getElementById('timeScale').addEventListener('change', (e) => {
      this.timeScale = e.target.value;
      this.renderGanttChart();
    });

    // フィルター
    document.getElementById('filterStatus').addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.applyFilter();
      this.renderTasks();
      this.renderGanttChart();
    });
    document.getElementById('filterSort').addEventListener('change', (e) => {
      this.filterSort = e.target.value;
      this.applyFilter();
      this.renderTasks();
      this.renderGanttChart();
    });
  }

  applyFilter() {
    let tasks = [...this.tasks];
    if (this.filterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === this.filterStatus);
    }
    if (this.filterSort === 'start_date') {
      tasks.sort((a, b) => a.start_date.localeCompare(b.start_date));
    } else if (this.filterSort === 'end_date') {
      tasks.sort((a, b) => a.end_date.localeCompare(b.end_date));
    } else if (this.filterSort === 'progress_desc') {
      tasks.sort((a, b) => b.progress - a.progress);
    } else {
      tasks.sort((a, b) => a.order_index - b.order_index);
    }
    this.filteredTasks = tasks;
  }

  async loadTasks() {
    try {
      this.tasks = await api.get('/tasks');
      this.applyFilter();
    } catch (e) {
      toast('サーバーに接続できません。バックエンドが起動しているか確認してください。', 'error');
      this.tasks = [];
      this.filteredTasks = [];
    }
  }

  showTaskForm(task = null) {
    const form = document.getElementById('taskForm');
    document.getElementById('formTitle').textContent = task ? 'タスクを編集' : '新しいタスク';
    document.getElementById('taskName').value = task?.name || '';
    document.getElementById('startDate').value = task?.start_date || '';
    document.getElementById('endDate').value = task?.end_date || '';
    document.getElementById('progress').value = task?.progress ?? 0;
    document.getElementById('progressValue').textContent = task?.progress ?? 0;
    document.getElementById('taskColor').value = task?.color || '#2563EB';
    document.getElementById('taskStatus').value = task?.status || 'todo';
    this.currentTaskId = task?.id || null;
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  hideTaskForm() {
    document.getElementById('taskForm').style.display = 'none';
    this.currentTaskId = null;
  }

  async saveTask() {
    const name = document.getElementById('taskName').value.trim();
    const start_date = document.getElementById('startDate').value;
    const end_date = document.getElementById('endDate').value;
    const progress = parseInt(document.getElementById('progress').value);
    const color = document.getElementById('taskColor').value;
    const status = document.getElementById('taskStatus').value;

    if (!name || !start_date || !end_date) { toast('タスク名、開始日、終了日は必須です', 'error'); return; }
    if (new Date(start_date) > new Date(end_date)) { toast('終了日は開始日より後にしてください', 'error'); return; }

    showLoading();
    try {
      if (this.currentTaskId) {
        const updated = await api.patch(`/tasks/${this.currentTaskId}`, { name, start_date, end_date, progress, color, status });
        const idx = this.tasks.findIndex(t => t.id === this.currentTaskId);
        if (idx !== -1) this.tasks[idx] = updated;
        toast('タスクを更新しました', 'success');
      } else {
        const created = await api.post('/tasks', { name, start_date, end_date, progress, color, status });
        this.tasks.push(created);
        toast('タスクを追加しました', 'success');
      }
      this.applyFilter();
      this.renderTasks();
      this.renderGanttChart();
      this.updateStats();
      this.hideTaskForm();
    } catch (e) {
      toast('保存に失敗しました', 'error');
    } finally { hideLoading(); }
  }

  editTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) this.showTaskForm(task);
  }

  async deleteTask(id) {
    if (!confirm('このタスクを削除しますか？')) return;
    showLoading();
    try {
      await api.delete(`/tasks/${id}`);
      this.tasks = this.tasks.filter(t => t.id !== id);
      this.applyFilter();
      this.renderTasks();
      this.renderGanttChart();
      this.updateStats();
      toast('タスクを削除しました', 'info');
    } catch (e) {
      toast('削除に失敗しました', 'error');
    } finally { hideLoading(); }
  }

  updateStats() {
    const total = this.tasks.length;
    const done = this.tasks.filter(t => t.status === 'done').length;
    const inProg = this.tasks.filter(t => t.status === 'in_progress').length;
    const avgProg = total ? Math.round(this.tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;

    const el = document.getElementById('headerStats');
    if (el) {
      el.innerHTML = `
        <div class="stat-badge"><div class="stat-num">${total}</div><div class="stat-label">タスク</div></div>
        <div class="stat-badge"><div class="stat-num">${inProg}</div><div class="stat-label">進行中</div></div>
        <div class="stat-badge"><div class="stat-num">${done}</div><div class="stat-label">完了</div></div>
        <div class="stat-badge"><div class="stat-num">${avgProg}%</div><div class="stat-label">平均進捗</div></div>
      `;
    }
    const countEl = document.getElementById('taskCount');
    if (countEl) countEl.textContent = `${this.filteredTasks.length} 件`;
  }

  // ===== Render Tasks =====
  renderTasks() {
    const container = document.getElementById('tasks');
    if (this.filteredTasks.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;">タスクがありません</p>';
      return;
    }

    const statusLabels = { todo: 'TODO', in_progress: '進行中', done: '完了' };
    container.innerHTML = this.filteredTasks.map(task => `
      <div class="task-item" draggable="true" data-id="${task.id}">
        <span class="drag-handle" title="ドラッグして並び替え">⠿</span>
        <div class="task-info">
          <div class="task-name">
            <div class="task-color-indicator" style="background-color:${task.color};color:${task.color}"></div>
            ${this.escapeHtml(task.name)}
          </div>
          <div class="task-dates">${this.formatDate(task.start_date)} 〜 ${this.formatDate(task.end_date)}</div>
        </div>
        <span class="status-badge status-${task.status}">${statusLabels[task.status] || task.status}</span>
        <div class="task-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${task.progress}%"></div></div>
          <div class="progress-text">${task.progress}%</div>
        </div>
        <div class="task-actions">
          <button class="btn-small btn-edit" onclick="ganttChart.editTask(${task.id})">編集</button>
          <button class="btn-small btn-delete" onclick="ganttChart.deleteTask(${task.id})">削除</button>
        </div>
      </div>
    `).join('');

    this.setupDragDrop();
  }

  // ===== Drag & Drop (並び替え) =====
  setupDragDrop() {
    const items = document.querySelectorAll('.task-item');
    let dragging = null;

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragging = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
        this.saveOrder();
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (item !== dragging) {
          document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
          item.classList.add('drag-over');
          const container = document.getElementById('tasks');
          const items = [...container.querySelectorAll('.task-item:not(.dragging)')];
          const idx = items.indexOf(item);
          const draggingIdx = [...container.querySelectorAll('.task-item')].indexOf(dragging);
          if (draggingIdx < idx) container.insertBefore(dragging, item.nextSibling);
          else container.insertBefore(dragging, item);
        }
      });
    });
  }

  async saveOrder() {
    const items = document.querySelectorAll('.task-item');
    const ids = [...items].map(el => parseInt(el.dataset.id));
    try {
      await api.patch('/tasks/reorder', { ids });
      ids.forEach((id, i) => {
        const t = this.tasks.find(t => t.id === id);
        if (t) t.order_index = i;
      });
    } catch (e) {
      toast('並び替えの保存に失敗しました', 'error');
    }
  }

  // ===== Render Gantt =====
  renderGanttChart() {
    const chartContainer = document.getElementById('ganttChart');
    if (this.filteredTasks.length === 0) {
      chartContainer.innerHTML = '<div class="gantt-empty"><div class="gantt-empty-icon">📊</div><span>タスクを追加してガントチャートを表示しましょう</span></div>';
      return;
    }

    const { minDate, maxDate, totalUnits } = this.getDateRange();
    const timeHeaders = this.generateTimeHeaders(minDate, maxDate);
    const today = new Date(); today.setHours(0,0,0,0);

    let html = `<div class="gantt-grid" style="--gantt-units:${timeHeaders.length};">`;
    html += '<div class="gantt-header">';
    html += '<div class="gantt-header-title">タスク</div>';
    html += '<div class="gantt-timeline-header">';
    timeHeaders.forEach(h => { html += `<div class="gantt-time-cell">${h}</div>`; });
    html += '</div></div>';

    this.filteredTasks.forEach(task => {
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      const startOffset = this.getUnitsFromDate(minDate, startDate);
      const duration = this.getUnitsFromDate(startDate, endDate) + 1;
      const leftPercent = (startOffset / totalUnits) * 100;
      const widthPercent = (duration / totalUnits) * 100;

      html += '<div class="gantt-row">';
      html += `<div class="gantt-task-name"><div class="task-color-indicator" style="background-color:${task.color};color:${task.color}"></div>${this.escapeHtml(task.name)}</div>`;
      html += '<div class="gantt-timeline-container">';
      if (today >= minDate && today <= maxDate) {
        const todayOffset = this.getUnitsFromDate(minDate, today);
        html += `<div class="gantt-today-line" style="left:${(todayOffset / totalUnits) * 100}%"></div>`;
      }
      html += `<div class="gantt-bar" style="left:${leftPercent}%;width:${Math.max(widthPercent, 2)}%;background:${task.color};" title="${this.escapeHtml(task.name)}: ${task.progress}% 完了">${task.progress}%</div>`;
      html += '</div></div>';
    });
    html += '</div>';
    chartContainer.innerHTML = html;
  }

  getDateRange() {
    const dates = this.filteredTasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
    let minDate = new Date(Math.min(...dates));
    let maxDate = new Date(Math.max(...dates));
    if (this.timeScale === 'week') {
      const d = minDate.getDay(); minDate.setDate(minDate.getDate() - (d === 0 ? 6 : d - 1));
      const ed = maxDate.getDay(); maxDate.setDate(maxDate.getDate() + (ed === 0 ? 0 : 7 - ed));
    } else if (this.timeScale === 'month') {
      minDate.setDate(1); maxDate.setMonth(maxDate.getMonth() + 1, 0);
    } else {
      minDate.setDate(minDate.getDate() - 2); maxDate.setDate(maxDate.getDate() + 2);
    }
    return { minDate, maxDate, totalUnits: this.getUnitsFromDate(minDate, maxDate) };
  }

  getUnitsFromDate(d1, d2) {
    if (this.timeScale === 'day') return Math.round((d2 - d1) / 86400000);
    if (this.timeScale === 'week') return Math.ceil(Math.round((d2 - d1) / 86400000) / 7);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  }

  generateTimeHeaders(minDate, maxDate) {
    const headers = []; const cur = new Date(minDate);
    if (this.timeScale === 'day') {
      while (cur <= maxDate) { headers.push(`${cur.getMonth()+1}/${cur.getDate()}`); cur.setDate(cur.getDate()+1); }
    } else if (this.timeScale === 'week') {
      while (cur <= maxDate) { headers.push(`${cur.getMonth()+1}/${cur.getDate()}`); cur.setDate(cur.getDate()+7); }
    } else {
      while (cur <= maxDate) { headers.push(`${cur.getFullYear()}/${String(cur.getMonth()+1).padStart(2,'0')}`); cur.setMonth(cur.getMonth()+1); }
    }
    return headers;
  }

  formatDate(s) {
    const d = new Date(s);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  }

  escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  isDateInRange(check, start, end) {
    const c = new Date(check); c.setHours(0,0,0,0);
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end); e.setHours(0,0,0,0);
    if (this.timeScale === 'day') return c >= s && c <= e;
    if (this.timeScale === 'week') { const we = new Date(c); we.setDate(we.getDate()+6); return c <= e && we >= s; }
    const ms = new Date(c.getFullYear(), c.getMonth(), 1);
    const me = new Date(c.getFullYear(), c.getMonth()+1, 0);
    return ms <= e && me >= s;
  }

  // ===== Export / Import =====
  exportTasks() {
    if (!this.tasks.length) { toast('エクスポートするタスクがありません', 'error'); return; }
    const { minDate, maxDate } = this.getDateRange();
    const dates = []; const cur = new Date(minDate);
    while (cur <= maxDate) {
      dates.push(new Date(cur));
      if (this.timeScale === 'day') cur.setDate(cur.getDate()+1);
      else if (this.timeScale === 'week') cur.setDate(cur.getDate()+7);
      else cur.setMonth(cur.getMonth()+1);
    }

    const wb = XLSX.utils.book_new();
    const wsData = [['タスク名','開始日','終了日','進捗率','ステータス', ...dates.map(d => this.formatDateForExcel(d))]];
    this.tasks.forEach(task => {
      const row = [task.name, task.start_date, task.end_date, `${task.progress}%`, task.status];
      dates.forEach(d => row.push(this.isDateInRange(d, task.start_date, task.end_date) ? '■' : ''));
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:20},{wch:12},{wch:12},{wch:10},{wch:12},...dates.map(()=>({wch:5}))];
    XLSX.utils.book_append_sheet(wb, ws, 'ガントチャート');
    XLSX.writeFile(wb, `gantt-chart-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast('Excelにエクスポートしました', 'success');
  }

  formatDateForExcel(d) {
    if (this.timeScale === 'month') return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`;
    return `${d.getMonth()+1}/${d.getDate()}`;
  }

  importFromExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) { toast('データが見つかりませんでした', 'error'); return; }

        const tasks = [];
        for (let i = 1; i < rows.length; i++) {
          const [name, sd, ed, prog, status] = rows[i];
          if (!name || !sd || !ed) continue;
          const start_date = this.parseExcelDate(sd);
          const end_date = this.parseExcelDate(ed);
          if (!start_date || !end_date) continue;
          const match = String(prog || '').match(/\d+/);
          const colors = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899'];
          tasks.push({ name: String(name), start_date, end_date, progress: match ? parseInt(match[0]) : 0, color: colors[tasks.length % colors.length], status: status || 'todo' });
        }

        if (!tasks.length) { toast('有効なタスクが見つかりませんでした', 'error'); return; }
        if (!confirm(`${tasks.length}件のタスクをインポートします。既存データは削除されます。よろしいですか？`)) return;

        showLoading();
        await api.delete('/tasks');
        for (const t of tasks) await api.post('/tasks', t);
        await this.loadTasks();
        this.renderTasks();
        this.renderGanttChart();
        this.updateStats();
        toast(`${tasks.length}件インポートしました`, 'success');
      } catch (err) {
        toast('インポートに失敗しました', 'error');
      } finally { hideLoading(); }
    };
    reader.readAsArrayBuffer(file);
  }

  parseExcelDate(v) {
    if (!v) return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    if (typeof v === 'string' && /^\d{4}\/\d{2}\/\d{2}$/.test(v)) return v.replace(/\//g, '-');
    if (typeof v === 'number') {
      const d = new Date((v - 25569) * 86400 * 1000);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if (v instanceof Date) {
      return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    }
    try {
      const d = new Date(v);
      if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } catch (_) {}
    return null;
  }
}

let ganttChart;
document.addEventListener('DOMContentLoaded', () => { ganttChart = new GanttChart(); });
