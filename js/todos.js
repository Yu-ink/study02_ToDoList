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

  window.Todos = {
    CATEGORIES,
    CATEGORY_LABELS,
    FILTERS,
    MAX_TEXT_LENGTH,
    toDateKey,
    formatDateLabel,
  };
})();
