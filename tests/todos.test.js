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
})();
