# 오늘 할 일 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html`을 더블클릭하면 바로 실행되는, 오늘 할 일을 업무/개인/공부로 관리하고 진행률을 보여주는 개인용 웹앱을 만든다.

**Architecture:** 화면을 모르는 순수 함수 모듈(`js/todos.js`)이 모든 할 일 로직을 담당하고, `js/storage.js`는 `localStorage` 입출력만, `js/ui.js`는 렌더링과 이벤트만, `js/app.js`는 상태 보관과 연결만 한다. 사용자 동작 → `app.js` 핸들러 → `Todos.*`로 새 배열 계산 → 저장 → 전체 다시 그리기의 단방향 흐름이다. 로직은 `tests.html`(직접 만든 최소 테스트 도구)로 TDD 하고, UI는 브라우저에서 수동 점검한다.

**Tech Stack:** HTML, CSS, JavaScript(ES2018, 일반 `<script>`), `localStorage`. 외부 의존성 없음. 테스트 확인용 로컬 서버로 `python -m http.server`(선택).

**Spec:** [docs/PRD.md](../../PRD.md) — 실행자는 계획과 PRD를 함께 읽는다.

## Global Constraints

- 순수 HTML/CSS/JavaScript만 사용. 프레임워크, npm 패키지, CDN 라이브러리, 빌드 도구 금지.
- `file://`로 실행 가능해야 한다: ES 모듈(`import`/`export`, `type="module"`) 금지, `fetch`로 로컬 파일 읽기 금지.
- 각 JS 파일은 IIFE `(function () { 'use strict'; ... })();`로 감싸고 전역 객체 하나만 노출: `window.TodoStorage`, `window.Todos`, `window.TodoUI` (`app.js`는 노출 없음, 테스트 파일도 노출 없음).
- 스크립트 로드 순서: `js/storage.js` → `js/todos.js` → `js/ui.js` → `js/app.js`.
- 날짜는 로컬 기준 `YYYY-MM-DD`(`Todos.toDateKey`). `toISOString()`으로 날짜를 만들지 않는다.
- 사용자 입력은 `textContent`로만 DOM에 넣는다. `innerHTML` 사용 금지.
- 카테고리는 `work`(업무) / `personal`(개인) / `study`(공부) 3개 고정. 내용 최대 200자.
- 저장 키: `todoapp.v1`(`{ version: 1, todos }`), `todoapp.v1.prefs`(`{ filter, lastCategory }`), `todoapp.v1.backup`(손상 원본).
- 할 일 배열은 항상 `[미완료..., 완료(최근 완료 순)...]` 순서를 유지한다.
- `todos.js` 함수는 변경이 없으면 **입력 배열을 그대로 반환**한다 (`next === todos`로 변경 여부 판단).
- 코드 주석·UI 문구는 한국어, 식별자는 영어.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 줄을 붙인다 (아래 커밋 명령은 간결하게 제목만 적었다).

## 테스트 실행 방법 (모든 Task 공통)

- **사람:** `tests.html`을 더블클릭해 브라우저로 연다. 이미 열려 있으면 새로고침(F5).
- **에이전트:** Browser pane에서 `.claude/launch.json`의 `static` 서버를 `preview_start`로 띄우고 `http://localhost:8000/tests.html`로 이동해 `get_page_text`로 읽는다. 이미 열려 있으면 다시 `navigate`해서 새로 읽는다.
- 판정: 페이지 상단 `결과: N 통과, M 실패` 줄과 탭 제목 `PASS (N/N)` / `FAIL (...)`. 실패 항목은 `✗ 테스트 이름 — 메시지`로 표시된다.
- UI 확인도 같은 서버의 `http://localhost:8000/index.html`에서 한다 (사람은 `index.html` 더블클릭).

## 파일 구조

| 파일 | 책임 | 만드는 Task |
|---|---|---|
| `.claude/launch.json` | 에이전트용 정적 서버 설정 | 1 |
| `tests.html` | 테스트 러너 페이지 | 1 (5에서 수정) |
| `tests/harness.js` | `test` / `assert` / `assertEqual` / 결과 표시 | 1 |
| `tests/todos.test.js` | `js/todos.js` 테스트 | 1 (2~4에서 추가) |
| `tests/storage.test.js` | `js/storage.js` 테스트 | 5 |
| `js/todos.js` | 할 일 도메인 로직 (순수 함수) | 1 (2~4에서 추가) |
| `js/storage.js` | `localStorage` 입출력 | 5 |
| `index.html` | 앱 페이지 골격 | 6 |
| `style.css` | 전체 스타일 (라이트/다크/모바일) | 6 |
| `js/ui.js` | 렌더링, 이벤트, 드래그 앤 드롭 | 6 (7, 8에서 수정) |
| `js/app.js` | 상태, 핸들러, 초기화, 수명 주기 이벤트 | 6 (7~9에서 수정) |
| `README.md` | 진행 상태 갱신 | 10 |

---

### Task 1: 테스트 도구와 날짜 유틸리티

