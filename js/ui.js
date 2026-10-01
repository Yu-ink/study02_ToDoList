// 화면 그리기와 이벤트 연결. 상태는 app.js가 갖고, 여기서는 handlers를 호출만 한다.
(function () {
  'use strict';

  const Todos = window.Todos;
  const { CATEGORIES, CATEGORY_LABELS } = Todos;

  let els = null;
  let handlers = null;
  let dragId = null; // 끌고 있는 항목 id

  // 작은 DOM 생성 도우미. text는 textContent로만 넣는다 (XSS 방지).
  // false/null/undefined 속성은 건너뛰고, true는 빈 값 속성(disabled 등)으로 넣는다.
  function el(tag, props, children) {
    const node = document.createElement(tag);
    let value;
    Object.keys(props || {}).forEach(key => {
      const v = props[key];
      if (v === false || v === null || v === undefined) return;
      if (key === 'text') node.textContent = v;
      else if (key === 'className') node.className = v;
      else if (key === 'checked') node.checked = v;
      else if (key === 'value') value = v; // select는 option이 들어간 뒤에 값을 정해야 한다
      else node.setAttribute(key, v === true ? '' : v);
    });
    (children || []).forEach(child => {
      if (child) node.appendChild(child);
    });
    if (value !== undefined) node.value = value;
    return node;
  }

  function categoryOptions() {
    return CATEGORIES.map(c => el('option', { value: c, text: CATEGORY_LABELS[c] }));
  }

  function itemId(node) {
    return node.closest('li[data-id]').dataset.id;
  }

  // 드롭할 수 있는 대상: 미완료 항목 (편집 중인 줄 제외)
  function dropTarget(event) {
    if (!dragId) return null;
    return event.target.closest('li.todo[data-id]:not(.done):not(.editing)');
  }

  function isAfter(event, row) {
    const rect = row.getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2;
  }

  function clearDropMarks() {
    els.list.querySelectorAll('.drop-before, .drop-after, .dragging').forEach(node => {
      node.classList.remove('drop-before', 'drop-after', 'dragging');
    });
  }

  // 화면에 보이는 미완료 항목 id (DOM 순서 = 보이는 순서)
  function activeIds() {
    return Array.from(els.list.querySelectorAll('li.todo[data-id]:not(.done)')).map(li => li.dataset.id);
  }

  function init(handlerMap) {
    handlers = handlerMap;
    els = {
      banner: document.getElementById('banner'),
      bannerText: document.getElementById('banner-text'),
      bannerClose: document.getElementById('banner-close'),
      today: document.getElementById('today'),
      progress: document.getElementById('progress'),
      addForm: document.getElementById('add-form'),
      addText: document.getElementById('add-text'),
      addCategory: document.getElementById('add-category'),
      filters: document.getElementById('filters'),
      list: document.getElementById('todo-list'),
      empty: document.getElementById('empty'),
      toast: document.getElementById('toast'),
      toastUndo: document.getElementById('toast-undo'),
    };

    categoryOptions().forEach(option => els.addCategory.appendChild(option));
    Todos.FILTERS.forEach(f => {
      els.filters.appendChild(el('button', {
        type: 'button',
        'data-filter': f,
        text: f === 'all' ? '전체' : CATEGORY_LABELS[f],
      }));
    });

    els.addForm.addEventListener('submit', event => {
      event.preventDefault();
      if (handlers.onAdd(els.addText.value, els.addCategory.value)) els.addText.value = '';
      els.addText.focus();
    });
    els.addCategory.addEventListener('change', () => handlers.onCategoryChange(els.addCategory.value));

    els.filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (button) handlers.onFilter(button.dataset.filter);
    });

    els.list.addEventListener('change', event => {
      if (event.target.matches('.todo-check')) handlers.onToggle(itemId(event.target));
    });

    els.list.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const id = itemId(button);
      const action = button.dataset.action;
      if (action === 'delete') handlers.onRemove(id);
      else if (action === 'up' || action === 'down') handlers.onMove(id, action);
      else if (action === 'edit') handlers.onStartEdit(id);
    });

    els.list.addEventListener('dblclick', event => {
      if (event.target.matches('.todo-text')) handlers.onStartEdit(itemId(event.target));
    });

    els.list.addEventListener('keydown', event => {
      const row = event.target.closest('li.editing');
      if (!row) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        commitEdit(row);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handlers.onCancelEdit();
      }
    });

    // 편집 줄 밖으로 포커스가 나가면 저장. 입력창 → 카테고리 선택처럼 줄 안에서 옮겨가면 저장하지 않는다.
    els.list.addEventListener('focusout', event => {
      const row = event.target.closest('li.editing');
      if (row && !row.contains(event.relatedTarget)) commitEdit(row);
    });

    els.list.addEventListener('dragstart', event => {
      const handle = event.target.closest('.handle');
      if (!handle) return;
      const row = handle.closest('li[data-id]');
      dragId = row.dataset.id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragId); // Firefox는 데이터가 있어야 드래그가 시작된다
      event.dataTransfer.setDragImage(row, 20, 20);
      row.classList.add('dragging');
    });

    els.list.addEventListener('dragover', event => {
      const row = dropTarget(event);
      els.list.querySelectorAll('.drop-before, .drop-after').forEach(node => {
        node.classList.remove('drop-before', 'drop-after');
      });
      if (!row) return;
      event.preventDefault(); // 드롭 허용
      event.dataTransfer.dropEffect = 'move';
      row.classList.add(isAfter(event, row) ? 'drop-after' : 'drop-before');
    });

    els.list.addEventListener('drop', event => {
      const row = dropTarget(event);
      if (!row) return;
      event.preventDefault();
      const id = dragId;
      dragId = null; // 다시 그리면 원래 줄이 사라져 dragend가 목록까지 오지 않으므로 여기서 정리
      handlers.onReorder(id, Todos.dropIndex(activeIds(), id, row.dataset.id, isAfter(event, row)));
    });

    els.list.addEventListener('dragend', () => {
      dragId = null;
      clearDropMarks();
    });

    els.toastUndo.addEventListener('click', () => handlers.onUndo());
    els.bannerClose.addEventListener('click', () => handlers.onDismissNotice());
  }

  // --- 렌더링 ---

  function render(state) {
    const focus = captureFocus();
    renderBanner(state);
    els.today.textContent = state.todayLabel;
    els.today.setAttribute('datetime', state.today);
    renderProgress(Todos.getProgress(state.todos));
    els.addCategory.value = state.lastCategory;
    renderFilters(state.filter);
    renderList(state);
    els.toast.hidden = !state.undo;

    const editInput = els.list.querySelector('.edit-text');
    if (editInput) {
      if (!editInput.closest('li').contains(document.activeElement)) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    } else {
      restoreFocus(focus);
    }
  }

  function renderBanner(state) {
    let message = '';
    if (state.saveFailed) message = '저장하지 못했습니다. 새로고침하면 변경 사항이 사라질 수 있어요.';
    else if (state.notice === 'corrupted') message = '저장된 데이터를 읽지 못해 새로 시작합니다.';
    els.banner.hidden = !message;
    els.bannerText.textContent = message;
    els.bannerClose.hidden = state.saveFailed; // 저장 실패 경고는 다음 저장이 성공할 때까지 유지
  }

  function bar(percent, label, small) {
    return el('div', {
      className: small ? 'bar bar-small' : 'bar',
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': percent,
      'aria-label': label,
    }, [el('div', { className: 'bar-fill', style: `width: ${percent}%` })]);
  }

  function renderProgress(progress) {
    els.progress.replaceChildren();
    if (progress.total === 0) {
      els.progress.appendChild(el('p', { className: 'progress-empty', text: '오늘 할 일을 추가해보세요' }));
      return;
    }
    els.progress.appendChild(el('div', { className: 'progress-total' }, [
      bar(progress.percent, '전체 진행률'),
      el('span', {
        className: 'progress-text',
        text: `${progress.done} / ${progress.total} · ${progress.percent}%`,
      }),
    ]));
    els.progress.appendChild(el('div', { className: 'progress-categories' }, CATEGORIES.map(c => {
      const p = progress.byCategory[c];
      return el('div', { className: `progress-category cat-${c}` }, [
        el('span', { text: CATEGORY_LABELS[c] }),
        bar(p.percent, `${CATEGORY_LABELS[c]} 진행률`, true),
        el('span', { className: 'progress-count', text: p.total ? `${p.done}/${p.total}` : '–' }),
      ]);
    })));
  }

  function renderFilters(filter) {
    els.filters.querySelectorAll('button[data-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
  }

  function renderList(state) {
    const visible = Todos.filterTodos(state.todos, state.filter);
    const active = visible.filter(t => !t.done);
    const done = visible.filter(t => t.done);

    els.list.replaceChildren();
    active.forEach((todo, i) => {
      els.list.appendChild(renderItem(todo, { first: i === 0, last: i === active.length - 1 }, state));
    });
    if (done.length) {
      els.list.appendChild(el('li', { className: 'divider', role: 'presentation', text: `완료 (${done.length})` }));
    }
    done.forEach(todo => els.list.appendChild(renderItem(todo, {}, state)));

    // 할 일이 0개일 때는 진행률 영역이 안내하므로 여기서는 숨긴다
    els.empty.hidden = visible.length > 0 || state.todos.length === 0;
    els.empty.textContent = state.filter === 'all' ? '할 일이 없어요' : `${CATEGORY_LABELS[state.filter]} 할 일이 없어요`;
  }

  function renderItem(todo, position, state) {
    if (state.editingId === todo.id) return renderEditingItem(todo);
    return el('li', { className: todo.done ? 'todo done' : 'todo', 'data-id': todo.id }, [
      todo.done
        ? el('span', { className: 'handle-placeholder' })
        : el('span', { className: 'handle', draggable: 'true', title: '끌어서 순서 변경', 'aria-hidden': 'true', text: '⠿' }),
      el('input', { type: 'checkbox', className: 'todo-check', checked: todo.done, 'aria-label': `${todo.text} 완료` }),
      el('span', { className: 'todo-text', text: todo.text, title: '더블클릭해서 수정' }),
      el('span', { className: `tag cat-${todo.category}`, text: CATEGORY_LABELS[todo.category] }),
      el('div', { className: 'actions' }, [
        todo.done ? null : el('button', {
          type: 'button', className: 'icon', 'data-action': 'up',
          'aria-label': `${todo.text} 위로 이동`, disabled: position.first, text: '▲',
        }),
        todo.done ? null : el('button', {
          type: 'button', className: 'icon', 'data-action': 'down',
          'aria-label': `${todo.text} 아래로 이동`, disabled: position.last, text: '▼',
        }),
        el('button', {
          type: 'button', className: 'icon', 'data-action': 'edit',
          'aria-label': `${todo.text} 수정`, text: '✏️',
        }),
        el('button', {
          type: 'button', className: 'icon', 'data-action': 'delete',
          'aria-label': `${todo.text} 삭제`, text: '🗑',
        }),
      ]),
    ]);
  }

  function renderEditingItem(todo) {
    return el('li', { className: todo.done ? 'todo done editing' : 'todo editing', 'data-id': todo.id }, [
      el('input', {
        type: 'text', className: 'edit-text', maxlength: Todos.MAX_TEXT_LENGTH,
        value: todo.text, 'aria-label': '할 일 내용 수정 (Enter 저장, Esc 취소)',
      }),
      el('select', { className: 'edit-category', 'aria-label': '카테고리 수정', value: todo.category }, categoryOptions()),
    ]);
  }

  function commitEdit(row) {
    handlers.onCommitEdit(
      row.dataset.id,
      row.querySelector('.edit-text').value,
      row.querySelector('.edit-category').value
    );
  }

  // --- 포커스 유지: 목록을 다시 그려도 키보드 사용자가 제자리에 남도록 ---

  function captureFocus() {
    const active = document.activeElement;
    if (!active || !els.list.contains(active)) return null;
    const row = active.closest('li[data-id]');
    if (!row) return null;
    return { id: row.dataset.id, action: active.dataset.action || null };
  }

  function restoreFocus(saved) {
    if (!saved) return;
    const row = Array.from(els.list.querySelectorAll('li[data-id]')).find(li => li.dataset.id === saved.id);
    if (!row) {
      els.addText.focus(); // 삭제된 항목이면 입력창으로
      return;
    }
    const target = saved.action ? row.querySelector(`[data-action="${saved.action}"]`) : null;
    (target && !target.disabled ? target : row.querySelector('.todo-check')).focus();
  }

  window.TodoUI = { init, render };
})();
