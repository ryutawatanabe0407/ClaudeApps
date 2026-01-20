// ガントチャートツール
class GanttChart {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.zoomLevel = 1;
        this.timeScale = 'day'; // 'day', 'week', 'month'
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

        // 時間軸セレクト
        const timeScaleSelect = document.getElementById('timeScale');
        if (timeScaleSelect) {
            console.log('時間軸セレクトが見つかりました');
            timeScaleSelect.addEventListener('change', (e) => {
                console.log('時間軸変更:', e.target.value);
                this.timeScale = e.target.value;
                this.renderGanttChart();
            });
        } else {
            console.error('時間軸セレクトが見つかりません');
        }
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

        const { minDate, maxDate, totalUnits } = this.getDateRange();
        const timeHeaders = this.generateTimeHeaders(minDate, maxDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '<div class="gantt-grid">';

        // ヘッダー
        html += '<div class="gantt-header">';
        html += '<div class="gantt-header-title">タスク</div>';
        html += '<div class="gantt-timeline-header">';
        timeHeaders.forEach(header => {
            html += `<div class="gantt-time-cell">${header}</div>`;
        });
        html += '</div>';
        html += '</div>';

        // 各タスクの行
        this.tasks.forEach(task => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            const startOffset = this.getUnitsFromDate(minDate, startDate);
            const duration = this.getUnitsFromDate(startDate, endDate) + 1;

            const leftPercent = (startOffset / totalUnits) * 100;
            const widthPercent = (duration / totalUnits) * 100;

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
                const todayOffset = this.getUnitsFromDate(minDate, today);
                const todayPercent = (todayOffset / totalUnits) * 100;
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

        html += '</div>';
        chartContainer.innerHTML = html;
    }

    getDateRange() {
        const dates = this.tasks.flatMap(task => [
            new Date(task.startDate),
            new Date(task.endDate)
        ]);

        let minDate = new Date(Math.min(...dates));
        let maxDate = new Date(Math.max(...dates));

        // 時間軸に応じて開始日と終了日を調整
        if (this.timeScale === 'week') {
            // 週の開始日（月曜日）に調整
            const day = minDate.getDay();
            const diff = day === 0 ? 6 : day - 1;
            minDate.setDate(minDate.getDate() - diff);
            // 週の終了日（日曜日）に調整
            const endDay = maxDate.getDay();
            const endDiff = endDay === 0 ? 0 : 7 - endDay;
            maxDate.setDate(maxDate.getDate() + endDiff);
        } else if (this.timeScale === 'month') {
            // 月の開始日に調整
            minDate.setDate(1);
            // 月の終了日に調整
            maxDate.setMonth(maxDate.getMonth() + 1, 0);
        } else {
            // 日単位の場合は余裕を持たせる
            minDate.setDate(minDate.getDate() - 2);
            maxDate.setDate(maxDate.getDate() + 2);
        }

        const totalUnits = this.getUnitsFromDate(minDate, maxDate);

        return { minDate, maxDate, totalUnits };
    }

    getUnitsFromDate(date1, date2) {
        if (this.timeScale === 'day') {
            return this.getDaysDifference(date1, date2);
        } else if (this.timeScale === 'week') {
            const days = this.getDaysDifference(date1, date2);
            return Math.ceil(days / 7);
        } else if (this.timeScale === 'month') {
            const months = (date2.getFullYear() - date1.getFullYear()) * 12 +
                          (date2.getMonth() - date1.getMonth());
            return months;
        }
        return 0;
    }

    generateTimeHeaders(minDate, maxDate) {
        const headers = [];
        const currentDate = new Date(minDate);

        if (this.timeScale === 'day') {
            while (currentDate <= maxDate) {
                headers.push(this.formatDateShort(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else if (this.timeScale === 'week') {
            while (currentDate <= maxDate) {
                const weekEnd = new Date(currentDate);
                weekEnd.setDate(weekEnd.getDate() + 6);
                headers.push(`${this.formatDateShort(currentDate)}`);
                currentDate.setDate(currentDate.getDate() + 7);
            }
        } else if (this.timeScale === 'month') {
            while (currentDate <= maxDate) {
                headers.push(`${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        return headers;
    }

    formatDateShort(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}`;
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
        console.log('exportTasks呼び出し');
        if (this.tasks.length === 0) {
            alert('エクスポートするタスクがありません');
            return;
        }

        console.log('exportToExcel呼び出し');
        this.exportToExcel();
    }

    exportToExcel() {
        console.log('exportToExcel実行開始');
        console.log('XLSX:', typeof XLSX);
        const { minDate, maxDate } = this.getDateRange();

        // 日付の配列を生成
        const dates = [];
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            dates.push(new Date(currentDate));
            if (this.timeScale === 'day') {
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (this.timeScale === 'week') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else if (this.timeScale === 'month') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        // ワークブックとワークシートを作成
        const wb = XLSX.utils.book_new();
        const wsData = [];

        // ヘッダー行を作成
        const headerRow = ['タスク名', '開始日', '終了日', '進捗率', ...dates.map(d => this.formatDateForExcel(d))];
        wsData.push(headerRow);

        // 各タスクの行を作成
        this.tasks.forEach(task => {
            const row = [
                task.name,
                task.startDate,
                task.endDate,
                `${task.progress}%`
            ];

            // 各日付に対してセルを追加
            dates.forEach(date => {
                const taskStart = new Date(task.startDate);
                const taskEnd = new Date(task.endDate);

                // この日付がタスクの期間内かどうかをチェック
                if (this.isDateInRange(date, taskStart, taskEnd)) {
                    row.push('■');
                } else {
                    row.push('');
                }
            });

            wsData.push(row);
        });

        // ワークシートを作成
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // 列幅を設定
        const colWidths = [
            { wch: 20 }, // タスク名
            { wch: 12 }, // 開始日
            { wch: 12 }, // 終了日
            { wch: 10 }, // 進捗率
            ...dates.map(() => ({ wch: 5 })) // 日付列
        ];
        ws['!cols'] = colWidths;

        // セルのスタイルを設定（背景色）
        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let R = 1; R <= range.e.r; R++) {
            const task = this.tasks[R - 1];
            if (!task) continue;

            for (let C = 4; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellAddress];

                if (cell && cell.v === '■') {
                    // セルに背景色を設定
                    const color = task.color.replace('#', '');
                    if (!cell.s) cell.s = {};
                    cell.s.fill = {
                        patternType: 'solid',
                        fgColor: { rgb: color }
                    };
                    cell.s.font = {
                        color: { rgb: color }
                    };
                }
            }
        }

        // ワークブックにワークシートを追加
        XLSX.utils.book_append_sheet(wb, ws, 'ガントチャート');

        // ファイルを保存
        XLSX.writeFile(wb, `gantt-chart-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    formatDateForExcel(date) {
        if (this.timeScale === 'day') {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        } else if (this.timeScale === 'week') {
            const weekEnd = new Date(date);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        } else if (this.timeScale === 'month') {
            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        return this.formatDate(date);
    }

    isDateInRange(checkDate, startDate, endDate) {
        const check = new Date(checkDate);
        const start = new Date(startDate);
        const end = new Date(endDate);

        check.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (this.timeScale === 'day') {
            return check >= start && check <= end;
        } else if (this.timeScale === 'week') {
            const weekEnd = new Date(check);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return (check <= end && weekEnd >= start);
        } else if (this.timeScale === 'month') {
            const monthStart = new Date(check.getFullYear(), check.getMonth(), 1);
            const monthEnd = new Date(check.getFullYear(), check.getMonth() + 1, 0);
            return (monthStart <= end && monthEnd >= start);
        }

        return false;
    }
}

// アプリケーション初期化
let ganttChart;
document.addEventListener('DOMContentLoaded', () => {
    ganttChart = new GanttChart();
});
