// public/hooks.js
if (!self.hooks) {
  self.hooks = {};
}

self.hooks.instrumentCode = function (code) {
  // Check if dependencies are loaded
  if (!self.acorn || !self.acorn.walk || !self.escodegen) {
    throw new Error('Acorn or Escodegen dependencies not loaded. Cannot instrument code.');
  }

  // Parse the code into an AST
  const ast = self.acorn.parse(code, { sourceType: 'module', ecmaVersion: 'latest' });

  // Function to insert checkSteps() at the beginning of block statements
  const insertCheckSteps = (node) => {
    if (node.body && Array.isArray(node.body.body)) {
      const checkStepsNode = self.acorn.parse('checkSteps();').body[0];
      node.body.body.unshift(checkStepsNode);
    } else if (node.body && node.body.type === 'ExpressionStatement') {
      // Convert single expression to block with checkSteps()
      const checkStepsNode = self.acorn.parse('checkSteps();').body[0];
      node.body = {
        type: 'BlockStatement',
        body: [checkStepsNode, node.body],
      };
    }
  };

  // Walk the AST and instrument loops
  self.acorn.walk.simple(ast, { // Use self.acorn.walk instead of self.acornWalk
    ForStatement: insertCheckSteps,
    WhileStatement: insertCheckSteps,
    DoWhileStatement: insertCheckSteps,
  });

  // Serialize the modified AST back to code
  const instrumentedCode = self.escodegen.generate(ast);
  return instrumentedCode;
};