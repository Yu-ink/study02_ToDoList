# Claude Code 단계별 프롬프트

[PRD](PRD.md)를 Claude Code로 구현하기 위한 5단계 프롬프트입니다.
각 프롬프트는 그대로 복사해 Claude Code에 붙여 넣으면 됩니다.

## 사용 방법

- **순서대로** 1단계부터 5단계까지 하나씩 실행합니다.
- **새 대화에서 시작:** 단계마다 새 대화로 시작하거나 `/clear` 후 붙여 넣는 것이 좋습니다. 각 프롬프트는 필요한 문서를 직접 읽도록 써 두어서 앞 대화가 없어도 됩니다.
- **결과 확인 후 진행:** 각 단계 끝에 Claude가 멈추고 보고합니다. "완료 기준"을 확인한 뒤 다음 단계로 넘어가세요.
- **상세 코드 참조:** 프롬프트는 [구현 계획](superpowers/plans/2026-10-01-today-todo-app.md)의 Task를 참조합니다. 계획에는 각 Task의 테스트와 구현 코드가 들어 있습니다.

| 단계 | 내용 | 계획 Task | 완료 기준 |
|---|---|---|---|
| 1 | 테스트 도구 + 핵심 할 일 로직 | 1~3 | 테스트 32개 통과 |
| 2 | 날짜 넘김·진행률·검증 로직 + 저장 모듈 | 4~5 | 테스트 50개 통과 |
| 3 | 화면 + 기본 기능 연결 | 6 | 브라우저 점검 10개 항목 |
| 4 | 인라인 편집 + 드래그 앤 드롭 | 7~8 | 브라우저 점검 |
| 5 | 탭 동기화·날짜 넘김 마무리 + 최종 점검 + 배포 | 9~10 | PRD 완료 기준 충족, push |

---

## 1단계: 테스트 도구와 핵심 할 일 로직

```text
"오늘 할 일" 앱 구현 1단계야. 테스트 도구를 만들고, 할 일의 핵심 로직을 테스트 먼저(TDD) 방식으로 구현해줘.

## 먼저 읽을 것
- docs/PRD.md — 2장(기능), 3장(데이터), 4장(기술 설계)
- CLAUDE_전역.md — 작업 규칙
- docs/superpowers/plans/2026-10-01-today-todo-app.md — "Global Constraints", "테스트 실행 방법", Task 1~3

## 할 일
1. 테스트 환경 (계획 Task 1)
   - .claude/launch.json: 이름 "static", `python -m http.server 8000`
   - tests/harness.js: test / assert / assertEqual(JSON 비교) / renderResults (결과 요약 "결과: N 통과, M 실패", 탭 제목 PASS/FAIL)
   - tests.html: 테스트 러너 페이지
   - js/todos.js: 상수(CATEGORIES, CATEGORY_LABELS, FILTERS, MAX_TEXT_LENGTH), toDateKey, formatDateLabel
2. 추가·수정·삭제·복원 (계획 Task 2): addTodo, updateTodo, removeTodo, restoreTodo, normalizeOrder
3. 완료 토글·순서 변경 (계획 Task 3): toggleTodo, reorderTodo, moveTodo, dropIndex

각 Task는 반드시 이 순서로:
테스트 작성 → tests.html에서 실패 확인 → 최소 구현 → 통과 확인 → 커밋

## 반드시 지킬 것
- 순수 JavaScript, 일반 <script> 태그. ES 모듈(import/export) 금지 — index.html을 file://로 열어야 하기 때문
- 파일 전체를 IIFE로 감싸고 window.Todos 하나만 노출
- todos.js는 DOM, localStorage, Date.now()를 직접 쓰지 않는다. "현재 시각"은 인자로 받는다
- 바뀌는 것이 없으면(빈 입력, 없는 id, 이동 불가) 입력 배열을 그대로 반환한다
- 배열은 항상 [미완료..., 완료(최근 완료 순)...] 순서를 유지한다
- 날짜는 로컬 기준 YYYY-MM-DD. toISOString()으로 날짜를 만들지 않는다
- 테스트는 직접 실행해서 확인한다: static 서버를 띄우고 http://localhost:8000/tests.html 페이지 텍스트를 읽는다

## 완료 기준
- tests.html: "결과: 32 통과, 0 실패"
- 커밋 3개 (Task 1, 2, 3)

끝나면 멈추고 보고해줘: 만든 파일 목록, 최종 테스트 결과, 계획과 다르게 한 부분과 그 이유.
```

---

## 2단계: 날짜 넘김·진행률·데이터 검증 로직과 저장 모듈

