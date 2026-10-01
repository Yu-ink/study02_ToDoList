// 의존성 없는 최소 테스트 도구. tests.html에서 사용한다.
(function () {
  'use strict';

  const results = [];

  // 테스트 파일 로드 중 스크립트 오류도 실패로 기록한다 (오류가 나면 테스트가 0개로 보여 통과로 착각하기 쉽다).
  window.addEventListener('error', event => {
    results.push({ name: '스크립트 오류', ok: false, message: event.message });
  });

  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, message: error.message });
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message || '조건이 거짓입니다');
  }

  // JSON 문자열로 비교한다. 객체 키 순서도 같아야 한다.
  function assertEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${message ? message + ': ' : ''}기대값 ${e}, 실제값 ${a}`);
  }

  function renderResults() {
    if (results.length === 0) {
      results.push({ name: '테스트 없음', ok: false, message: '실행된 테스트가 하나도 없습니다' });
    }
    const failed = results.filter(r => !r.ok).length;
    const passed = results.length - failed;

    const summary = document.getElementById('summary');
    summary.textContent = `결과: ${passed} 통과, ${failed} 실패`;
    summary.className = failed ? 'fail' : 'pass';
    document.title = `${failed ? 'FAIL' : 'PASS'} (${passed}/${results.length})`;

    const list = document.getElementById('results');
    results.forEach(r => {
      const item = document.createElement('li');
      item.className = r.ok ? 'pass' : 'fail';
      item.textContent = r.ok ? `✓ ${r.name}` : `✗ ${r.name} — ${r.message}`;
      list.appendChild(item);
    });
  }

  window.TestHarness = { test, assert, assertEqual, results, renderResults };
})();
