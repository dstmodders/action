module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/coverage/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'clover'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: { '^@src/(.*)$': '<rootDir>/src/$1' },
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['(helpers|setup)\\.ts$'],
  testRegex: ['(/__tests__/.*|(\\.|/)(test|spec))\\.ts$'],
};
