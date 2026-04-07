module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./__tests__/setup-i18n.ts'],
  testPathIgnorePatterns: ['/node_modules/', '__tests__/setup-i18n\\.ts'],
};
