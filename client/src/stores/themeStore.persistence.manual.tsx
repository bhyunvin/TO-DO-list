/**
 * 테마 지속성 기능 검증 스크립트
 *
 * 이 스크립트는 브라우저 콘솔에서 실행하여 테마 지속성 기능을 수동으로 검증합니다.
 *
 * 사용 방법:
 * 1. 애플리케이션을 실행합니다 (npm start)
 * 2. 브라우저 개발자 도구를 엽니다 (F12)
 * 3. 콘솔 탭으로 이동합니다
 * 4. 이 파일의 내용을 복사하여 콘솔에 붙여넣고 실행합니다
 * 5. 각 테스트 함수를 순서대로 실행합니다
 */

// 테스트 유틸리티 함수
const TestUtils = {
  // localStorage에서 테마 값 가져오기
  getStoredTheme: () => {
    try {
      const stored = localStorage.getItem('theme-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.theme;
      }
    } catch (error) {
      console.error('Failed to get stored theme:', error);
    }
    return null;
  },

  // data-theme 속성 가져오기
  getCurrentTheme: () => {
    return document.documentElement.dataset.theme;
  },

  // localStorage 초기화
  clearStorage: () => {
    localStorage.removeItem('theme-storage');
    console.log('✓ localStorage cleared');
  },

  // 테마 설정
  setTheme: (theme) => {
    const stored = {
      state: { theme },
      version: 0,
    };
    localStorage.setItem('theme-storage', JSON.stringify(stored));
    console.log(`✓ Theme set to: ${theme}`);
  },

  // 결과 출력
  logResult: (testName, passed, message) => {
    const icon = passed ? '✓' : '✗';
    const style = passed
      ? 'color: green; font-weight: bold'
      : 'color: red; font-weight: bold';
    console.log(`%c${icon} ${testName}`, style);
    if (message) {
      console.log(`  ${message}`);
    }
  },

  // 대기 함수
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// 테스트 1: 페이지 새로고침 후 테마 지속성
const test1_PageReloadPersistence = async () => {
  console.log('\n=== Test 1: Theme persists after page reload ===');
  console.log('Manual steps:');
  console.log('1. Set theme to dark using the toggle');
  console.log('2. Reload the page (F5 or Ctrl+R)');
  console.log('3. Verify theme is still dark');
  console.log('\nAutomated verification:');

  const storedTheme = TestUtils.getStoredTheme();
  const currentTheme = TestUtils.getCurrentTheme();

  console.log(`Stored theme: ${storedTheme}`);
  console.log(`Current theme: ${currentTheme}`);

  const passed = storedTheme === currentTheme;
  TestUtils.logResult(
    'Page reload persistence',
    passed,
    passed
      ? 'Theme matches stored preference'
      : 'Theme does not match stored preference',
  );

  return passed;
};

// 테스트 2: 로그아웃/로그인 후 테마 지속성
const test2_LogoutLoginPersistence = async () => {
  console.log('\n=== Test 2: Theme persists after logout and login ===');
  console.log('Manual steps:');
  console.log('1. Set theme to dark using the toggle');
  console.log('2. Note the stored theme value');
  console.log('3. Logout from the application');
  console.log('4. Login again');
  console.log('5. Verify theme is still dark');
  console.log('\nAutomated verification:');

  const storedTheme = TestUtils.getStoredTheme();
  const currentTheme = TestUtils.getCurrentTheme();

  console.log(`Stored theme: ${storedTheme}`);
  console.log(`Current theme: ${currentTheme}`);

  const passed = storedTheme !== null && storedTheme === currentTheme;
  TestUtils.logResult(
    'Logout/Login persistence',
    passed,
    passed
      ? 'Theme persists across sessions'
      : 'Theme does not persist across sessions',
  );

  return passed;
};

// 테스트 3: 여러 브라우저 탭에서 테마 지속성
const test3_MultipleTabsPersistence = async () => {
  console.log('\n=== Test 3: Theme persists across browser tabs ===');
  console.log('Manual steps:');
  console.log('1. Open this application in Tab 1');
  console.log('2. Set theme to dark in Tab 1');
  console.log('3. Open the application in a new tab (Tab 2)');
  console.log('4. Verify Tab 2 shows dark theme');
  console.log('5. Change theme to light in Tab 2');
  console.log('6. Reload Tab 1');
  console.log('7. Verify Tab 1 now shows light theme');
  console.log('\nAutomated verification:');

  const storedTheme = TestUtils.getStoredTheme();
  const currentTheme = TestUtils.getCurrentTheme();

  console.log(`Stored theme: ${storedTheme}`);
  console.log(`Current theme: ${currentTheme}`);

  const passed = storedTheme === currentTheme;
  TestUtils.logResult(
    'Multiple tabs persistence',
    passed,
    passed ? 'Theme syncs across tabs' : 'Theme does not sync across tabs',
  );

  return passed;
};

// 테스트 4: 저장된 선호도가 없을 때 기본 테마
const test4_DefaultThemeNoPreference = async () => {
  console.log('\n=== Test 4: Default theme when no preference exists ===');
  console.log('This test will clear localStorage and reload the page.');
  console.log(
    'Run this test in a new incognito/private window for best results.',
  );
  console.log('\nSteps:');
  console.log('1. Clear localStorage');
  console.log('2. Reload the page');
  console.log('3. Verify default theme is applied');

  // 현재 저장된 테마 확인
  const beforeClear = TestUtils.getStoredTheme();
  console.log(`Theme before clear: ${beforeClear}`);

  // localStorage 초기화
  TestUtils.clearStorage();

  const afterClear = TestUtils.getStoredTheme();
  console.log(`Theme after clear: ${afterClear}`);

  console.log('\n⚠ Please reload the page now to complete this test');
  console.log('After reload, run: test4_DefaultThemeNoPreference_Verify()');

  return null;
};

const test4_DefaultThemeNoPreference_Verify = () => {
  console.log('\n=== Test 4 Verification: Default theme check ===');

  const storedTheme = TestUtils.getStoredTheme();
  const currentTheme = TestUtils.getCurrentTheme();

  console.log(`Stored theme: ${storedTheme}`);
  console.log(`Current theme: ${currentTheme}`);

  // 기본 테마는 'light' 또는 시스템 선호도에 따라 'dark'일 수 있음
  const passed = currentTheme === 'light' || currentTheme === 'dark';
  TestUtils.logResult(
    'Default theme applied',
    passed,
    passed
      ? `Default theme (${currentTheme}) was applied`
      : 'No theme was applied',
  );

  return passed;
};

// 테스트 5: 시스템 선호도 감지
const test5_SystemPreferenceDetection = async () => {
  console.log('\n=== Test 5: System preference detection ===');
  console.log(
    'This test checks if the app respects system dark mode preference.',
  );
  console.log('\nManual steps:');
  console.log('1. Clear localStorage (run TestUtils.clearStorage())');
  console.log('2. Change your OS to dark mode');
  console.log('3. Reload the page');
  console.log('4. Verify app uses dark theme');
  console.log('5. Change your OS to light mode');
  console.log('6. Clear localStorage again');
  console.log('7. Reload the page');
  console.log('8. Verify app uses light theme');
  console.log('\nAutomated verification:');

  // 시스템 선호도 확인
  let systemPreference = 'light';
  try {
    if (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      systemPreference = 'dark';
    }
  } catch (error) {
    console.warn('System preference detection not supported', error);
  }

  console.log(`System preference: ${systemPreference}`);

  const storedTheme = TestUtils.getStoredTheme();
  const currentTheme = TestUtils.getCurrentTheme();

  console.log(`Stored theme: ${storedTheme}`);
  console.log(`Current theme: ${currentTheme}`);

  // 저장된 테마가 있으면 그것을 사용해야 함
  if (storedTheme) {
    const passed = currentTheme === storedTheme;
    TestUtils.logResult(
      'System preference (with stored preference)',
      passed,
      'Stored preference takes precedence over system preference',
    );
    return passed;
  } else {
    // 저장된 테마가 없으면 시스템 선호도를 따라야 함
    const passed = currentTheme === systemPreference;
    TestUtils.logResult(
      'System preference (no stored preference)',
      passed,
      passed
        ? 'System preference is respected'
        : 'System preference is not respected',
    );
    return passed;
  }
};

// 모든 테스트 실행 (수동 단계 제외)
const runAllAutomatedTests = async () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Theme Persistence Verification Test Suite    ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const results = [];

  results.push(await test1_PageReloadPersistence());
  await TestUtils.wait(500);

  results.push(await test2_LogoutLoginPersistence());
  await TestUtils.wait(500);

  results.push(await test3_MultipleTabsPersistence());
  await TestUtils.wait(500);

  results.push(await test5_SystemPreferenceDetection());

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                  ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r === true).length;
  const failed = results.filter((r) => r === false).length;
  const skipped = results.filter((r) => r === null).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`%cPassed: ${passed}`, 'color: green; font-weight: bold');
  console.log(`%cFailed: ${failed}`, 'color: red; font-weight: bold');
  console.log(`Skipped: ${skipped}`);

  console.log('\n⚠ Note: Test 4 (Default theme) requires manual execution:');
  console.log('   1. Run: test4_DefaultThemeNoPreference()');
  console.log('   2. Reload the page');
  console.log('   3. Run: test4_DefaultThemeNoPreference_Verify()');
};

