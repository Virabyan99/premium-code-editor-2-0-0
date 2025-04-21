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

  // Override console methods to send messages to parent
  console.log = function (...args) {
    const payload = args.join(' ')
    console.info('Sending consoleLog:', payload)
    window.parent.postMessage({ type: 'consoleLog', payload }, '*')
  }

  console.warn = function (...args) {
    const payload = args.join(' ')
    console.info('Sending consoleWarn:', payload)
    window.parent.postMessage({ type: 'consoleWarn', payload }, '*')
  }

  console.error = function (...args) {
    const payload = args.join(' ')
    console.info('Sending consoleError:', payload)
    window.parent.postMessage({ type: 'consoleError', payload }, '*')
  }

  window.addEventListener('message', (event) => {
    try {
      const message = messageSchema.parse(event.data)
      if (message.type === 'run') {
        try {
          const result = eval(message.code)
          console.info('Eval result:', result)
          window.parent.postMessage(
            { type: 'result', value: String(result || '') },
            '*'
          )
        } catch (error) {
          console.info('Eval error:', error.message)
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