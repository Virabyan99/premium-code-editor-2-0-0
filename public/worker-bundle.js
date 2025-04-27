// worker-bundle.js
import * as escodegen from 'escodegen';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';

self.escodegen = escodegen;
self.acorn = acorn;
self.acorn.walk = acornWalk;