// 테스트 함수들을 전역으로 노출
globalThis.ThemePersistenceTests = {
  test1_PageReloadPersistence,
  test2_LogoutLoginPersistence,
  test3_MultipleTabsPersistence,
  test4_DefaultThemeNoPreference,
  test4_DefaultThemeNoPreference_Verify,
  test5_SystemPreferenceDetection,
  runAllAutomatedTests,
  TestUtils,
};

console.log('\n✓ Theme Persistence Test Suite loaded!');
console.log('\nAvailable commands:');
console.log(
  '  ThemePersistenceTests.runAllAutomatedTests() - Run all automated tests',
);
console.log('  ThemePersistenceTests.test1_PageReloadPersistence() - Test 1');
console.log('  ThemePersistenceTests.test2_LogoutLoginPersistence() - Test 2');
console.log('  ThemePersistenceTests.test3_MultipleTabsPersistence() - Test 3');
console.log(
  '  ThemePersistenceTests.test4_DefaultThemeNoPreference() - Test 4 (Part 1)',
);
console.log(
  '  ThemePersistenceTests.test4_DefaultThemeNoPreference_Verify() - Test 4 (Part 2)',
);
console.log(
  '  ThemePersistenceTests.test5_SystemPreferenceDetection() - Test 5',
);
console.log('  ThemePersistenceTests.TestUtils - Utility functions');
