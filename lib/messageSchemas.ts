import { z } from 'zod';

export type RunMessage = { type: 'run'; code: string };
export type ConsoleMessage = {
  type: 'console';
  payload:
    | string
    | { headers: string[]; rows: any[][] }
    | { label: string; duration: number }
    | { label: string; count: number };
  method:
    | 'log'
    | 'warn'
    | 'error'
    | 'table'
    | 'group'
    | 'groupEnd'
    | 'time'
    | 'timeEnd'
    | 'clear'
    | 'info'
    | 'debug'
    | 'trace'
    | 'assert'
    | 'count';
  groupDepth: number;
};
export type SchemaErrorMessage = { type: 'schemaError'; issues: string };
export type ResultMessage = { type: 'result'; value: string };
export type ErrorMessage = { type: 'error'; message: string; stack?: string };
export type SetTimeoutMessage = { type: 'setTimeout'; id: string; delay: number; args: any[] };
export type ClearTimeoutMessage = { type: 'clearTimeout'; id: string };
export type SetIntervalMessage = { type: 'setInterval'; id: string; delay: number; args: any[] };
export type ClearIntervalMessage = { type: 'clearInterval'; id: string };
export type TimerCallbackMessage = { type: 'timerCallback'; id: string; args: any[] };

export type Message =
  | RunMessage
  | ConsoleMessage
  | SchemaErrorMessage
  | ResultMessage
  | ErrorMessage
  | SetTimeoutMessage
  | ClearTimeoutMessage
  | SetIntervalMessage
  | ClearIntervalMessage
  | TimerCallbackMessage;

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
    z.object({ label: z.string(), count: z.number() }),
  ]),
  method: z.enum([
    'log',
    'warn',
    'error',
    'table',
    'group',
    'groupEnd',
    'time',
    'timeEnd',
    'clear',
    'info',
    'debug',
    'trace',
    'assert',
    'count',
  ]),
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

const setTimeoutMessageSchema = z.object({
  type: z.literal('setTimeout'),
  id: z.string(),
  delay: z.number(),
  args: z.array(z.any()),
});

const clearTimeoutMessageSchema = z.object({
  type: z.literal('clearTimeout'),
  id: z.string(),
});

const setIntervalMessageSchema = z.object({
  type: z.literal('setInterval'),
  id: z.string(),
  delay: z.number(),
  args: z.array(z.any()),
});

const clearIntervalMessageSchema = z.object({
  type: z.literal('clearInterval'),
  id: z.string(),
});

const timerCallbackMessageSchema = z.object({
  type: z.literal('timerCallback'),
  id: z.string(),
  args: z.array(z.any()),
});

export const messageSchema = z.union([
  runMessageSchema,
  consoleMessageSchema,
  schemaErrorMessageSchema,
  resultMessageSchema,
  errorMessageSchema,
  setTimeoutMessageSchema,
  clearTimeoutMessageSchema,
  setIntervalMessageSchema,
  clearIntervalMessageSchema,
  timerCallbackMessageSchema,
]);