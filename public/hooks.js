self.hooks.instrumentCode = function (code) {
  importScripts('https://unpkg.com/@babel/parser@7.23.0/lib/index.js');
  importScripts('https://unpkg.com/@babel/traverse@7.23.0/lib/index.js');

  const { parse } = self.babelParser;
  const traverse = self.babelTraverse.default;

  const ast = parse(code, { sourceType: 'module', errorRecovery: true });
  traverse(ast, {
    ForStatement(path) {
      path.get('body').unshiftContainer('body', parse('checkSteps();').program.body[0]);
    },
    WhileStatement(path) {
      path.get('body').unshiftContainer('body', parse('checkSteps();').program.body[0]);
    },
    DoWhileStatement(path) {
      path.get('body').unshiftContainer('body', parse('checkSteps();').program.body[0]);
    },
    ForEachStatement(path) {
      const node = path.node;
      const array = node.object;
      const param = node.left.name;
      const body = node.body.body;
      const forLoop = parse(`
        for (let i = 0; i < ${array.name}.length; i++) {
          checkSteps();
          let ${param} = ${array.name}[i];
          ${body.map((stmt) => stmt.source()).join('\n')}
        }
      `).program.body[0];
      path.replaceWith(forLoop);
    },
  });

  return ast.program.body.map((node) => node.source()).join('\n');
};