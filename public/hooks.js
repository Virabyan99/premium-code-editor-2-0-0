self.hooks = self.hooks || {};

self.hooks.instrumentCode = function (code) {
  // Instrument only loops by adding checkSteps() inside the loop body
  const instrumentedCode = code.replace(/(for|while|do)\s*\([^)]*\)\s*{/g, '$& checkSteps();');
  return instrumentedCode;
};

console.log('hooks.js loaded and self.hooks.instrumentCode defined');