**Files:**
- Create: `.claude/launch.json`
- Create: `tests/harness.js`
- Create: `tests.html`
- Create: `tests/todos.test.js`
- Create: `js/todos.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `window.TestHarness = { test(name, fn), assert(condition, message?), assertEqual(actual, expected, message?), results, renderResults() }` — `assertEqual`은 `JSON.stringify` 비교(키 순서도 비교됨)
  - `window.Todos.CATEGORIES = ['work', 'personal', 'study']`
  - `window.Todos.CATEGORY_LABELS = { work: '업무', personal: '개인', study: '공부' }`
  - `window.Todos.FILTERS = ['all', 'work', 'personal', 'study']`
  - `window.Todos.MAX_TEXT_LENGTH = 200`
  - `Todos.toDateKey(date: Date) → 'YYYY-MM-DD'` (로컬 기준)
  - `Todos.formatDateLabel(date: Date) → '2026년 10월 1일 (목)'`
  - 테스트 파일 공통 도우미(`tests/todos.test.js` 안): `T(id, overrides?)`, `ids(list)`

- [ ] **Step 1: 정적 서버 설정 만들기**

`.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "static",
      "runtimeExecutable": "python",
      "runtimeArgs": ["-m", "http.server", "8000"],
      "port": 8000
    }
  ]
}
```

- [ ] **Step 2: 테스트 도구 만들기**

`tests/harness.js`:
```js
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
```

- [ ] **Step 3: 테스트 러너 페이지 만들기**

`tests.html`:
```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>테스트</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    #results { list-style: none; padding: 0; line-height: 1.7; }
    .pass { color: #1a7f37; }
    .fail { color: #cf222e; font-weight: 600; }
  </style>
</head>
<body>
  <h1>테스트</h1>
  <p id="summary"></p>
  <ul id="results"></ul>

  <script src="tests/harness.js"></script>
  <script src="js/todos.js"></script>
  <script src="tests/todos.test.js"></script>
  <script>TestHarness.renderResults();</script>
</body>
</html>
```

- [ ] **Step 4: 실패하는 테스트 작성**

`tests/todos.test.js`:
```js
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
```
이후 Task에서 테스트는 이 파일 마지막 줄 `})();` **바로 위에** 추가한다.

- [ ] **Step 5: 실패 확인**

`tests.html`을 연다 (위 "테스트 실행 방법").
Expected: `결과: 0 통과, 3 실패` 또는 스크립트 오류 포함 실패. 각 실패 메시지에 `Cannot read properties of undefined (reading 'toDateKey')` 류의 내용.

- [ ] **Step 6: 최소 구현**

`js/todos.js`:
```js
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
```

- [ ] **Step 7: 통과 확인**

`tests.html` 새로고침.
Expected: `결과: 3 통과, 0 실패`, 탭 제목 `PASS (3/3)`.

- [ ] **Step 8: Commit**

```bash
git add .claude/launch.json tests.html tests/harness.js tests/todos.test.js js/todos.js
git commit -m "test: 최소 테스트 도구와 날짜 유틸리티 추가"
```

---

### Task 2: 할 일 추가 · 수정 · 삭제 · 복원 로직

**Files:**
- Modify: `js/todos.js` (함수 추가, `window.Todos` 객체 교체)
- Test: `tests/todos.test.js` (마지막 `})();` 위에 추가)

**Interfaces:**
- Consumes: `Todos.CATEGORIES`, `Todos.MAX_TEXT_LENGTH`, `Todos.toDateKey` (Task 1)
- Produces:
  - 할 일 객체: `{ id: string, text: string, category: 'work'|'personal'|'study', done: boolean, date: 'YYYY-MM-DD', createdAt: number(ms), completedAt: number|null }`
  - `Todos.addTodo(todos, { text, category }, now: number) → todos` — 미완료 맨 아래 추가. 앞뒤 공백 제거, 200자로 자름. 빈 내용/잘못된 카테고리면 입력 배열 그대로.
  - `Todos.updateTodo(todos, id, { text?, category? }) → todos` — 빈 text·잘못된 category·없는 id면 입력 배열 그대로.
  - `Todos.removeTodo(todos, id) → { todos, removed: todo|null, index: number }` — 없으면 `{ todos(같은 배열), removed: null, index: -1 }`.
  - `Todos.restoreTodo(todos, removed, index) → todos` — `index`(길이로 제한)에 끼운 뒤 `normalizeOrder`.
  - `Todos.normalizeOrder(todos) → todos` — 미완료(상대 순서 유지) + 완료(`completedAt` 내림차순).
  - (내부) `splitByDone(todos) → { active, done }`, `cleanText(text) → string`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/todos.test.js`의 마지막 `})();` 바로 위에 추가:
```js
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
```

- [ ] **Step 2: 실패 확인**

`tests.html` 새로고침.
Expected: `결과: 3 통과, 14 실패`. 실패 메시지는 `Todos.addTodo is not a function` 류.

- [ ] **Step 3: 구현**

`js/todos.js`에서 `formatDateLabel` 함수 다음(= `window.Todos = {` 위)에 추가:
```js
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
```
그리고 `window.Todos = { ... };` 블록 전체를 교체:
```js
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
```

- [ ] **Step 4: 통과 확인**

`tests.html` 새로고침.
Expected: `결과: 17 통과, 0 실패`.

- [ ] **Step 5: Commit**

```bash
git add js/todos.js tests/todos.test.js
git commit -m "feat: 할 일 추가/수정/삭제/복원 로직"
```

---

### Task 3: 완료 토글 · 순서 변경 로직

**Files:**
- Modify: `js/todos.js`
- Test: `tests/todos.test.js`

**Interfaces:**
- Consumes: `splitByDone`, `normalizeOrder` (Task 2)
- Produces:
  - `Todos.toggleTodo(todos, id, now) → todos` — 완료 시 완료 목록 맨 위 + `completedAt = now`, 해제 시 미완료 맨 아래 + `completedAt = null`. 없는 id면 같은 배열.
  - `Todos.reorderTodo(todos, id, targetIndex, visibleIds: string[]) → todos` — "보이는 미완료 항목" 순서 안에서 `id`를 `targetIndex`(이동 후 인덱스, 0~길이-1로 제한)로 옮긴다. 안 보이는 항목·완료 항목은 배열 위치 그대로. 완료 항목/안 보이는 id/같은 위치면 같은 배열.
  - `Todos.moveTodo(todos, id, direction: 'up'|'down', visibleIds) → todos` — 보이는 미완료 이웃과 자리 교환. 경계면 같은 배열.
  - `Todos.dropIndex(orderIds: string[], dragId, targetId, after: boolean) → number` — `targetId` 앞(`after=false`)/뒤(`after=true`)에 놓았을 때 `reorderTodo`에 넘길 `targetIndex`.
  - (내부) `visibleActiveIds(todos, visibleIds) → string[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/todos.test.js`의 마지막 `})();` 바로 위에 추가:
