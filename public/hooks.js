window.hooks = window.hooks || {};

window.hooks.instrumentCode = function (code) {
  // Split code into lines for finer-grained instrumentation
  const lines = code.split('\n');
  const instrumentedLines = lines.map(line => {
    // Trim the line to avoid unnecessary whitespace issues
    const trimmedLine = line.trim();
    // Check if the line contains a loop keyword
    if (/(while|for|do)\s*\(/.test(trimmedLine)) {
      // Insert checkSteps() at the start of the loop body
      const loopBodyStart = line.indexOf('{');
      if (loopBodyStart !== -1) {
        return `${line.substring(0, loopBodyStart + 1)} checkSteps(); ${line.substring(loopBodyStart + 1)}`;
      } else {
        // Handle single-statement loops (no curly braces)
        return `${line} { checkSteps(); }`;
      }
    }
    // For non-loop lines, prepend checkSteps()
    return trimmedLine ? `checkSteps(); ${line}` : line;
  });
  return instrumentedLines.join('\n');
};

console.log('hooks.js loaded and window.hooks.instrumentCode defined');