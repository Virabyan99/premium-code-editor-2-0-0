window.onload = function() {
    const z = window.Zod;
  
    if (!z) {
      console.error('Zod is not loaded');
      return;
    }
  
    const runMessageSchema = z.object({
      type: z.literal('run'),
      code: z.string(),
    });
  
    const resetToDefaultMessageSchema = z.object({
      type: z.literal('resetToDefault'),
    });
  
    const messageSchema = z.union([runMessageSchema, resetToDefaultMessageSchema]);
  
    window.addEventListener('message', (event) => {
      try {
        const message = messageSchema.parse(event.data);
        if (message.type === 'run') {
          try {
            const result = eval(message.code);
            window.parent.postMessage(
              { type: 'console', payload: String(result || '') },
              '*'
            );
          } catch (error) {
            window.parent.postMessage(
              { type: 'console', payload: error.message },
              '*'
            );
          }
        } else if (message.type === 'resetToDefault') {
          window.parent.postMessage(
            { type: 'console', payload: 'console.log("Welcome to the Sandbox!");' },
            '*'
          );
        }
      } catch (error) {
        window.parent.postMessage(
          { type: 'schemaError', issues: error.message },
          '*'
        );
      }
    });
  };