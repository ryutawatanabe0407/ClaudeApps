// ガントチャートツール
class GanttChart {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.zoomLevel = 1;
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
        this.renderGanttChart();
    }

    setupEventListeners() {
        // タスク追加ボタン
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showTaskForm();
        });

        // タスク保存ボタン
        document.getElementById('saveTaskBtn').addEventListener('click', () => {
            this.saveTask();
        });

        // キャンセルボタン
        document.getElementById('cancelTaskBtn').addEventListener('click', () => {
            this.hideTaskForm();
        });

        // すべてクリアボタン
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            if (confirm('すべてのタスクを削除しますか？')) {
                this.tasks = [];
                this.saveTasks();
                this.renderTasks();
                this.renderGanttChart();
            }
        });

        // エクスポートボタン
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportTasks();
        });

        // 進捗率スライダー
        document.getElementById('progress').addEventListener('input', (e) => {
            document.getElementById('progressValue').textContent = e.target.value;
        });

        // ズームボタン
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomLevel = Math.min(this.zoomLevel + 0.2, 2);
            this.renderGanttChart();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomLevel = Math.max(this.zoomLevel - 0.2, 0.5);
            this.renderGanttChart();
        });

        // 今日ボタン
        document.getElementById('todayBtn').addEventListener('click', () => {
            const todayLine = document.querySelector('.gantt-today-line');
            if (todayLine) {
                todayLine.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    showTaskForm(task = null) {
        const form = document.getElementById('taskForm');
        const formTitle = document.getElementById('formTitle');

        if (task) {
            formTitle.textContent = 'タスクを編集';
            document.getElementById('taskName').value = task.name;
            document.getElementById('startDate').value = task.startDate;
            document.getElementById('endDate').value = task.endDate;
            document.getElementById('progress').value = task.progress;
            document.getElementById('progressValue').textContent = task.progress;
            document.getElementById('taskColor').value = task.color;
            this.currentTaskId = task.id;
        } else {
            formTitle.textContent = '新しいタスク';
            document.getElementById('taskName').value = '';
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('progress').value = 0;
            document.getElementById('progressValue').textContent = '0';
            document.getElementById('taskColor').value = '#4A90E2';
            this.currentTaskId = null;
        }

        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }

    hideTaskForm() {
        document.getElementById('taskForm').style.display = 'none';
        this.currentTaskId = null;
    }

    saveTask() {
        const name = document.getElementById('taskName').value.trim();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const progress = parseInt(document.getElementById('progress').value);
        const color = document.getElementById('taskColor').value;

        if (!name || !startDate || !endDate) {
            alert('タスク名、開始日、終了日を入力してください');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('終了日は開始日より後である必要があります');
            return;
        }

        const task = {
            id: this.currentTaskId || Date.now(),
            name,
            startDate,
            endDate,
            progress,
            color
        };

        if (this.currentTaskId) {
            const index = this.tasks.findIndex(t => t.id === this.currentTaskId);
            this.tasks[index] = task;
        } else {
            this.tasks.push(task);
        }

        this.saveTasks();
        this.renderTasks();
        this.renderGanttChart();
        this.hideTaskForm();
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.showTaskForm(task);
        }
    }

    deleteTask(id) {
        if (confirm('このタスクを削除しますか？')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.renderGanttChart();
        }
    }

    renderTasks() {
        const tasksContainer = document.getElementById('tasks');

        if (this.tasks.length === 0) {
            tasksContainer.innerHTML = '<p style="color: #999;">タスクがありません</p>';
            return;
        }

        tasksContainer.innerHTML = this.tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-name">
                        <div class="task-color-indicator" style="background-color: ${task.color}"></div>
                        ${task.name}
                    </div>
                    <div class="task-dates">
                        ${this.formatDate(task.startDate)} 〜 ${this.formatDate(task.endDate)}
                    </div>
                </div>
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress}%"></div>
                    </div>
                    <div class="progress-text">${task.progress}% 完了</div>
                </div>
                <div class="task-actions">
                    <button class="btn-small btn-edit" onclick="ganttChart.editTask(${task.id})">編集</button>
                    <button class="btn-small btn-delete" onclick="ganttChart.deleteTask(${task.id})">削除</button>
                </div>
            </div>
        `).join('');
    }

    renderGanttChart() {
        const chartContainer = document.getElementById('ganttChart');

        if (this.tasks.length === 0) {
            chartContainer.innerHTML = '<div class="gantt-empty">タスクを追加してガントチャートを表示しましょう</div>';
            return;
        }

        const { minDate, maxDate, totalDays } = this.getDateRange();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '<div class="gantt-grid">';

        // ヘッダー
        html += '<div class="gantt-header">';
        html += '<div class="gantt-header-title">タスク</div>';
        html += '<div class="gantt-header-title">タイムライン</div>';
        html += '</div>';

        // 各タスクの行
        this.tasks.forEach(task => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            const startOffset = this.getDaysDifference(minDate, startDate);
            const duration = this.getDaysDifference(startDate, endDate) + 1;

            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;

            html += '<div class="gantt-row">';
            html += `
                <div class="gantt-task-name">
                    <div class="task-color-indicator" style="background-color: ${task.color}"></div>
                    ${task.name}
                </div>
            `;
            html += '<div class="gantt-timeline-container">';

            // 今日のライン
            if (today >= minDate && today <= maxDate) {
                const todayOffset = this.getDaysDifference(minDate, today);
                const todayPercent = (todayOffset / totalDays) * 100;
                html += `<div class="gantt-today-line" style="left: ${todayPercent}%"></div>`;
            }

            // タスクバー
            html += `
                <div class="gantt-bar"
                     style="left: ${leftPercent}%; width: ${widthPercent}%; background-color: ${task.color}"
                     title="${task.name}: ${task.progress}% 完了">
                    ${task.progress}%
                </div>
            `;
            html += '</div>';
            html += '</div>';
        });

        // 日付ラベル
        html += '<div class="gantt-date-labels">';
        html += `<span>${this.formatDate(minDate)}</span>`;
        html += `<span>${this.formatDate(maxDate)}</span>`;
        html += '</div>';

        html += '</div>';
        chartContainer.innerHTML = html;
    }

    getDateRange() {
        const dates = this.tasks.flatMap(task => [
            new Date(task.startDate),
            new Date(task.endDate)
        ]);

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // 少し余裕を持たせる
        minDate.setDate(minDate.getDate() - 2);
        maxDate.setDate(maxDate.getDate() + 2);

        const totalDays = this.getDaysDifference(minDate, maxDate);

        return { minDate, maxDate, totalDays };
    }

    getDaysDifference(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round((date2 - date1) / oneDay);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    saveTasks() {
        localStorage.setItem('gantt-tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('gantt-tasks');
        if (saved) {
            this.tasks = JSON.parse(saved);
        }
    }

    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gantt-tasks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

// アプリケーション初期化
let ganttChart;
document.addEventListener('DOMContentLoaded', () => {
    ganttChart = new GanttChart();
});
