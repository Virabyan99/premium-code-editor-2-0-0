window.onload = function () {
  const z = window.Zod

  if (!z) {
    console.error('Zod is not loaded')
    return
  }

  const runMessageSchema = z.object({
    type: z.literal('run'),
    code: z.string(),
  })

  const messageSchema = z.union([runMessageSchema])

  // Override console methods to send unified 'console' messages
  console.log = function (...args) {
    const payload = args.join(' ')
    window.parent.postMessage({ type: 'console', payload, method: 'log' }, '*')
  }

  console.warn = function (...args) {
    const payload = args.join(' ')
    window.parent.postMessage({ type: 'console', payload, method: 'warn' }, '*')
  }

  console.error = function (...args) {
    const payload = args.join(' ')
    window.parent.postMessage({ type: 'console', payload, method: 'error' }, '*')
  }

  window.addEventListener('message', (event) => {
    try {
      const message = messageSchema.parse(event.data)
      if (message.type === 'run') {
        try {
          const result = eval(message.code)
          window.parent.postMessage(
            { type: 'result', value: String(result || '') },
            '*'
          )
        } catch (error) {
          window.parent.postMessage(
            { type: 'error', message: error.message, stack: error.stack },
            '*'
          )
        }
      }
    } catch (error) {
      window.parent.postMessage(
        { type: 'schemaError', issues: error.message },
        '*'
      )
    }
  })
}