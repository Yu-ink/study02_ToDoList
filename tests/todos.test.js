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

  // --- 완료 토글 ---
  test('toggleTodo: 완료하면 완료 목록 맨 위로 이동', () => {
    const next = Todos.toggleTodo([T('a'), T('b'), T('c', { done: true, completedAt: 1 })], 'a', 100);
    assertEqual(ids(next), ['b', 'a', 'c']);
    assertEqual([next[1].done, next[1].completedAt], [true, 100]);
  });

  test('toggleTodo: 완료 해제하면 미완료 맨 아래로 이동', () => {
    const todos = [T('a'), T('c', { done: true, completedAt: 5 }), T('d', { done: true, completedAt: 1 })];
    const next = Todos.toggleTodo(todos, 'd', 100);
    assertEqual(ids(next), ['a', 'd', 'c']);
    assertEqual([next[1].done, next[1].completedAt], [false, null]);
  });

  test('toggleTodo: 없는 id면 같은 배열 반환', () => {
    const todos = [T('a')];
    assert(Todos.toggleTodo(todos, 'zzz', 100) === todos);
  });

  // --- 순서 변경 ---
  test('reorderTodo: 전체 보기에서 맨 아래로 이동', () => {
    const todos = [T('a'), T('b'), T('c')];
    assertEqual(ids(Todos.reorderTodo(todos, 'a', 2, ids(todos))), ['b', 'c', 'a']);
  });

  test('reorderTodo: 필터 적용 시 보이는 항목끼리만 이동, 나머지는 제자리', () => {
    const todos = [T('w1'), T('p1', { category: 'personal' }), T('w2'), T('p2', { category: 'personal' })];
    assertEqual(ids(Todos.reorderTodo(todos, 'w2', 0, ['w1', 'w2'])), ['w2', 'p1', 'w1', 'p2']);
  });

  test('reorderTodo: 완료 항목은 이동하지 않음', () => {
    const todos = [T('a'), T('d', { done: true, completedAt: 1 })];
    assert(Todos.reorderTodo(todos, 'd', 0, ids(todos)) === todos);
  });

  test('reorderTodo: 범위를 벗어난 위치는 끝으로 맞춤', () => {
    const todos = [T('a'), T('b'), T('c')];
    assertEqual(ids(Todos.reorderTodo(todos, 'a', 99, ids(todos))), ['b', 'c', 'a']);
  });

  test('reorderTodo: 같은 위치면 같은 배열 반환', () => {
    const todos = [T('a'), T('b')];
    assert(Todos.reorderTodo(todos, 'b', 1, ids(todos)) === todos);
  });

  test('moveTodo: 위로 한 칸', () => {
    const todos = [T('a'), T('b'), T('c')];
    assertEqual(ids(Todos.moveTodo(todos, 'c', 'up', ids(todos))), ['a', 'c', 'b']);
  });

  test('moveTodo: 맨 위 항목을 위로 → 같은 배열', () => {
    const todos = [T('a'), T('b')];
    assert(Todos.moveTodo(todos, 'a', 'up', ids(todos)) === todos);
  });

  test('moveTodo: 마지막 미완료 항목을 아래로 → 같은 배열 (완료 항목과 섞이지 않음)', () => {
    const todos = [T('a'), T('b'), T('d', { done: true, completedAt: 1 })];
    assert(Todos.moveTodo(todos, 'b', 'down', ids(todos)) === todos);
  });

  test('moveTodo: 필터 적용 시 다음 보이는 항목과 자리 교환', () => {
    const todos = [T('w1'), T('p1', { category: 'personal' }), T('w2')];
    assertEqual(ids(Todos.moveTodo(todos, 'w1', 'down', ['w1', 'w2'])), ['w2', 'p1', 'w1']);
  });

  test('dropIndex: 아래쪽 항목의 뒤에 놓기', () => {
    assertEqual(Todos.dropIndex(['a', 'b', 'c', 'd'], 'a', 'c', true), 2);
  });

  test('dropIndex: 위쪽 항목의 앞에 놓기', () => {
    assertEqual(Todos.dropIndex(['a', 'b', 'c', 'd'], 'd', 'b', false), 1);
  });

  test('dropIndex: 자기 자신 위에 놓으면 제자리', () => {
    assertEqual(Todos.dropIndex(['a', 'b', 'c'], 'b', 'b', true), 1);
  });

  // --- 날짜 넘김 ---
  test('rollover: 지난 미완료는 오늘로 이월, 지난 완료는 삭제, 오늘 항목은 그대로', () => {
    const todos = [
      T('y1', { date: '2026-09-30' }),
      T('t1'),
      T('y2', { date: '2026-09-30', done: true, completedAt: 1 }),
    ];
    const next = Todos.rollover(todos, '2026-10-01');
    assertEqual(ids(next), ['y1', 't1']);
    assertEqual(next[0].date, '2026-10-01');
    assert(next[1] === todos[1], '오늘 항목은 같은 객체');
  });

  test('rollover: 바뀔 것이 없으면 같은 배열 반환', () => {
    const todos = [T('a'), T('b', { done: true, completedAt: 1 })];
    assert(Todos.rollover(todos, '2026-10-01') === todos);
  });

  // --- 진행률 ---
  test('getProgress: 할 일이 없으면 모두 0', () => {
    const zero = { total: 0, done: 0, percent: 0 };
    assertEqual(Todos.getProgress([]), {
      total: 0, done: 0, percent: 0,
      byCategory: { work: zero, personal: zero, study: zero },
    });
  });

  test('getProgress: 전체와 카테고리별 집계 (퍼센트 반올림)', () => {
    const p = Todos.getProgress([T('a'), T('b', { done: true, completedAt: 1 }), T('c', { category: 'study' })]);
    assertEqual([p.total, p.done, p.percent], [3, 1, 33]);
    assertEqual(p.byCategory.work, { total: 2, done: 1, percent: 50 });
    assertEqual(p.byCategory.personal, { total: 0, done: 0, percent: 0 });
    assertEqual(p.byCategory.study, { total: 1, done: 0, percent: 0 });
  });

  // --- 필터 ---
  test('filterTodos: all은 전체(같은 배열), 카테고리는 해당 항목만', () => {
    const todos = [T('a'), T('b', { category: 'study' })];
    assert(Todos.filterTodos(todos, 'all') === todos);
    assertEqual(ids(Todos.filterTodos(todos, 'study')), ['b']);
  });

  // --- 저장 데이터 검증 ---
  test('isValidTodo: 정상/비정상 항목 판별', () => {
    assert(Todos.isValidTodo(T('a')), '정상 항목');
    assert(!Todos.isValidTodo(null), 'null');
    assert(!Todos.isValidTodo(T('', { text: 'x' })), '빈 id');
    assert(!Todos.isValidTodo(T('a', { text: '   ' })), '빈 내용');
    assert(!Todos.isValidTodo(T('a', { text: 'a'.repeat(201) })), '200자 초과');
    assert(!Todos.isValidTodo(T('a', { category: 'etc' })), '잘못된 카테고리');
    assert(!Todos.isValidTodo(T('a', { date: '2026/10/01' })), '잘못된 날짜 형식');
    assert(!Todos.isValidTodo(T('a', { done: 'yes' })), 'done이 boolean 아님');
    assert(!Todos.isValidTodo(T('a', { completedAt: 'x' })), 'completedAt이 숫자/null 아님');
  });

  test('sanitizeTodos: 배열 아님 → 빈 목록, 잘못된 항목 제거, 순서 복구', () => {
    assertEqual(Todos.sanitizeTodos({}), []);
    const list = [T('d', { done: true, completedAt: 1 }), { id: 'bad' }, T('a')];
    assertEqual(ids(Todos.sanitizeTodos(list)), ['a', 'd']);
  });

  test('sanitizePrefs: 잘못된 값은 기본값으로', () => {
    assertEqual(Todos.sanitizePrefs(null), { filter: 'all', lastCategory: 'work' });
    assertEqual(
      Todos.sanitizePrefs({ filter: 'study', lastCategory: 'personal' }),
      { filter: 'study', lastCategory: 'personal' }
    );
    assertEqual(Todos.sanitizePrefs({ filter: 'x', lastCategory: 'y' }), { filter: 'all', lastCategory: 'work' });
  });
})();
