import { z } from 'zod';

export type RunMessage = { type: 'run'; code: string };
export type ConsoleMessage = {
  type: 'console';
  payload: string | { headers: string[]; rows: any[][] } | { label: string; duration: number };
  method: 'log' | 'warn' | 'error' | 'table' | 'group' | 'groupEnd' | 'time' | 'timeEnd' | 'clear';
  groupDepth: number;
};
export type SchemaErrorMessage = { type: 'schemaError'; issues: string };
export type ResultMessage = { type: 'result'; value: string };
export type ErrorMessage = { type: 'error'; message: string; stack?: string };

export type Message =
  | RunMessage
  | ConsoleMessage
  | SchemaErrorMessage
  | ResultMessage
  | ErrorMessage;

const runMessageSchema = z.object({
  type: z.literal('run'),
  code: z.string(),
});

const consoleMessageSchema = z.object({
  type: z.literal('console'),
  payload: z.union([
    z.string(),
    z.object({ headers: z.array(z.string()), rows: z.array(z.array(z.any())) }),
    z.object({ label: z.string(), duration: z.number() }),
  ]),
  method: z.enum(['log', 'warn', 'error', 'table', 'group', 'groupEnd', 'time', 'timeEnd', 'clear']),
  groupDepth: z.number(),
});

const schemaErrorMessageSchema = z.object({
  type: z.literal('schemaError'),
  issues: z.string(),
});

const resultMessageSchema = z.object({
  type: z.literal('result'),
  value: z.string(),
});

const errorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  stack: z.string().optional(),
});

export const messageSchema = z.union([
  runMessageSchema,
  consoleMessageSchema,
  schemaErrorMessageSchema,
  resultMessageSchema,
  errorMessageSchema,
]);