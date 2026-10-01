// 할 일 도메인 로직. DOM과 localStorage를 모르는 순수 함수만 둔다.
(function () {
  'use strict';

  const CATEGORIES = ['work', 'personal', 'study'];
  const CATEGORY_LABELS = { work: '업무', personal: '개인', study: '공부' };
  const FILTERS = ['all'].concat(CATEGORIES);
  const MAX_TEXT_LENGTH = 200;
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // Date → 로컬 기준 'YYYY-MM-DD'. toISOString()은 UTC라 한국에서 오전 9시 전에 전날이 된다.
  function toDateKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  // Date → '2026년 10월 1일 (목)'
  function formatDateLabel(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
  }

  // 앞뒤 공백 제거 후 최대 길이로 자른다. 결과가 ''이면 "내용 없음".
  function cleanText(text) {
    return String(text == null ? '' : text).trim().slice(0, MAX_TEXT_LENGTH);
  }

  function createId(now) {
    return `t_${now}_${Math.random().toString(36).slice(2, 5)}`;
  }

  function splitByDone(todos) {
    return { active: todos.filter(t => !t.done), done: todos.filter(t => t.done) };
  }

  // 배열을 [미완료(상대 순서 유지)..., 완료(최근 완료 순)...]로 맞춘다.
  function normalizeOrder(todos) {
    const { active, done } = splitByDone(todos);
    const sortedDone = done.slice().sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    return active.concat(sortedDone);
  }

  function addTodo(todos, input, now) {
    const text = cleanText(input.text);
    if (!text || !CATEGORIES.includes(input.category)) return todos;
    const todo = {
      id: createId(now),
      text,
      category: input.category,
      done: false,
      date: toDateKey(new Date(now)),
      createdAt: now,
      completedAt: null,
    };
    const { active, done } = splitByDone(todos);
    return active.concat([todo], done);
  }

  function updateTodo(todos, id, changes) {
    const patch = {};
    if (changes.text !== undefined) {
      const text = cleanText(changes.text);
      if (!text) return todos; // 빈 내용 저장 = 편집 취소
      patch.text = text;
    }
    if (changes.category !== undefined) {
      if (!CATEGORIES.includes(changes.category)) return todos;
      patch.category = changes.category;
    }
    if (!todos.some(t => t.id === id)) return todos;
    return todos.map(t => (t.id === id ? Object.assign({}, t, patch) : t));
  }

  function removeTodo(todos, id) {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return { todos, removed: null, index: -1 };
    return { todos: todos.filter(t => t.id !== id), removed: todos[index], index };
  }

  // 삭제 취소. 그 사이 목록이 바뀌었을 수 있으므로 끼운 뒤 순서 불변 조건을 복구한다.
  function restoreTodo(todos, removed, index) {
    const next = todos.slice();
    next.splice(Math.min(index, next.length), 0, removed);
    return normalizeOrder(next);
  }

  window.Todos = {
    CATEGORIES,
    CATEGORY_LABELS,
    FILTERS,
    MAX_TEXT_LENGTH,
    toDateKey,
    formatDateLabel,
    normalizeOrder,
    addTodo,
    updateTodo,
    removeTodo,
    restoreTodo,
  };
})();
