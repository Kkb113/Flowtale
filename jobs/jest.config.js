/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  setupFilesAfterEnv: ["jest-expect-message"],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
