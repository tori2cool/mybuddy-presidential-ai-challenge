module.exports = {
  preset: "react-native",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-navigation|expo(nent)?|expo-modules-core|react-native-reanimated|react-native-gesture-handler)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/**/__tests__/**/*.test.(ts|tsx|js)", "<rootDir>/**/*.test.(ts|tsx|js)"],
};