```js
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
```

- [ ] **Step 2: 실패 확인**

`tests.html` 새로고침.
Expected: `결과: 17 통과, 15 실패`.

- [ ] **Step 3: 구현**

`js/todos.js`에서 `restoreTodo` 함수 다음에 추가:
```js
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
```
`window.Todos` 블록 전체를 교체:
```js
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
```

- [ ] **Step 4: 통과 확인**

`tests.html` 새로고침.
Expected: `결과: 32 통과, 0 실패`.

- [ ] **Step 5: Commit**

```bash
git add js/todos.js tests/todos.test.js
git commit -m "feat: 완료 토글과 순서 변경 로직"
```

---

### Task 4: 날짜 넘김 · 진행률 · 필터 · 저장 데이터 검증 로직

**Files:**
- Modify: `js/todos.js`
- Test: `tests/todos.test.js`

**Interfaces:**
- Consumes: `normalizeOrder` (Task 2), 상수들 (Task 1)
- Produces:
  - `Todos.rollover(todos, today: 'YYYY-MM-DD') → todos` — `date < today`인 미완료는 `date = today`(배열 위치 유지), 완료는 삭제. 변경 없으면 같은 배열.
  - `Todos.getProgress(todos) → { total, done, percent, byCategory: { work: {total, done, percent}, personal: {...}, study: {...} } }` — 키 순서 그대로. `percent`는 반올림 정수, 0개면 0.
  - `Todos.filterTodos(todos, filter: 'all'|category) → todos` — `'all'`이면 같은 배열.
  - `Todos.isValidTodo(item) → boolean`
  - `Todos.sanitizeTodos(list) → todos` — 배열 아니면 `[]`, 잘못된 항목 제거 후 `normalizeOrder`.
  - `Todos.sanitizePrefs(prefs) → { filter, lastCategory }` — 잘못되면 `'all'` / `'work'`.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/todos.test.js`의 마지막 `})();` 바로 위에 추가:
```js
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
```

- [ ] **Step 2: 실패 확인**

`tests.html` 새로고침.
Expected: `결과: 32 통과, 8 실패`.

- [ ] **Step 3: 구현**

`js/todos.js` 상단 상수 목록의 `WEEKDAYS` 다음 줄에 추가:
```js
  const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
```
`dropIndex` 함수 다음에 추가:
```js
  // 날짜가 바뀌면: 지난 미완료 → 오늘로 이월(위치 유지), 지난 완료 → 삭제.
  // 'YYYY-MM-DD'는 문자열 비교로 날짜 순서가 맞다.
  function rollover(todos, today) {
    let changed = false;
    const next = [];
    todos.forEach(t => {
      if (t.date >= today) {
        next.push(t);
        return;
      }
      changed = true;
      if (!t.done) next.push(Object.assign({}, t, { date: today }));
    });
    return changed ? next : todos;
  }

  function percentOf(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  function getProgress(todos) {
    const byCategory = {};
    CATEGORIES.forEach(c => {
      byCategory[c] = { total: 0, done: 0, percent: 0 };
    });
    todos.forEach(t => {
      byCategory[t.category].total += 1;
      if (t.done) byCategory[t.category].done += 1;
    });
    CATEGORIES.forEach(c => {
      byCategory[c].percent = percentOf(byCategory[c].done, byCategory[c].total);
    });
    const total = todos.length;
    const done = todos.filter(t => t.done).length;
    return { total, done, percent: percentOf(done, total), byCategory };
  }

  function filterTodos(todos, filter) {
    return filter === 'all' ? todos : todos.filter(t => t.category === filter);
  }

  function isValidTodo(item) {
    return Boolean(item) && typeof item === 'object' &&
      typeof item.id === 'string' && item.id !== '' &&
      typeof item.text === 'string' && item.text.trim() !== '' && item.text.length <= MAX_TEXT_LENGTH &&
      CATEGORIES.includes(item.category) &&
      typeof item.done === 'boolean' &&
      typeof item.date === 'string' && DATE_KEY_PATTERN.test(item.date) &&
      typeof item.createdAt === 'number' &&
      (item.completedAt === null || typeof item.completedAt === 'number');
  }

  // 저장소에서 읽은 목록 정리: 잘못된 항목 제거 + 순서 불변 조건 복구
  function sanitizeTodos(list) {
    if (!Array.isArray(list)) return [];
    return normalizeOrder(list.filter(isValidTodo));
  }

  function sanitizePrefs(prefs) {
    const p = prefs && typeof prefs === 'object' ? prefs : {};
    return {
      filter: FILTERS.includes(p.filter) ? p.filter : 'all',
      lastCategory: CATEGORIES.includes(p.lastCategory) ? p.lastCategory : 'work',
    };
  }
```
`window.Todos` 블록 전체를 교체:
```js
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
    rollover,
    getProgress,
    filterTodos,
    isValidTodo,
    sanitizeTodos,
    sanitizePrefs,
  };
