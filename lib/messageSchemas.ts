import { z } from 'zod'

export type RunMessage = { type: 'run'; code: string }
export type ConsoleMessage = { type: 'console'; payload: string }
export type ConsoleLogMessage = { type: 'consoleLog'; payload: string }
export type ConsoleWarnMessage = { type: 'consoleWarn'; payload: string }
export type ConsoleErrorMessage = { type: 'consoleError'; payload: string }
export type SchemaErrorMessage = { type: 'schemaError'; issues: string }

export type Message =
  | RunMessage
  | ConsoleMessage
  | ConsoleLogMessage
  | ConsoleWarnMessage
  | ConsoleErrorMessage
  | SchemaErrorMessage

const runMessageSchema = z.object({
  type: z.literal('run'),
  code: z.string(),
})

const consoleMessageSchema = z.object({
  type: z.literal('console'),
  payload: z.string(),
})

const consoleLogMessageSchema = z.object({
  type: z.literal('consoleLog'),
  payload: z.string(),
})

const consoleWarnMessageSchema = z.object({
  type: z.literal('consoleWarn'),
  payload: z.string(),
})

const consoleErrorMessageSchema = z.object({
  type: z.literal('consoleError'),
  payload: z.string(),
})

const schemaErrorMessageSchema = z.object({
  type: z.literal('schemaError'),
  issues: z.string(),
})

export const messageSchema = z.union([
  runMessageSchema,
  consoleMessageSchema,
  consoleLogMessageSchema,
  consoleWarnMessageSchema,
  consoleErrorMessageSchema,
  schemaErrorMessageSchema,
])