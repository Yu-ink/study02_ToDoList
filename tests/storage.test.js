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