```

- [ ] **Step 4: 통과 확인**

`tests.html` 새로고침.
Expected: `결과: 40 통과, 0 실패`.

- [ ] **Step 5: Commit**

```bash
git add js/todos.js tests/todos.test.js
git commit -m "feat: 날짜 넘김, 진행률, 필터, 저장 데이터 검증 로직"
```

---

### Task 5: localStorage 저장 모듈

**Files:**
- Create: `js/storage.js`
- Create: `tests/storage.test.js`
- Modify: `tests.html` (스크립트 2개 추가)

**Interfaces:**
- Consumes: 없음 (항목 검증은 `Todos.sanitizeTodos`가 담당 — `app.js`에서 조합)
- Produces:
  - `TodoStorage.KEY = 'todoapp.v1'`, `TodoStorage.PREFS_KEY = 'todoapp.v1.prefs'`, `TodoStorage.BACKUP_KEY = 'todoapp.v1.backup'`
  - `TodoStorage.parseData(raw: string|null) → { todos: any[], corrupted: boolean }` — `null`이면 `{ [], false }`. JSON 오류·`version !== 1`·`todos` 비배열이면 `{ [], true }`.
  - `TodoStorage.load(storage) → { todos, corrupted }` — `storage`는 `localStorage`와 같은 인터페이스(`getItem`/`setItem`) 또는 `null`. 손상 시 원본을 `BACKUP_KEY`에 기록. 접근 예외 시 `{ [], false }`.
  - `TodoStorage.save(storage, todos) → boolean` — 성공 `true`, 예외(용량 초과 등)·`null`이면 `false`.
  - `TodoStorage.loadPrefs(storage) → object` — 없거나 깨지면 `{}`. (검증은 `Todos.sanitizePrefs`)
  - `TodoStorage.savePrefs(storage, prefs) → boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/storage.test.js`:
```js
// js/storage.js 테스트
(function () {
  'use strict';

  const { test, assert, assertEqual } = window.TestHarness;
  const S = window.TodoStorage;

  // localStorage 흉내. failWrites=true면 setItem이 예외를 던진다 (용량 초과 흉내).
  function fakeStorage(initial, failWrites) {
    const data = Object.assign({}, initial);
    return {
      data,
      getItem: key => (key in data ? data[key] : null),
      setItem: (key, value) => {
        if (failWrites) throw new Error('QuotaExceededError');
        data[key] = String(value);
      },
    };
  }

  test('parseData: 저장된 값이 없으면 빈 목록, 정상', () => {
    assertEqual(S.parseData(null), { todos: [], corrupted: false });
  });

  test('parseData: 깨진 JSON은 corrupted', () => {
    assertEqual(S.parseData('{oops'), { todos: [], corrupted: true });
  });

  test('parseData: version이 다르면 corrupted', () => {
    assertEqual(S.parseData('{"version":2,"todos":[]}'), { todos: [], corrupted: true });
  });

  test('parseData: todos가 배열이 아니면 corrupted', () => {
    assertEqual(S.parseData('{"version":1,"todos":{}}'), { todos: [], corrupted: true });
  });

  test('parseData: 정상 데이터는 todos를 그대로 반환 (항목 검증은 하지 않음)', () => {
    assertEqual(S.parseData('{"version":1,"todos":[{"id":"a"}]}'), { todos: [{ id: 'a' }], corrupted: false });
  });

  test('save → load 왕복, version 1로 저장', () => {
    const storage = fakeStorage();
    assert(S.save(storage, [{ id: 'a' }]) === true, 'save 성공');
    assertEqual(S.load(storage), { todos: [{ id: 'a' }], corrupted: false });
    assertEqual(JSON.parse(storage.data[S.KEY]).version, 1);
  });

  test('load: 손상 데이터는 원본을 백업 키에 보관', () => {
    const storage = fakeStorage({ [S.KEY]: '{oops' });
    assertEqual(S.load(storage).corrupted, true);
    assertEqual(storage.data[S.BACKUP_KEY], '{oops');
  });

  test('load: storage를 쓸 수 없으면(null) 빈 목록', () => {
    assertEqual(S.load(null), { todos: [], corrupted: false });
  });

  test('save: 쓰기 실패하면 false', () => {
    assert(S.save(fakeStorage({}, true), []) === false, '용량 초과');
    assert(S.save(null, []) === false, 'storage 없음');
  });

  test('loadPrefs/savePrefs: 왕복, 없거나 깨지면 빈 객체', () => {
    const storage = fakeStorage();
    assertEqual(S.loadPrefs(storage), {});
    assert(S.savePrefs(storage, { filter: 'study', lastCategory: 'personal' }) === true);
    assertEqual(S.loadPrefs(storage), { filter: 'study', lastCategory: 'personal' });
    assertEqual(S.loadPrefs(fakeStorage({ [S.PREFS_KEY]: '{bad' })), {});
  });
})();
```

`tests.html`의 스크립트 부분을 다음으로 교체:
```html
  <script src="tests/harness.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/todos.js"></script>
  <script src="tests/todos.test.js"></script>
  <script src="tests/storage.test.js"></script>
  <script>TestHarness.renderResults();</script>
