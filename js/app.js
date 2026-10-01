// 앱 시작점. 상태를 보관하고, 사용자 동작을 Todos 순수 함수로 처리한 뒤 저장·렌더링한다.
(function () {
  'use strict';

  const UNDO_MS = 5000;

  // 일부 브라우저 설정(쿠키 차단 등)에서는 localStorage 접근만으로 예외가 난다.
  function getLocalStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  const storage = getLocalStorage();

  const state = {
    todos: [],
    filter: 'all',
    lastCategory: 'work',
    today: '',
    todayLabel: '',
    editingId: null,
    undo: null, // { removed, index } — 마지막 삭제 1건
    notice: null, // 'corrupted' | null
    saveFailed: false,
  };
  let undoTimer = null;

  function render() {
    TodoUI.render(state);
  }

  function loadTodos() {
    const loaded = TodoStorage.load(storage);
    if (loaded.corrupted) state.notice = 'corrupted';
    state.todos = Todos.sanitizeTodos(loaded.todos);
  }

  function persist() {
    state.saveFailed = !TodoStorage.save(storage, state.todos);
  }

  function persistPrefs() {
    TodoStorage.savePrefs(storage, { filter: state.filter, lastCategory: state.lastCategory });
  }

  // 할 일 배열을 교체하고 저장한다. 같은 배열이면(변경 없음) 아무것도 하지 않는다.
  function commit(next) {
    if (next === state.todos) return;
    state.todos = next;
    persist();
  }

  // 날짜가 바뀌었으면 이월한다. 할 일을 바꾸는 모든 동작 전에 호출한다.
  function ensureToday() {
    const now = new Date();
    state.today = Todos.toDateKey(now);
    state.todayLabel = Todos.formatDateLabel(now);
    commit(Todos.rollover(state.todos, state.today));
  }

  function visibleIds() {
    return Todos.filterTodos(state.todos, state.filter).map(t => t.id);
  }

  const handlers = {
    onAdd(text, category) {
      ensureToday();
      state.lastCategory = category;
      persistPrefs();
      const next = Todos.addTodo(state.todos, { text, category }, Date.now());
      const added = next !== state.todos;
      commit(next);
      render();
      return added;
    },

    onToggle(id) {
      ensureToday();
      commit(Todos.toggleTodo(state.todos, id, Date.now()));
      render();
    },

    onRemove(id) {
      ensureToday();
      const result = Todos.removeTodo(state.todos, id);
      if (result.removed) {
        commit(result.todos);
        state.undo = { removed: result.removed, index: result.index }; // 이전 삭제는 확정
        clearTimeout(undoTimer);
        undoTimer = setTimeout(() => {
          state.undo = null;
          render();
        }, UNDO_MS);
      }
      render();
    },

    onUndo() {
      if (!state.undo) return;
      clearTimeout(undoTimer);
      commit(Todos.restoreTodo(state.todos, state.undo.removed, state.undo.index));
      state.undo = null;
      ensureToday(); // 복원한 항목이 어제 것이면 이월
      render();
    },

    onMove(id, direction) {
      ensureToday();
      commit(Todos.moveTodo(state.todos, id, direction, visibleIds()));
      render();
    },

    onStartEdit(id) {
      state.editingId = id;
      render();
    },

    onCommitEdit(id, text, category) {
      if (state.editingId !== id) return; // 이미 저장/취소됨 (편집창이 지워질 때의 blur)
      state.editingId = null;
      ensureToday();
      commit(Todos.updateTodo(state.todos, id, { text, category })); // 빈 내용이면 변경 없음 = 취소
      render();
    },

    onCancelEdit() {
      state.editingId = null;
      render();
    },

    onFilter(filter) {
      state.filter = filter;
      persistPrefs();
      render();
    },

    onCategoryChange(category) {
      state.lastCategory = category;
      persistPrefs();
    },

    onDismissNotice() {
      state.notice = null;
      render();
    },
  };

  function init() {
    const prefs = Todos.sanitizePrefs(TodoStorage.loadPrefs(storage));
    state.filter = prefs.filter;
    state.lastCategory = prefs.lastCategory;
    loadTodos();
    ensureToday();
    TodoUI.init(handlers);
    render();
  }

  init();
})();
