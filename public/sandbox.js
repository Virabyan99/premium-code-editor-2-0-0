window.onload = function () {
  const z = window.Zod;

  if (!z) {
    console.error('Zod is not loaded');
    return;
  }

  // **Zod Schemas for Message Validation**
  const runMessageSchema = z.object({
    type: z.literal('run'),
    code: z.string(),
  });

  const timerCallbackMessageSchema = z.object({
    type: z.literal('timerCallback'),
    id: z.string(),
    args: z.array(z.any()),
  });

  const dialogResponseMessageSchema = z.object({
    type: z.literal('dialogResponse'),
    id: z.string(),
    value: z.union([z.string(), z.boolean(), z.null()]),
  });

  const messageSchema = z.union([
    runMessageSchema,
    timerCallbackMessageSchema,
    dialogResponseMessageSchema,
  ]);

  // **Utility Functions**
  function serializeArgs(args) {
    return args
      .map((arg) => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch {
          return '[Unserializable Object]';
        }
      })
      .join(' ');
  }

  function serializeTable(data, columns) {
    if (!data || typeof data !== 'object') {
      return { headers: ['Value'], rows: [[String(data)]] };
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { headers: [], rows: [] };
      }

      if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
        const allKeys = new Set();
        data.forEach((obj) => {
          if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach((key) => allKeys.add(key));
          }
        });
        const headers = columns || Array.from(allKeys);
        const rows = data.map((obj, index) => {
          const row = [String(index)];
          headers.forEach((header) => {
            const value = obj && obj[header] !== undefined ? obj[header] : 'N/A';
            row.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
          });
          return row;
        });
        return { headers: ['(index)', ...headers], rows };
      } else {
        const headers = columns || ['Index', 'Value'];
        const rows = data.map((item, index) => [
          String(index),
          typeof item === 'object' ? JSON.stringify(item) : String(item),
        ]);
        return { headers, rows };
      }
    } else {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return { headers: [], rows: [] };
      }

      if (typeof data[keys[0]] === 'object' && !Array.isArray(data[keys[0]])) {
        const allSubKeys = new Set();
        keys.forEach((key) => {
          if (data[key] && typeof data[key] === 'object') {
            Object.keys(data[key]).forEach((subKey) => allSubKeys.add(subKey));
          }
        });
        const subHeaders = columns || Array.from(allSubKeys);
        const rows = keys.map((key) => {
          const row = [key];
          subHeaders.forEach((header) => {
            const value = data[key] && data[key][header] !== undefined ? data[key][header] : 'N/A';
            row.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
          });
          return row;
        });
        return { headers: ['(index)', ...subHeaders], rows };
      } else {
        const headers = columns || ['Key', 'Value'];
        const rows = Object.entries(data).map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value),
        ]);
        return { headers, rows };
      }
    }
  }

  // **State Management**
  let groupDepth = 0;
  const timers = new Map();
  const counters = new Map();
  const dialogPromises = new Map();
  let dialogIdCounter = 0;

  let timeoutIdCounter = 0;
  let intervalIdCounter = 0;
  const timeoutCallbacks = new Map();
  const intervalCallbacks = new Map();

  // **Custom Timer Functions**
  window.setTimeout = function (callback, delay, ...args) {
    const id = `timeout-${timeoutIdCounter++}`;
    timeoutCallbacks.set(id, callback);
    window.parent.postMessage({ type: 'setTimeout', id, delay, args }, '*');
    return id;
  };

  window.clearTimeout = function (id) {
    window.parent.postMessage({ type: 'clearTimeout', id }, '*');
    timeoutCallbacks.delete(id);
  };

  window.setInterval = function (callback, delay, ...args) {
    const id = `interval-${intervalIdCounter++}`;
    intervalCallbacks.set(id, callback);
    window.parent.postMessage({ type: 'setInterval', id, delay, args }, '*');
    return id;
  };

  window.clearInterval = function (id) {
    window.parent.postMessage({ type: 'clearInterval', id }, '*');
    intervalCallbacks.delete(id);
  };

  // **Asynchronous Dialog Handling**
  function asyncDialog(dialogType, message, defaultValue) {
    const id = `dialog-${dialogIdCounter++}`;
    return new Promise((resolve, reject) => {
      window.parent.postMessage(
        {
          type: 'dialogRequest',
          dialogType,
          message: String(message),
          defaultValue: defaultValue ? String(defaultValue) : undefined,
          id,
        },
        '*'
      );
      dialogPromises.set(id, { resolve, reject });
      setTimeout(() => {
        if (dialogPromises.has(id)) {
          dialogPromises.delete(id);
          reject(new Error(`Dialog ${dialogType} timed out after 30 seconds`));
        }
      }, 30000);
    });
  }

  window.alert = function (message) {
    return asyncDialog('alert', message).then(() => undefined);
  };

  window.confirm = function (message) {
    return asyncDialog('confirm', message);
  };

  window.prompt = function (message, defaultValue = '') {
    return asyncDialog('prompt', message, defaultValue);
  };

  // **Console Overrides**
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    table: console.table,
    group: console.group,
    groupEnd: console.groupEnd,
    time: console.time,
    timeEnd: console.timeEnd,
    clear: console.clear,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    assert: console.assert,
    count: console.count,
  };

  console.log = function (...args) {
    const payload = serializeArgs(args);
    window.parent.postMessage({ type: 'console', payload, method: 'log', groupDepth }, '*');
    originalConsole.log(...args);
  };

  console.warn = function (...args) {
    const payload = serializeArgs(args);
    window.parent.postMessage({ type: 'console', payload, method: 'warn', groupDepth }, '*');
    originalConsole.warn(...args);
  };

  console.error = function (...args) {
    const payload = serializeArgs(args);
    window.parent.postMessage({ type: 'console', payload, method: 'error', groupDepth }, '*');
    originalConsole.error(...args);
  };

  console.table = function (data, columns) {
    const tableData = serializeTable(data, columns);
    window.parent.postMessage({ type: 'console', payload: tableData, method: 'table', groupDepth }, '*');
    originalConsole.table(data, columns);
  };

  console.group = function (...args) {
    groupDepth++;
    const payload = serializeArgs(args);
    window.parent.postMessage({ type: 'console', payload, method: 'group', groupDepth }, '*');
    originalConsole.group(...args);
  };

  console.groupEnd = function () {
    if (groupDepth > 0) groupDepth--;
    window.parent.postMessage({ type: 'console', payload: '', method: 'groupEnd', groupDepth }, '*');
    originalConsole.groupEnd();
  };

  console.time = function (label) {
    timers.set(label, performance.now());
    window.parent.postMessage({ type: 'console', payload: label, method: 'time', groupDepth }, '*');
    originalConsole.time(label);
  };

  console.timeEnd = function (label) {
    const start = timers.get(label);
    if (start !== undefined) {
      const duration = performance.now() - start;
      timers.delete(label);
      window.parent.postMessage({ type: 'console', payload: { label, duration }, method: 'timeEnd', groupDepth }, '*');
      originalConsole.timeEnd(label);
    }
  };

  console.clear = function () {
    window.parent.postMessage({ type: 'console', payload: '', method: 'clear', groupDepth }, '*');
    originalConsole.clear();
  };

  console.info = function (...args) {
    const payload = serializeArgs(args);
    window.parent.postMessage({ type: 'console', payload, method: 'info', groupDepth }, '*');
    originalConsole.info(...args);
  };

  console.debug = function (...args) {
    const payload = serializeArgs(args);
    window.parent.postMessage({ type: 'console', payload, method: 'debug', groupDepth }, '*');
    originalConsole.debug(...args);
  };

  console.trace = function (...args) {
    const err = new Error();
    const stack = err.stack?.split('\n').slice(1).join('\n') || 'No stack trace';
    const message = serializeArgs(args) + '\n' + stack;
    window.parent.postMessage({ type: 'console', payload: message, method: 'trace', groupDepth }, '*');
    originalConsole.trace(...args);
  };

  console.assert = function (assertion, ...args) {
    if (!assertion) {
      const msg = args.length ? serializeArgs(args) : 'Assertion failed';
      window.parent.postMessage({ type: 'console', payload: msg, method: 'assert', groupDepth }, '*');
      originalConsole.assert(assertion, ...args);
    }
  };

  console.count = function (label = 'default') {
    const count = (counters.get(label) || 0) + 1;
    counters.set(label, count);
    window.parent.postMessage({ type: 'console', payload: { label, count }, method: 'count', groupDepth }, '*');
    originalConsole.count(label);
  };

  // **Step Counter from hooks.js**
  const instrumentCode = window.hooks && window.hooks.instrumentCode
    ? window.hooks.instrumentCode
    : function (code) {
        console.error('window.hooks.instrumentCode is not available; running code without instrumentation');
        return `(async function() { ${code} })()`;
      };

  // **Message Event Listener**
  window.addEventListener('message', async (event) => {
    try {
      const message = messageSchema.parse(event.data);
      if (message.type === 'timerCallback') {
        const callback = message.id.startsWith('timeout-')
          ? timeoutCallbacks.get(message.id)
          : intervalCallbacks.get(message.id);
        if (callback) {
          try {
            callback(...message.args);
          } catch (error) {
            window.parent.postMessage(
              {
                type: 'error',
                message: error.message,
                stack: error.stack || 'No stack trace',
              },
              '*'
            );
          }
        }
      } else if (message.type === 'run') {
        try {
          const MAX_STEPS = 1000;
          const startTime = Date.now();

          const instrumentedUserCode = instrumentCode(message.code);
          const wrappedCode = `
            let stepCount = 0;
            const checkSteps = () => {
              stepCount++;
              if (stepCount % 100 === 0) {
                const elapsed = Date.now() - startTime;
                if (elapsed > 2000) {
                  console.log('Execution has been running for over 2 seconds');
                }
              }
              if (stepCount > ${MAX_STEPS}) {
                throw new Error('Potential infinite loop detected: exceeded ${MAX_STEPS} steps');
              }
            };
            (async function() {
              ${instrumentedUserCode}
            })()
          `;

          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const userFunction = new AsyncFunction(wrappedCode);
          const result = await userFunction();

          window.parent.postMessage({ type: 'result', value: String(result || '') }, '*');
        } catch (error) {
          window.parent.postMessage(
            {
              type: 'error',
              message: error.message,
              stack: error.stack || 'No stack trace',
            },
            '*'
          );
        }
      } else if (message.type === 'dialogResponse') {
        const { id, value } = message;
        if (dialogPromises.has(id)) {
          const { resolve } = dialogPromises.get(id);
          dialogPromises.delete(id);
          resolve(value);
        }
      }
    } catch (error) {
      window.parent.postMessage(
        {
          type: 'schemaError',
          issues: error.message,
        },
        '*'
      );
    }
  });
};