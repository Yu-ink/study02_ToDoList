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
