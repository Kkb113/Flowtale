module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^nanoid$": "<rootDir>/test-support/nanoid.js",
  },
  setupFilesAfterEnv: ["<rootDir>/test-support/setup.js"],
};
