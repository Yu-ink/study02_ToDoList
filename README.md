# 오늘 할 일

매일 10~20개의 할 일을 **업무 / 개인 / 공부**로 나눠 관리하는 개인용 웹앱입니다.
설치나 서버 없이 `index.html`을 브라우저로 열면 바로 실행되고, 데이터는 브라우저(`localStorage`)에 저장되어 새로고침해도 사라지지 않습니다.

> **진행 상태:** v1 구현 완료 — [PRD](docs/PRD.md)의 모든 기능 동작, 자동 테스트 50개 통과

## 주요 기능

- **할 일 추가 · 수정 · 삭제**: 텍스트 더블클릭으로 바로 수정, 삭제 후 5초 안에 실행 취소
- **완료 체크**: 완료한 일은 취소선과 함께 목록 아래로 이동
- **카테고리 분류**: 업무(파랑) · 개인(초록) · 공부(보라), 카테고리 필터 탭
- **진행률**: 오늘 전체 완료율 + 카테고리별 완료율
- **순서 변경**: 드래그 앤 드롭 또는 ▲▼ 버튼
- **날짜 넘김**: 날짜가 바뀌면 못 끝낸 일은 오늘로 이월, 지난 완료 항목은 정리
- 다크 모드(시스템 설정 따름), 모바일 화면, 키보드 조작 지원

## 실행 방법

**바로 사용하기:** https://yu-ink.github.io/study02_ToDoList/ (GitHub Pages)

내 컴퓨터에서 실행하려면:

1. 저장소를 내려받습니다.
   ```bash
   git clone https://github.com/Yu-ink/study02_ToDoList.git
   ```
2. `index.html`을 더블클릭해 브라우저로 엽니다. 끝입니다.

## 테스트

`tests.html`을 브라우저로 열면 할 일 로직과 저장 로직의 테스트 결과가 표시됩니다 (`결과: N 통과, 0 실패`).
외부 테스트 라이브러리 없이 직접 만든 최소 테스트 도구(`tests/harness.js`)를 사용합니다.

## 프로젝트 구조

```
index.html        앱 진입점
style.css         스타일 (라이트/다크)
js/storage.js     localStorage 읽기/쓰기
js/todos.js       할 일 로직 (DOM을 모르는 순수 함수)
js/ui.js          화면 그리기, 이벤트 처리
js/app.js         초기화, 상태 보관
tests.html        테스트 러너
tests/            테스트 도구와 테스트 코드
docs/             PRD, 구현 계획
```

## 기술 원칙

- 순수 HTML / CSS / JavaScript — 프레임워크, 라이브러리, 빌드 도구 없음
- `file://`로 바로 실행 — ES 모듈 대신 일반 `<script>` 태그 사용
- 날짜는 로컬 시간 기준으로 계산 (`toISOString()`의 UTC 날짜 밀림 방지)

## 문서

- [PRD (제품 요구사항)](docs/PRD.md)
- [구현 계획](docs/superpowers/plans/2026-10-01-today-todo-app.md)
- [Claude Code 단계별 프롬프트](docs/claude-code-prompts.md)
- [Claude 작업 지침](CLAUDE_전역.md)
