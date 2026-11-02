import config from './app.config';

const build = (env: Record<string, string | undefined>) => {
  const saved = process.env.BUILD_NUMBER;
  if (env.BUILD_NUMBER === undefined) delete process.env.BUILD_NUMBER; else process.env.BUILD_NUMBER = env.BUILD_NUMBER;
  const out = config({ config: {} } as any);
  if (saved === undefined) delete process.env.BUILD_NUMBER; else process.env.BUILD_NUMBER = saved;
  return out;
};

test('identity is stable', () => {
  const c = build({});
  expect(c.name).toBe('Life Centralized');
  expect(c.slug).toBe('life-centralized');
  expect(c.ios?.bundleIdentifier).toBe('com.lifecentralized.app');
});

test('buildNumber comes from BUILD_NUMBER, defaulting to "1"', () => {
  expect(build({ BUILD_NUMBER: '42' }).ios?.buildNumber).toBe('42');
  expect(build({}).ios?.buildNumber).toBe('1');
});

test('calendar permission is configured and notifications are not', () => {
  const plugins = JSON.stringify(build({}).plugins);
  expect(plugins).toContain('expo-calendar');
  expect(plugins).toContain('Centralized');
  expect(plugins).not.toContain('expo-notifications');
});

test('the app runs on Expo Router with bundled fonts and the time picker', () => {
  const c = build({});
  expect(c.scheme).toBe('lifecentralized');
  const names = (c.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));
  expect(names).toEqual(expect.arrayContaining(['expo-router', 'expo-font', '@react-native-community/datetimepicker']));
});