```text
"오늘 할 일" 앱 구현 2단계야. 1단계에서 만든 js/todos.js에 나머지 로직을 더하고, localStorage 저장 모듈을 TDD로 만들어줘.

## 먼저 읽을 것
- docs/PRD.md — 2.7(진행률), 2.8(날짜 넘김), 3.2(저장 형식), 6장(오류 처리)
- CLAUDE_전역.md
- docs/superpowers/plans/2026-10-01-today-todo-app.md — Task 4~5
- 현재 js/todos.js, tests/todos.test.js (1단계 결과)

## 시작 전 확인
- tests.html이 "결과: 32 통과, 0 실패"인지 먼저 확인한다. 아니면 멈추고 보고한다.

## 할 일
1. js/todos.js에 추가 (계획 Task 4)
   - rollover(todos, today): 지난 미완료 → 오늘로 이월(배열 위치 유지), 지난 완료 → 삭제
   - getProgress(todos): { total, done, percent, byCategory: { work, personal, study } }, 퍼센트는 반올림 정수, 0개면 0
   - filterTodos(todos, filter)
   - isValidTodo(item), sanitizeTodos(list): 잘못된 항목 제거 + 순서 복구
   - sanitizePrefs(prefs): 잘못된 값 → { filter: 'all', lastCategory: 'work' }
2. js/storage.js 새로 만들기 (계획 Task 5)
   - 키: todoapp.v1 = { version: 1, todos }, todoapp.v1.prefs, todoapp.v1.backup
   - parseData, load, save, loadPrefs, savePrefs
   - storage 객체를 인자로 받는다 (테스트에서 가짜 storage 사용)
   - 손상된 데이터는 원본을 backup 키에 보관하고 빈 목록 + corrupted: true 반환
   - 쓰기 실패(용량 초과 등)는 예외 대신 false 반환
   - 항목 검증은 하지 않는다 (Todos.sanitizeTodos의 역할)
   - window.TodoStorage 하나만 노출
3. tests/storage.test.js를 만들고 tests.html에 storage.js, storage.test.js 스크립트 추가

1단계와 같은 TDD 순서(테스트 → 실패 확인 → 구현 → 통과 → 커밋)와 규칙을 지킨다.

## 완료 기준
- tests.html: "결과: 50 통과, 0 실패"
- 커밋 2개 (Task 4, 5)

끝나면 멈추고 보고해줘: 추가한 함수, 최종 테스트 결과, 계획과 다르게 한 부분.
```

---

## 3단계: 화면 만들기와 기본 기능 연결

```text
"오늘 할 일" 앱 구현 3단계야. 1~2단계의 로직 위에 실제 화면을 만들고 기본 기능을 연결해줘.

## 먼저 읽을 것
- docs/PRD.md — 2.1~2.7(기능), 4.4(상태 흐름), 5장(화면 설계, 접근성), 6장(오류 처리)
- CLAUDE_전역.md
- docs/superpowers/plans/2026-10-01-today-todo-app.md — Task 6
- 현재 js/todos.js, js/storage.js

## 시작 전 확인
- tests.html이 "결과: 50 통과, 0 실패"인지 확인한다.

## 할 일 (계획 Task 6)
1. index.html: 배너, 헤더(제목 + 오늘 날짜), 진행률 영역, 추가 폼(입력창 + 카테고리 + 추가 버튼), 필터 탭, 목록, 빈 상태 안내, 실행 취소 토스트. 스크립트 순서 storage → todos → ui → app
2. style.css: CSS 변수로 라이트/다크(prefers-color-scheme), 최대 폭 640px, 480px 이하 모바일 배치, 카테고리 색(업무 파랑, 개인 초록, 공부 보라). [hidden]은 display:none !important
3. js/ui.js (window.TodoUI = { init, render })
   - render(state)는 상태 전체를 받아 다시 그린다
   - 사용자 입력은 textContent로만 넣는다 (innerHTML 금지)
   - 다시 그린 뒤에도 키보드 포커스가 같은 항목에 남게 한다
4. js/app.js: 상태 보관, handlers(onAdd, onToggle, onRemove, onUndo, onMove, onFilter, onCategoryChange, onDismissNotice), 할 일을 바꾸는 모든 동작 전에 날짜 확인(ensureToday), 변경마다 즉시 저장

이번 단계에서 동작해야 하는 기능:
- 추가 (Enter/버튼, 공백 거부, 마지막 카테고리 기억)
- 완료 체크 (취소선, "완료 (N)" 구분선 아래로)
- 삭제 + 5초 실행 취소 토스트
- ▲▼ 순서 이동 (끝에서는 비활성)
- 필터 탭 (새로고침 후 유지)
- 진행률 (전체 + 카테고리별, 0개면 "오늘 할 일을 추가해보세요")
- 저장 데이터 손상 / 저장 실패 배너

수정(편집)과 드래그 앤 드롭은 4단계에서 하므로 지금은 만들지 않는다.

## 확인 방법
- tests.html이 계속 "50 통과, 0 실패"인지 확인
- 브라우저에서 http://localhost:8000/index.html 을 열어 계획 Task 6 Step 6의 점검 10개 항목을 직접 확인한다 (localStorage.clear() 후 빈 상태에서 시작). 375px 폭과 다크 모드도 확인한다
- 콘솔 오류 없음

## 완료 기준
- 점검 10개 항목 모두 통과, 커밋 1개

끝나면 멈추고 보고해줘: 점검 항목별 결과(통과/실패), 화면 스크린샷 1장, 계획과 다르게 한 부분.
```

