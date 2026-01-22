class ImageGallery {
    constructor() {
        this.images = [];
        this.draggedElement = null;
        this.draggedIndex = null;

        this.folderInput = document.getElementById('folderInput');
        this.columnsInput = document.getElementById('columns');
        this.rowsInput = document.getElementById('rows');
        this.gallery = document.getElementById('gallery');
        this.autoNumberBtn = document.getElementById('autoNumberBtn');
        this.clearBtn = document.getElementById('clearBtn');

        this.initEventListeners();
    }

    initEventListeners() {
        this.folderInput.addEventListener('change', (e) => this.handleFolderSelect(e));
        this.columnsInput.addEventListener('change', () => this.updateGrid());
        this.rowsInput.addEventListener('change', () => this.updateGrid());
        this.autoNumberBtn.addEventListener('click', () => this.autoNumber());
        this.clearBtn.addEventListener('click', () => this.clearGallery());
    }

    handleFolderSelect(event) {
        const files = Array.from(event.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('画像ファイルが見つかりませんでした');
            return;
        }

        this.images = [];
        let loadedCount = 0;

        imageFiles.forEach((file, index) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                this.images.push({
                    id: Date.now() + index,
                    src: e.target.result,
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    originalName: file.name
                });

                loadedCount++;
                if (loadedCount === imageFiles.length) {
                    this.renderGallery();
                }
            };

            reader.readAsDataURL(file);
        });
    }

    updateGrid() {
        const columns = parseInt(this.columnsInput.value) || 3;
        this.gallery.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }

    renderGallery() {
        this.gallery.innerHTML = '';
        this.updateGrid();

        this.images.forEach((image, index) => {
            const item = this.createGalleryItem(image, index);
            this.gallery.appendChild(item);
        });
    }

    createGalleryItem(image, index) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.draggable = true;
        item.dataset.index = index;

        item.innerHTML = `
            <div class="drag-handle"></div>
            <div class="image-container">
                <img src="${image.src}" alt="${image.title}">
            </div>
            <div class="title-section">
                <input type="text"
                       class="title-input"
                       value="${image.title}"
                       placeholder="タイトルを入力">
            </div>
        `;

        const titleInput = item.querySelector('.title-input');
        titleInput.addEventListener('input', (e) => {
            this.images[index].title = e.target.value;
        });

        item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
        item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        item.addEventListener('dragover', (e) => this.handleDragOver(e));
        item.addEventListener('drop', (e) => this.handleDrop(e, index));
        item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        item.addEventListener('dragleave', (e) => this.handleDragLeave(e));

        return item;
    }

    handleDragStart(e, index) {
        this.draggedElement = e.currentTarget;
        this.draggedIndex = index;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');

        document.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        if (e.currentTarget !== this.draggedElement) {
            e.currentTarget.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e, targetIndex) {
        e.preventDefault();
        e.stopPropagation();

        if (this.draggedIndex === null || this.draggedIndex === targetIndex) {
            return;
        }

        const draggedItem = this.images[this.draggedIndex];
        this.images.splice(this.draggedIndex, 1);
        this.images.splice(targetIndex, 0, draggedItem);

        this.renderGallery();

        return false;
    }

    autoNumber() {
        if (this.images.length === 0) {
            alert('画像を読み込んでください');
            return;
        }

        const prefix = prompt('連番の接頭辞を入力してください（例: Image）', 'Image');
        if (prefix === null) return;

        const start = parseInt(prompt('開始番号を入力してください', '1'));
        if (isNaN(start)) return;

        this.images.forEach((image, index) => {
            const number = String(start + index).padStart(3, '0');
            image.title = `${prefix}${number}`;
        });

        this.renderGallery();
    }

    clearGallery() {
        if (this.images.length === 0) return;

        if (confirm('すべての画像をクリアしますか？')) {
            this.images = [];
            this.gallery.innerHTML = '';
            this.folderInput.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageGallery();
});