```

- [ ] **Step 2: 실패 확인**

`tests.html` 새로고침.
Expected: `결과: 40 통과, 10 실패` (메시지: `Cannot read properties of undefined (reading 'parseData')` 류). `js/storage.js`가 없어서 콘솔에 404가 보이는 것은 정상.

- [ ] **Step 3: 구현**

`js/storage.js`:
```js
// localStorage 입출력. JSON 봉투({ version, todos })만 다루고, 항목 검증은 Todos.sanitizeTodos가 맡는다.
(function () {
  'use strict';

  const KEY = 'todoapp.v1';
  const PREFS_KEY = 'todoapp.v1.prefs';
  const BACKUP_KEY = 'todoapp.v1.backup';
  const VERSION = 1;

  // 저장된 문자열 → { todos, corrupted }
  function parseData(raw) {
    if (raw === null || raw === undefined) return { todos: [], corrupted: false };
    try {
      const data = JSON.parse(raw);
      if (!data || data.version !== VERSION || !Array.isArray(data.todos)) {
        return { todos: [], corrupted: true };
      }
      return { todos: data.todos, corrupted: false };
    } catch (error) {
      return { todos: [], corrupted: true };
    }
  }

  // storage: localStorage와 같은 인터페이스. 쓸 수 없는 환경이면 null.
  function load(storage) {
    let raw;
    try {
      raw = storage.getItem(KEY);
    } catch (error) {
      return { todos: [], corrupted: false };
    }
    const result = parseData(raw);
    if (result.corrupted) {
      try {
        storage.setItem(BACKUP_KEY, raw);
      } catch (error) {
        // 백업 실패는 무시한다. 손상 안내는 그대로 보여준다.
      }
    }
    return result;
  }

  function save(storage, todos) {
    try {
      storage.setItem(KEY, JSON.stringify({ version: VERSION, todos }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadPrefs(storage) {
    try {
      return JSON.parse(storage.getItem(PREFS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function savePrefs(storage, prefs) {
    try {
      storage.setItem(PREFS_KEY, JSON.stringify(prefs));
      return true;
    } catch (error) {
      return false;
    }
  }

  window.TodoStorage = { KEY, PREFS_KEY, BACKUP_KEY, parseData, load, save, loadPrefs, savePrefs };
})();
```

- [ ] **Step 4: 통과 확인**

`tests.html` 새로고침.
Expected: `결과: 50 통과, 0 실패`.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js tests.html
git commit -m "feat: localStorage 저장 모듈"
```

---

### Task 6: 앱 화면 — 추가 · 완료 체크 · 삭제/실행 취소 · ▲▼ 이동 · 필터 · 진행률

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/ui.js`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `Todos.*` 전체 (Task 1~4), `TodoStorage.*` (Task 5)
- Produces:
  - `TodoUI.init(handlers)` — DOM 요소를 찾고 이벤트를 한 번만 연결한다.
  - `TodoUI.render(state)` — 상태 전체를 받아 다시 그린다.
  - `state` 모양 (`app.js` 소유):
    ```js
    {
      todos: [],            // 할 일 배열
      filter: 'all',        // 'all' | 'work' | 'personal' | 'study'
      lastCategory: 'work', // 추가 폼의 카테고리
      today: '2026-10-01',
      todayLabel: '2026년 10월 1일 (목)',
      editingId: null,      // Task 7에서 사용
      undo: null,           // { removed, index } | null
      notice: null,         // 'corrupted' | null
      saveFailed: false,
    }
    ```
  - `handlers` (Task 6 범위): `onAdd(text, category) → boolean(추가됨)`, `onToggle(id)`, `onRemove(id)`, `onUndo()`, `onMove(id, 'up'|'down')`, `onFilter(filter)`, `onCategoryChange(category)`, `onDismissNotice()`
  - Task 7에서 `onStartEdit(id)`, `onCommitEdit(id, text, category)`, `onCancelEdit()`, Task 8에서 `onReorder(id, targetIndex)` 추가.
  - DOM 규약: 항목 `<li class="todo [done] [editing]" data-id="...">`, 체크박스 `.todo-check`, 내용 `.todo-text`, 버튼 `button[data-action="up|down|edit|delete"]`.

- [ ] **Step 1: 페이지 골격**

`index.html`:
```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>오늘 할 일</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app">
    <div id="banner" class="banner" role="alert" hidden>
      <span id="banner-text"></span>
      <button type="button" id="banner-close" class="icon" aria-label="알림 닫기">×</button>
    </div>

    <header class="app-header">
      <h1>오늘 할 일</h1>
      <time id="today"></time>
    </header>

    <section id="progress" class="progress" aria-label="진행률"></section>

    <form id="add-form" class="add-form" autocomplete="off">
      <input id="add-text" type="text" maxlength="200" placeholder="할 일을 입력하세요..." aria-label="새 할 일">
      <select id="add-category" aria-label="카테고리"></select>
      <button type="submit" class="primary">추가</button>
    </form>

    <nav id="filters" class="filters" aria-label="카테고리 필터"></nav>

    <ul id="todo-list" class="todo-list" aria-label="할 일 목록"></ul>
    <p id="empty" class="empty" hidden></p>
  </main>

  <div id="toast" class="toast" role="status" hidden>
    <span>삭제됨</span>
    <button type="button" id="toast-undo">실행 취소</button>
  </div>

  <script src="js/storage.js"></script>
  <script src="js/todos.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 스타일 (Task 7·8에서 쓰는 클래스 포함, 전체)**

`style.css`:
```css
:root {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --text: #1f2328;
  --muted: #656d76;
  --border: #d8dee4;
  --accent: #2f6feb;
  --danger: #cf222e;
  --track: #e6e9ed;
  --work: #2f6feb;
  --personal: #1a7f37;
  --study: #8250df;
  --radius: 10px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --text: #e6edf3;
    --muted: #8d96a0;
    --border: #30363d;
    --accent: #4c8dff;
    --danger: #ff6b6b;
    --track: #262c36;
    --work: #4c8dff;
    --personal: #3fb950;
    --study: #a371f7;
  }
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
  line-height: 1.5;
}

.app { max-width: 640px; margin: 0 auto; padding: 24px 16px 96px; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: 0.3; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* 알림 배너 */
.banner {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 14px; margin-bottom: 16px;
  border: 1px solid var(--danger); border-radius: var(--radius);
  background: var(--surface); color: var(--danger);
}

/* 헤더 */
.app-header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.app-header h1 { margin: 0; font-size: 1.5rem; }
#today { color: var(--muted); }

/* 진행률 */
.progress { padding: 14px 16px; margin-bottom: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.progress-empty { margin: 0; color: var(--muted); text-align: center; }
.progress-total { display: flex; align-items: center; gap: 12px; }
.progress-total .bar { flex: 1; }
.progress-text { font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.progress-categories { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.progress-category { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 6px; font-size: 0.875rem; }
.progress-count { color: var(--muted); font-variant-numeric: tabular-nums; }
.bar { height: 10px; background: var(--track); border-radius: 999px; overflow: hidden; }
.bar-small { height: 6px; }
.bar-fill { height: 100%; background: var(--accent); border-radius: inherit; transition: width 0.2s; }
.progress-category.cat-work .bar-fill { background: var(--work); }
.progress-category.cat-personal .bar-fill { background: var(--personal); }
.progress-category.cat-study .bar-fill { background: var(--study); }

/* 추가 폼 */
.add-form { display: flex; gap: 8px; margin-bottom: 12px; }
.add-form input { flex: 1; min-width: 0; }
input[type="text"], select { padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
.primary { padding: 8px 16px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font-weight: 600; }

/* 필터 탭 */
.filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.filters button { padding: 4px 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); }
.filters button[aria-pressed="true"] { background: var(--text); border-color: var(--text); color: var(--bg); }

/* 목록 */
.todo-list { list-style: none; margin: 0; padding: 0; }
.todo {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; margin-bottom: 6px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
}
.todo-check { flex: none; width: 18px; height: 18px; accent-color: var(--accent); }
.todo-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.todo.done { opacity: 0.7; }
.todo.done .todo-text { color: var(--muted); text-decoration: line-through; }
.tag { flex: none; padding: 1px 8px; border-radius: 999px; color: #fff; font-size: 0.75rem; }
.tag.cat-work { background: var(--work); }
.tag.cat-personal { background: var(--personal); }
.tag.cat-study { background: var(--study); }
.actions { display: flex; flex: none; gap: 2px; }
.icon { width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: transparent; line-height: 1; }
.icon:hover:not(:disabled) { background: var(--track); }

/* 편집 (Task 7) */
.todo.editing { gap: 6px; }
.edit-text { flex: 1; min-width: 0; }

/* 드래그 앤 드롭 (Task 8) */
.handle, .handle-placeholder { flex: none; width: 16px; color: var(--muted); text-align: center; }
.handle { cursor: grab; user-select: none; }
.todo.dragging { opacity: 0.4; }
.todo.drop-before { box-shadow: 0 -3px 0 var(--accent); }
.todo.drop-after { box-shadow: 0 3px 0 var(--accent); }

/* 완료 구분선, 빈 상태 */
.divider { display: flex; align-items: center; gap: 10px; margin: 14px 0 8px; color: var(--muted); font-size: 0.875rem; }
.divider::before, .divider::after { content: ""; flex: 1; border-top: 1px solid var(--border); }
.empty { padding: 24px 0; color: var(--muted); text-align: center; }

/* 실행 취소 토스트 */
.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; border-radius: var(--radius);
  background: var(--text); color: var(--bg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.toast button { border: 0; background: transparent; color: inherit; font-weight: 700; text-decoration: underline; }

/* 좁은 화면: 드래그 대신 ▲▼ 버튼 사용 */
@media (max-width: 480px) {
  .progress-categories { grid-template-columns: 1fr; gap: 6px; }
  .add-form { flex-wrap: wrap; }
  .add-form input { flex-basis: 100%; }
  .icon { width: 26px; height: 26px; font-size: 0.85rem; }
  .handle, .handle-placeholder { display: none; }
}
```

- [ ] **Step 3: 화면 모듈**

`js/ui.js`:
```js
// 화면 그리기와 이벤트 연결. 상태는 app.js가 갖고, 여기서는 handlers를 호출만 한다.
(function () {
  'use strict';

  const Todos = window.Todos;
  const { CATEGORIES, CATEGORY_LABELS } = Todos;

  let els = null;
  let handlers = null;

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
    restoreFocus(focus);
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

  function renderItem(todo, position) {
    return el('li', { className: todo.done ? 'todo done' : 'todo', 'data-id': todo.id }, [
      el('input', { type: 'checkbox', className: 'todo-check', checked: todo.done, 'aria-label': `${todo.text} 완료` }),
      el('span', { className: 'todo-text', text: todo.text }),
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
          type: 'button', className: 'icon', 'data-action': 'delete',
          'aria-label': `${todo.text} 삭제`, text: '🗑',
        }),
      ]),
    ]);
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
```

- [ ] **Step 4: 앱 시작점**

`js/app.js`:
```js
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
```

- [ ] **Step 5: 자동 테스트가 그대로인지 확인**

`tests.html` 새로고침.
Expected: `결과: 50 통과, 0 실패`.

- [ ] **Step 6: 브라우저 수동 점검**

`index.html`을 연다. 시작 전 개발자 도구 콘솔에서 `localStorage.clear()` 후 새로고침해 빈 상태로 시작한다.

Expected (모두 확인):
1. 콘솔 오류 없음. 헤더에 오늘 날짜(예: `2026년 10월 1일 (목)`), 진행률 자리에 `오늘 할 일을 추가해보세요`.
2. `보고서 초안 작성` 입력 → Enter: 목록에 추가, 입력창 비워지고 포커스 유지. 진행률 `0 / 1 · 0%`, 업무 `0/1`, 개인·공부 `–`.
3. 카테고리 `공부`로 바꿔 `영어 단어 30개` 추가, `개인`으로 `장보기` 추가. 공백만 입력 후 Enter → 추가되지 않음.
4. `보고서 초안 작성` 체크 → 취소선, `완료 (1)` 구분선 아래로 이동, 진행률 `1 / 3 · 33%`, 업무 `1/1`. 다시 해제 → 미완료 맨 아래로.
5. ▲▼: 첫 항목 ▲, 마지막 미완료 ▼는 비활성. ▼ 누르면 한 칸 이동하고 포커스가 같은 항목의 ▼ 버튼에 남음.
6. `업무` 필터 탭 → 업무 항목만 보이고 탭이 강조됨. 진행률은 전체 기준 그대로. 개인 할 일이 없는 상태에서 `개인` 탭 → `개인 할 일이 없어요`.
7. 새로고침 → 할 일, 순서, 완료 상태, 선택한 필터 탭, 추가 폼 카테고리 모두 유지.
8. 🗑 → 즉시 사라지고 하단 `삭제됨 · 실행 취소` 토스트. [실행 취소] → 원래 위치에 복원. 다시 삭제하고 5초 대기 → 토스트 사라짐.
9. 콘솔에서 `localStorage.setItem('todoapp.v1', '{oops')` 후 새로고침 → 빨간 배너 `저장된 데이터를 읽지 못해 새로 시작합니다.`, × 로 닫힘. `localStorage.getItem('todoapp.v1.backup')` → `'{oops'`.
10. 개발자 도구에서 375px 폭: 입력창이 한 줄 전체, 진행률 카테고리가 세로로 쌓임, 가로 스크롤 없음. 다크 모드 에뮬레이션: 색이 어두운 테마로 바뀌고 글자가 읽힘.

- [ ] **Step 7: Commit**

```bash
git add index.html style.css js/ui.js js/app.js
git commit -m "feat: 앱 화면 - 추가, 완료 체크, 삭제/실행 취소, 이동, 필터, 진행률"
```

---

### Task 7: 인라인 편집

**Files:**
- Modify: `js/ui.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `Todos.updateTodo` (Task 2), Task 6의 `TodoUI`/`state`/`handlers`
- Produces:
  - `handlers.onStartEdit(id)`, `handlers.onCommitEdit(id, text, category)` — `state.editingId !== id`면 무시(렌더 중 발생하는 중복 blur 방지), `handlers.onCancelEdit()`
  - 편집 중인 항목 DOM: `<li class="todo editing" data-id>` 안에 `input.edit-text`, `select.edit-category`

- [ ] **Step 1: 편집 핸들러 추가**

`js/app.js`의 `handlers` 객체에서 `onMove` 다음에 추가:
```js
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
```

- [ ] **Step 2: 편집 화면 렌더링**

`js/ui.js`에서 `renderItem` 함수 전체를 다음으로 교체 (✏️ 버튼 추가, 편집 중이면 편집 줄):
```js
  function renderItem(todo, position, state) {
    if (state.editingId === todo.id) return renderEditingItem(todo);
    return el('li', { className: todo.done ? 'todo done' : 'todo', 'data-id': todo.id }, [
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
```

- [ ] **Step 3: 편집 이벤트 연결**

`js/ui.js`의 `init` 안, 목록 `click` 리스너의 분기를 다음으로 교체:
```js
      if (action === 'delete') handlers.onRemove(id);
      else if (action === 'up' || action === 'down') handlers.onMove(id, action);
      else if (action === 'edit') handlers.onStartEdit(id);
```
같은 `init` 안, `els.toastUndo.addEventListener(...)` 줄 위에 추가:
```js
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
```

- [ ] **Step 4: 편집 시작 시 포커스**

`js/ui.js`의 `render` 함수에서 마지막 줄 `restoreFocus(focus);`를 다음으로 교체:
```js
    const editInput = els.list.querySelector('.edit-text');
    if (editInput) {
      if (!editInput.closest('li').contains(document.activeElement)) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }
    } else {
      restoreFocus(focus);
    }
```

- [ ] **Step 5: 자동 테스트 확인**

`tests.html` 새로고침.
Expected: `결과: 50 통과, 0 실패`.

- [ ] **Step 6: 브라우저 수동 점검**

`index.html` 새로고침 후 할 일 2~3개가 있는 상태에서:
1. 텍스트 더블클릭 → 그 줄이 입력창+카테고리 선택으로 바뀌고, 입력창에 커서(맨 끝). 체크 상태는 바뀌지 않음.
2. 내용 수정 → Enter → 저장, 일반 줄로 돌아오고 포커스가 그 줄 체크박스에 있음.
3. 다시 편집 → 카테고리 선택 상자 클릭 → 편집이 닫히지 않음. `공부` 선택 → 페이지 빈 곳 클릭 → 저장되고 태그가 공부(보라)로.
4. 편집 중 Esc → 변경 취소.
5. 편집 중 내용을 모두 지우고 Enter → 원래 내용 그대로 (삭제되지 않음).
6. ✏️ 버튼(키보드: Tab으로 이동 후 Enter)으로도 편집 시작.
7. 완료 항목도 편집 가능. 새로고침 후 수정 내용 유지.
8. 콘솔 오류 없음.

- [ ] **Step 7: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: 할 일 인라인 편집"
```

---

### Task 8: 드래그 앤 드롭 순서 변경

**Files:**
- Modify: `js/ui.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `Todos.reorderTodo`, `Todos.dropIndex` (Task 3), `visibleIds()` (Task 6 `app.js` 내부)
- Produces: `handlers.onReorder(id, targetIndex)`. 미완료 항목에 `span.handle`(⠿, `draggable="true"`), 완료 항목에 `span.handle-placeholder`.

- [ ] **Step 1: 순서 변경 핸들러 추가**

`js/app.js`의 `handlers` 객체에서 `onMove` 다음에 추가:
```js
    onReorder(id, targetIndex) {
      ensureToday();
      commit(Todos.reorderTodo(state.todos, id, targetIndex, visibleIds()));
      render();
    },
```

- [ ] **Step 2: 핸들 렌더링**

`js/ui.js`의 `renderItem`에서 `el('li', ...)`의 자식 배열 맨 앞(체크박스 `el('input', ...)` 위)에 추가:
```js
      todo.done
        ? el('span', { className: 'handle-placeholder' })
        : el('span', { className: 'handle', draggable: 'true', title: '끌어서 순서 변경', 'aria-hidden': 'true', text: '⠿' }),
```
(키보드·화면 읽기 사용자는 ▲▼ 버튼을 쓰므로 핸들은 `aria-hidden`.)

- [ ] **Step 3: 드래그 앤 드롭 이벤트**

`js/ui.js` 상단 `let handlers = null;` 다음 줄에 추가:
```js
  let dragId = null; // 끌고 있는 항목 id
```
`itemId` 함수 다음에 추가:
```js
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
```
`init` 안, `els.toastUndo.addEventListener(...)` 줄 위에 추가:
```js
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
```

- [ ] **Step 4: 자동 테스트 확인**

`tests.html` 새로고침.
Expected: `결과: 50 통과, 0 실패`.

- [ ] **Step 5: 브라우저 수동 점검 (데스크톱 폭)**

할 일 4개 이상(카테고리 섞어서), 1개는 완료 상태로:
1. 미완료 항목 왼쪽에 ⠿ 핸들, 완료 항목은 핸들 없이 같은 들여쓰기.
2. 첫 항목의 ⠿를 끌어 세 번째 항목 아래쪽 절반에 올리면 그 아래에 파란 선 → 놓으면 세 번째 뒤로 이동.
3. 마지막 미완료 항목을 첫 항목 위쪽 절반에 놓기 → 맨 위로 이동.
4. 완료 항목 위로는 드롭 표시가 나오지 않고 놓아도 변화 없음.
5. `업무` 필터에서 끌어 옮긴 뒤 `전체`로 돌아가면 업무 항목끼리만 순서가 바뀌고 다른 카테고리 항목 위치는 그대로.
6. 새로고침 후 순서 유지. 텍스트 선택·체크박스 클릭은 평소처럼 동작.
7. 375px 폭에서는 핸들이 숨겨지고 ▲▼로 이동.
8. 콘솔 오류 없음.

- [ ] **Step 6: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat: 드래그 앤 드롭으로 순서 변경"
```

---

### Task 9: 탭 복귀 시 날짜 넘김 · 다른 탭과 동기화 · 저장 실패 경고 점검

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `ensureToday`, `loadTodos`, `render` (Task 6 `app.js` 내부), `TodoStorage.KEY`
- Produces: 없음 (수명 주기 이벤트만 추가)

- [ ] **Step 1: 수명 주기 이벤트 추가**

`js/app.js`의 `init` 함수에서 마지막 `render();` 다음에 추가:
```js
    // 자정을 넘긴 뒤 탭으로 돌아오면 이월
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      ensureToday();
      render();
    });

    // 다른 탭에서 바꾼 내용 반영 (같은 탭의 저장에는 발생하지 않는다)
    window.addEventListener('storage', event => {
      if (event.key !== TodoStorage.KEY && event.key !== null) return; // null = 전체 clear
      loadTodos();
      if (!state.todos.some(t => t.id === state.editingId)) state.editingId = null;
      ensureToday();
      render();
    });
```

- [ ] **Step 2: 자동 테스트 확인**

`tests.html` 새로고침.
Expected: `결과: 50 통과, 0 실패`.

- [ ] **Step 3: 브라우저 수동 점검**

> 탭 간 동기화와 이월 확인은 같은 출처(origin)의 두 탭이 필요하다: 둘 다 `http://localhost:8000/index.html`로 열거나 둘 다 같은 `file://` 경로로 연다.

1. **다른 탭 동기화:** 탭 A, B에 `index.html`. A에서 추가·체크·삭제 → B에 바로 반영(B를 클릭하지 않아도).
2. **이월:** 미완료 2개, 완료 1개인 상태에서 탭 B의 콘솔에 실행:
   ```js
   const d = JSON.parse(localStorage.getItem('todoapp.v1'));
   d.todos.forEach(t => { t.date = '2000-01-01'; });
   localStorage.setItem('todoapp.v1', JSON.stringify(d));
   ```
   → 탭 A에서 미완료 2개는 남고(순서 그대로), 완료 1개는 사라짐. 탭 A 새로고침해도 같음. (탭 A의 `storage` 이벤트 → `ensureToday` 경로. `visibilitychange` 경로는 같은 `ensureToday`를 부르므로 코드 리뷰로 확인하고, 원하면 OS 날짜를 하루 뒤로 바꾼 뒤 탭을 전환해 확인.)
3. **저장 실패 경고:** 콘솔에서
   ```js
   Storage.prototype._setItem = Storage.prototype.setItem;
   Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
   ```
   → 할 일 추가 → 빨간 배너 `저장하지 못했습니다. 새로고침하면 변경 사항이 사라질 수 있어요.` (× 버튼 없음), 앱은 계속 동작. 이어서
   ```js
   Storage.prototype.setItem = Storage.prototype._setItem;
   ```
   → 할 일 하나 더 체크 → 배너 사라짐. 새로고침 → 두 변경 모두 저장되어 있음.
4. 콘솔 오류 없음 (3번에서 의도한 예외 제외).

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: 탭 복귀 시 날짜 넘김, 다른 탭과 동기화"
```

---

### Task 10: 최종 점검 · README 갱신 · 배포

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 완성된 앱 전체
- Produces: 없음

- [ ] **Step 1: PRD 완료 기준 점검**

1. `tests.html` → `결과: 50 통과, 0 실패`.
2. **서버 없이** 탐색기에서 `index.html` 더블클릭(`file://`) → 정상 동작, 콘솔 오류 없음.
3. [PRD 7.2 수동 점검 체크리스트](../../PRD.md)의 10개 항목을 하나씩 확인. 키보드만으로(마우스 없이) 추가 → 체크 → ▲▼ → ✏️ 편집 → 🗑 삭제 → 실행 취소까지 가능한지 확인.
4. 외부 의존성 0개 확인: `index.html`, `tests.html`에 `http`로 시작하는 `src`/`href`가 없어야 한다.
   ```bash
   grep -nE '(src|href)="https?:' index.html tests.html
   ```
   Expected: 출력 없음.

- [ ] **Step 2: README 진행 상태 갱신**

`README.md`의 다음 줄을
```markdown
> **진행 상태:** 기획 완료 · 구현 예정 — [PRD](docs/PRD.md), [구현 계획](docs/superpowers/plans/2026-10-01-today-todo-app.md)
```
다음으로 교체:
```markdown
> **진행 상태:** v1 구현 완료 — [PRD](docs/PRD.md)의 모든 기능 동작, 자동 테스트 50개 통과
```

- [ ] **Step 3: Commit & Push**

```bash
git add README.md
git commit -m "docs: README 진행 상태 갱신 (v1 구현 완료)"
git push origin main
```
