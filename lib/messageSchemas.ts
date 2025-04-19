import { z } from 'zod';

export type RunMessage = { type: 'run'; code: string };
export type ConsoleMessage = { type: 'console'; payload: string };
export type SchemaErrorMessage = { type: 'schemaError'; issues: string };
export type ResetToDefaultMessage = { type: 'resetToDefault' };
export type Message = RunMessage | ConsoleMessage | SchemaErrorMessage | ResetToDefaultMessage;

const runMessageSchema = z.object({
  type: z.literal('run'),
  code: z.string(),
});

const consoleMessageSchema = z.object({
  type: z.literal('console'),
  payload: z.string(),
});

const schemaErrorMessageSchema = z.object({
  type: z.literal('schemaError'),
  issues: z.string(),
});

const resetToDefaultMessageSchema = z.object({
  type: z.literal('resetToDefault'),
});

export const messageSchema = z.union([
  runMessageSchema,
  consoleMessageSchema,
  schemaErrorMessageSchema,
  resetToDefaultMessageSchema,
]);