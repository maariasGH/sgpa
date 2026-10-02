// Jest en modo ESM nativo (el proyecto es "type": "module").
// Babel solo compila el JSX de los .jsx; los imports/exports quedan como ESM.
export default {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  extensionsToTreatAsEsm: [".jsx"],
  transform: {
    "\\.jsx$": ["babel-jest", { presets: [["@babel/preset-react", { runtime: "automatic" }]] }],
  },
  setupFiles: ["<rootDir>/tests/soporte/setup.js"],
  // Imágenes: un string fijo en lugar del archivo
  moduleNameMapper: { "\\.(png|jpe?g|svg)$": "<rootDir>/tests/soporte/archivo.js" },
};
