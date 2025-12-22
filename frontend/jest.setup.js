jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock("react-native-gesture-handler", () => {
  // Use the official RNGH Jest setup if present
  return require("react-native-gesture-handler/jestSetup");
});
