// js/todos.js 테스트
(function () {
  'use strict';

  const { test, assert, assertEqual } = window.TestHarness;
  const Todos = window.Todos;

  // 테스트용 할 일. id만 주면 나머지는 기본값(오늘·업무·미완료).
  function T(id, overrides) {
    return Object.assign(
      { id, text: id, category: 'work', done: false, date: '2026-10-01', createdAt: 1, completedAt: null },
      overrides
    );
  }

  function ids(list) {
    return list.map(t => t.id);
  }

  // --- 날짜 ---
  test('toDateKey: 로컬 자정 직후도 그날 날짜 (UTC로 밀리지 않음)', () => {
    assertEqual(Todos.toDateKey(new Date(2026, 9, 1, 0, 30)), '2026-10-01');
  });

  test('toDateKey: 월/일을 두 자리로 채움', () => {
    assertEqual(Todos.toDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  });

  test('formatDateLabel: 한국어 날짜와 요일', () => {
    assertEqual(Todos.formatDateLabel(new Date(2026, 9, 1)), '2026년 10월 1일 (목)');
  });

  // --- 추가 ---
  const NOW = new Date(2026, 9, 1, 10, 0).getTime();

  test('addTodo: 미완료 맨 아래(완료 항목 위)에 추가', () => {
    const todos = [T('a'), T('b', { done: true, completedAt: 5 })];
    const next = Todos.addTodo(todos, { text: '  새 일  ', category: 'study' }, NOW);
    assertEqual(next.length, 3);
    assertEqual([next[0].id, next[2].id], ['a', 'b']);
    const added = next[1];
    assert(/^t_\d+_[a-z0-9]+$/.test(added.id), `id 형식: ${added.id}`);
    assertEqual(
      [added.text, added.category, added.done, added.date, added.createdAt, added.completedAt],
      ['새 일', 'study', false, '2026-10-01', NOW, null]
    );
  });

  test('addTodo: 공백만 있는 내용은 추가하지 않음 (같은 배열 반환)', () => {
    const todos = [T('a')];
    assert(Todos.addTodo(todos, { text: '   ', category: 'work' }, NOW) === todos);
  });

  test('addTodo: 잘못된 카테고리는 추가하지 않음', () => {
    const todos = [];
    assert(Todos.addTodo(todos, { text: '할 일', category: 'etc' }, NOW) === todos);
  });

  test('addTodo: 200자를 넘는 내용은 200자로 자름', () => {
    const next = Todos.addTodo([], { text: 'a'.repeat(250), category: 'work' }, NOW);
    assertEqual(next[0].text.length, 200);
  });

  test('addTodo: 원본 배열을 바꾸지 않음', () => {
    const todos = [T('a')];
    Todos.addTodo(todos, { text: '새 일', category: 'work' }, NOW);
    assertEqual(ids(todos), ['a']);
  });

  // --- 수정 ---
  test('updateTodo: 내용과 카테고리 변경 (앞뒤 공백 제거), 다른 항목은 그대로', () => {
    const next = Todos.updateTodo([T('a'), T('b')], 'a', { text: ' 수정 ', category: 'personal' });
    assertEqual([next[0].text, next[0].category], ['수정', 'personal']);
    assertEqual(next[1], T('b'));
  });

  test('updateTodo: 빈 내용이면 변경하지 않음 (같은 배열 반환)', () => {
    const todos = [T('a')];
    assert(Todos.updateTodo(todos, 'a', { text: '  ', category: 'study' }) === todos);
  });

  test('updateTodo: 없는 id면 같은 배열 반환', () => {
    const todos = [T('a')];
    assert(Todos.updateTodo(todos, 'zzz', { text: '수정' }) === todos);
  });

  // --- 삭제 / 복원 ---
  test('removeTodo: 삭제한 항목과 원래 위치를 함께 반환', () => {
    const result = Todos.removeTodo([T('a'), T('b'), T('c')], 'b');
    assertEqual(ids(result.todos), ['a', 'c']);
    assertEqual([result.removed.id, result.index], ['b', 1]);
  });

  test('removeTodo: 없는 id면 removed=null, index=-1, 같은 배열', () => {
    const todos = [T('a')];
    const result = Todos.removeTodo(todos, 'zzz');
    assert(result.todos === todos);
    assertEqual([result.removed, result.index], [null, -1]);
  });

  test('restoreTodo: 원래 위치로 복원', () => {
    const result = Todos.removeTodo([T('a'), T('b'), T('c')], 'b');
    assertEqual(ids(Todos.restoreTodo(result.todos, result.removed, result.index)), ['a', 'b', 'c']);
  });

  test('restoreTodo: 목록이 줄어 위치가 없으면 끝으로 복원', () => {
    assertEqual(ids(Todos.restoreTodo([T('a')], T('b'), 5)), ['a', 'b']);
  });

  test('restoreTodo: 완료 항목은 완료 시각 순서를 지켜 복원', () => {
    const todos = [T('a'), T('d1', { done: true, completedAt: 10 })];
    const removed = T('d0', { done: true, completedAt: 20 });
    assertEqual(ids(Todos.restoreTodo(todos, removed, 2)), ['a', 'd0', 'd1']);
  });

  // --- 순서 불변 조건 ---
  test('normalizeOrder: [미완료(원래 순서)..., 완료(최근 완료 순)...]', () => {
    const todos = [
      T('d', { done: true, completedAt: 1 }),
      T('a'),
      T('e', { done: true, completedAt: 3 }),
      T('b'),
    ];
    assertEqual(ids(Todos.normalizeOrder(todos)), ['a', 'b', 'e', 'd']);
  });
})();
