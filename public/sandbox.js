window.onload = function () {
  const z = window.Zod;

  if (!z) {
    console.error('Zod is not loaded');
    return;
  }

  const runMessageSchema = z.object({
    type: z.literal('run'),
    code: z.string(),
  });

  const messageSchema = z.union([runMessageSchema]);

  // Utility to serialize console arguments
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

  // Utility to serialize table data
  function serializeTable(data, columns) {
    if (!data || typeof data !== 'object') {
      return { headers: ['Value'], rows: [[String(data)]] };
    }

    const headers = columns || (Array.isArray(data) ? ['Index', 'Value'] : Object.keys(data));
    const rows = [];

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        rows.push([String(index), typeof item === 'object' ? JSON.stringify(item) : String(item)]);
      });
    } else {
      Object.entries(data).forEach(([key, value]) => {
        rows.push([key, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
      });
    }

    return { headers, rows };
  }

  // Track group depth and timers
  let groupDepth = 0;
  const timers = new Map();

  // Override console methods
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

  window.addEventListener('message', (event) => {
    try {
      const message = messageSchema.parse(event.data);
      if (message.type === 'run') {
        try {
          const result = eval(message.code);
          window.parent.postMessage({ type: 'result', value: String(result || '') }, '*');
        } catch (error) {
          window.parent.postMessage({ type: 'error', message: error.message, stack: error.stack }, '*');
        }
      }
    } catch (error) {
      window.parent.postMessage({ type: 'schemaError', issues: error.message }, '*');
    }
  });
};