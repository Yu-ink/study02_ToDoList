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

  function toggleTodo(todos, id, now) {
    const target = todos.find(t => t.id === id);
    if (!target) return todos;
    const { active, done } = splitByDone(todos.filter(t => t.id !== id));
    if (target.done) {
      // 해제 → 미완료 맨 아래
      return active.concat([Object.assign({}, target, { done: false, completedAt: null })], done);
    }
    // 완료 → 완료 목록 맨 위 (최근 완료가 위)
    return active.concat([Object.assign({}, target, { done: true, completedAt: now })], done);
  }

  // 화면에 보이는(필터 적용된) 미완료 항목 id를 배열 순서대로
  function visibleActiveIds(todos, visibleIds) {
    const visible = new Set(visibleIds);
    return todos.filter(t => !t.done && visible.has(t.id)).map(t => t.id);
  }

  // 보이는 미완료 항목들 사이에서 id를 targetIndex로 옮긴다.
  // 보이는 항목들이 차지하던 배열 자리(slot)에 새 순서대로 다시 채우므로, 나머지 항목은 제자리에 남는다.
  function reorderTodo(todos, id, targetIndex, visibleIds) {
    const order = visibleActiveIds(todos, visibleIds);
    const from = order.indexOf(id);
    if (from === -1) return todos;
    const to = Math.max(0, Math.min(targetIndex, order.length - 1));
    if (from === to) return todos;

    order.splice(from, 1);
    order.splice(to, 0, id);

    const byId = new Map(todos.map(t => [t.id, t]));
    const slots = new Set(order);
    let k = 0;
    return todos.map(t => (slots.has(t.id) ? byId.get(order[k++]) : t));
  }

  function moveTodo(todos, id, direction, visibleIds) {
    const order = visibleActiveIds(todos, visibleIds);
    const from = order.indexOf(id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= order.length) return todos;
    return reorderTodo(todos, id, to, visibleIds);
  }

  // 드래그 앤 드롭: dragId를 targetId의 앞/뒤에 놓을 때, 이동 후 기준의 인덱스
  function dropIndex(orderIds, dragId, targetId, after) {
    const from = orderIds.indexOf(dragId);
    let to = orderIds.indexOf(targetId) + (after ? 1 : 0);
    if (from < to) to -= 1; // 자기 자리가 빠지면서 한 칸 당겨진다
    return to;
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
    toggleTodo,
    reorderTodo,
    moveTodo,
    dropIndex,
  };
})();