---

## 4단계: 인라인 편집과 드래그 앤 드롭

```text
"오늘 할 일" 앱 구현 4단계야. 할 일 수정(인라인 편집)과 드래그 앤 드롭 순서 변경을 추가해줘.

## 먼저 읽을 것
- docs/PRD.md — 2.2(수정), 2.5(순서 변경), 5.1(접근성)
- CLAUDE_전역.md
- docs/superpowers/plans/2026-10-01-today-todo-app.md — Task 7~8
- 현재 js/ui.js, js/app.js (3단계 결과)

## 할 일
1. 인라인 편집 (계획 Task 7)
   - 텍스트 더블클릭 또는 ✏️ 버튼 → 그 줄이 입력창 + 카테고리 선택으로 바뀜, 입력창에 포커스
   - Enter 또는 편집 줄 밖으로 포커스 이동 → 저장. Esc → 취소
   - 입력창 → 카테고리 선택처럼 편집 줄 안에서 포커스가 옮겨갈 때는 저장하지 않는다 (focusout의 relatedTarget 확인)
   - 내용을 모두 지우고 저장하면 취소로 처리 (삭제 아님)
   - 동시에 한 항목만 편집. onCommitEdit은 state.editingId가 다르면 무시한다 (다시 그리는 중 발생하는 중복 blur 방지)
   - 체크박스는 <label> 대신 aria-label을 쓴다 (텍스트 더블클릭 시 체크가 두 번 토글되는 문제 방지)
2. 드래그 앤 드롭 (계획 Task 8)
   - 미완료 항목에 ⠿ 핸들(draggable), 완료 항목은 핸들 자리만 비움
   - 놓을 위치를 위/아래 파란 선으로 표시, 놓으면 Todos.dropIndex + Todos.reorderTodo로 이동
   - 완료 항목 위에는 놓을 수 없다
   - 필터가 걸려 있으면 보이는 항목끼리만 순서가 바뀐다
   - 480px 이하에서는 핸들을 숨기고 ▲▼ 버튼을 쓴다

## 확인 방법
- tests.html "50 통과, 0 실패" 유지
- 브라우저에서 계획 Task 7 Step 6, Task 8 Step 5의 점검 항목을 직접 확인
- 콘솔 오류 없음

## 완료 기준
- 점검 항목 모두 통과, 커밋 2개 (편집, 드래그 앤 드롭)

끝나면 멈추고 보고해줘: 점검 항목별 결과, 계획과 다르게 한 부분.
```

---

## 5단계: 마무리 — 탭 동기화, 날짜 넘김, 최종 점검, 배포

```text
"오늘 할 일" 앱 구현 마지막 단계야. 남은 동작을 마무리하고, PRD 완료 기준을 전부 점검한 뒤 GitHub에 올려줘.

## 먼저 읽을 것
- docs/PRD.md — 2.8(날짜 넘김), 6장(오류 처리), 7장(테스트), 9장(완료 기준)
- CLAUDE_전역.md
- docs/superpowers/plans/2026-10-01-today-todo-app.md — Task 9~10
- 현재 js/app.js

## 할 일
1. 수명 주기 이벤트 (계획 Task 9)
   - visibilitychange: 탭이 다시 보이면 ensureToday() 후 다시 그리기 (자정을 넘긴 경우 이월)
   - storage 이벤트: 다른 탭에서 todoapp.v1이 바뀌면 다시 읽고(sanitize 포함) 다시 그리기. 편집 중이던 항목이 사라졌으면 편집 상태 해제
2. 점검 (계획 Task 9 Step 3)
   - 두 탭 동기화
   - 다른 탭에서 날짜를 과거로 바꿔 이월 확인 (미완료는 남고 완료는 사라짐)
   - Storage.prototype.setItem을 일시적으로 실패시켜 저장 실패 배너 → 복구 후 배너 사라짐 확인
3. 최종 점검 (계획 Task 10)
   - tests.html "50 통과, 0 실패"
   - 서버 없이 file://로 index.html을 열어도 동작하는지 확인
   - PRD 7.2 수동 점검 체크리스트 10개 항목 전부 확인. 특히 키보드만으로 추가 → 체크 → ▲▼ → 편집 → 삭제 → 실행 취소
   - 외부 의존성 0개: index.html, tests.html에 http(s)로 시작하는 src/href 없음
4. README.md 진행 상태를 "v1 구현 완료 — PRD의 모든 기능 동작, 자동 테스트 50개 통과"로 갱신
5. 커밋하고 git push origin main

## 완료 기준
- PRD 9장 완료 기준 충족
- 원격 저장소(main)에 모든 커밋 반영

끝나면 보고해줘: PRD 7.2 체크리스트 항목별 결과, 발견해서 고친 문제, 남은 알려진 한계(있다면).
```
