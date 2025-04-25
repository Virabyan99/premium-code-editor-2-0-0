"use client";

import { useRef, useEffect, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import ConsoleOutput from '@/components/ConsoleOutput';
import ConnectionBanner from '@/components/ConnectionBanner';
import ModalDialog from '@/components/ModalDialog';
import { messageSchema } from '@/lib/messageSchemas';
import { parse } from '@babel/parser';
import { retry } from '@/lib/retry';
import { useStore } from '@/lib/store';
import { getSnippets, getConsoleLogs, saveConsoleLog, db } from '@/lib/db';
import { debounce } from 'lodash';
import { Button } from '@/components/ui/button';

export default function Home() {
  const {
    code,
    setCode,
    consoleMessages,
    addConsoleMessage,
    setConsoleMessages,
    isConnected,
    setIsConnected,
    connectionError,
    setConnectionError,
    failedAttempts,
    incrementFailedAttempts,
    resetFailedAttempts,
    snippets,
    setSnippets,
    shouldRunCode,
    setShouldRunCode,
    clearConsoleLogs,
    addTimer,
    removeTimer,
    addDialog,
  } = useStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timers = useRef(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [showStopButton, setShowStopButton] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const savedSnippets = await getSnippets();
      setSnippets(savedSnippets);
      const savedLogs = await getConsoleLogs();
      setConsoleMessages(
        savedLogs.map((log) => {
          try {
            const parsed = JSON.parse(log.message);
            if (typeof parsed === 'object' && parsed.message !== undefined && parsed.type) {
              return {
                id: String(log.timestamp),
                message: parsed.message,
                type: parsed.type,
                groupDepth: parsed.groupDepth || 0,
              };
            } else {
              return {
                id: String(log.timestamp),
                message: String(log.message),
                type: 'log',
                groupDepth: 0,
              };
            }
          } catch {
            return {
              id: String(log.timestamp),
              message: String(log.message),
              type: 'log',
              groupDepth: 0,
            };
          }
        }).filter(entry => entry.type !== 'groupEnd')
      );
      if (savedSnippets.length > 0) {
        setCode(savedSnippets[0].code);
      }
    };
    loadData();
  }, [setSnippets, setConsoleMessages, setCode]);

  const autoSave = debounce(async (code: string) => {
    const updatedSnippets = await getSnippets();
    const autoSavedExists = updatedSnippets.some((s) => s.name === 'Auto-Saved');
    if (!autoSavedExists && code.trim()) {
      await db.snippets.add({ code, name: 'Auto-Saved', createdAt: Date.now() });
    } else if (autoSavedExists && code.trim()) {
      const autoSavedSnippet = updatedSnippets.find((s) => s.name === 'Auto-Saved');
      if (autoSavedSnippet) {
        await db.snippets.update(autoSavedSnippet.id!, { code, createdAt: Date.now() });
      }
    }
    const refreshedSnippets = await getSnippets();
    setSnippets(refreshedSnippets);
  }, 5000);

  useEffect(() => {
    autoSave(code);
    return () => autoSave.cancel();
  }, [code]);

  useEffect(() => {
    const activeIntervals = () => Array.from(useStore.getState().timers.values()).filter(t => t.type === 'interval').length;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = messageSchema.parse(event.data);
        if (message.type === 'console') {
          addConsoleMessage(message.payload, message.method, message.groupDepth);
          if (message.method === 'clear') {
            setConsoleMessages([]);
          }
          saveConsoleLog(JSON.stringify({ message: message.payload, type: message.method, groupDepth: message.groupDepth }));
        } else if (message.type === 'result' || message.type === 'error') {
          if (message.type === 'result') {
            addConsoleMessage(message.value, 'result', 0);
            saveConsoleLog(JSON.stringify({ message: message.value, type: 'result', groupDepth: 0 }));
          } else {
            const errorMsg = `${message.message}\n${message.stack || ''}`;
            addConsoleMessage(errorMsg, 'error', 0);
            saveConsoleLog(JSON.stringify({ message: errorMsg, type: 'error', groupDepth: 0 }));
          }
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsRunning(false);
          setShowStopButton(false);
        } else if (message.type === 'schemaError') {
          addConsoleMessage(`Schema Error: ${message.issues}`, 'error', 0);
          saveConsoleLog(JSON.stringify({ message: `Schema Error: ${message.issues}`, type: 'error', groupDepth: 0 }));
        } else if (message.type === 'setTimeout') {
          const timerId = setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'timerCallback', id: message.id, args: message.args },
              '*'
            );
            removeTimer(message.id);
          }, message.delay);
          timers.current.set(message.id, timerId);
          addTimer(message.id, 'timeout');
        } else if (message.type === 'clearTimeout') {
          const timerId = timers.current.get(message.id);
          if (timerId !== undefined) {
            clearTimeout(timerId);
            timers.current.delete(message.id);
            removeTimer(message.id);
          }
        } else if (message.type === 'setInterval') {
          if (activeIntervals() >= 10) {
            addConsoleMessage('Maximum number of intervals (10) reached', 'error', 0);
            saveConsoleLog(JSON.stringify({ message: 'Maximum number of intervals (10) reached', type: 'error', groupDepth: 0 }));
            return;
          }
          const intervalId = setInterval(() => {
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'timerCallback', id: message.id, args: message.args },
              '*'
            );
          }, message.delay);
          timers.current.set(message.id, intervalId);
          addTimer(message.id, 'interval');
        } else if (message.type === 'clearInterval') {
          const intervalId = timers.current.get(message.id);
          if (intervalId !== undefined) {
            clearInterval(intervalId);
            timers.current.delete(message.id);
            removeTimer(message.id);
          }
        } else if (message.type === 'dialogRequest') {
          addDialog({
            id: message.id,
            dialogType: message.dialogType,
            message: message.message,
            defaultValue: message.defaultValue,
          });
        }
      } catch (error) {
        const msg = `Validation Error: ${error instanceof Error ? error.message : String(error)}`;
        addConsoleMessage(msg, 'error', 0);
        saveConsoleLog(JSON.stringify({ message: msg, type: 'error', groupDepth: 0 }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addConsoleMessage, setConsoleMessages, addTimer, removeTimer, addDialog]);

  const runCode = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        parse(code, { sourceType: 'module', errorRecovery: true });
        setConsoleMessages([]);
        setIsRunning(true);
        setShowStopButton(false);
        timeoutRef.current = setTimeout(() => {
          if (isRunning) {
            setShowStopButton(true);
          }
        }, 2000);
        retry(() => {
          return new Promise((resolve) => {
            iframe.contentWindow!.postMessage({ type: 'run', code }, '*');
            setTimeout(() => resolve(true), 100);
          });
        })
          .then(() => {
            setIsConnected(true);
            setConnectionError(null);
            resetFailedAttempts();
          })
          .catch((error) => {
            setIsConnected(false);
            setConnectionError(error.message);
            incrementFailedAttempts();
            addConsoleMessage(error.message, 'error', 0);
            saveConsoleLog(JSON.stringify({ message: `Connection Error: ${error.message}`, type: 'error', groupDepth: 0 }));
            setIsRunning(false);
            setShowStopButton(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          });
      } catch (error) {
        const msg = `Syntax Error: ${error instanceof Error ? error.message : String(error)}`;
        addConsoleMessage(msg, 'error', 0);
        saveConsoleLog(JSON.stringify({ message: msg, type: 'error', groupDepth: 0 }));
        setIsRunning(false);
        setShowStopButton(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    }
  };

  useEffect(() => {
    if (shouldRunCode) {
      runCode();
      setShouldRunCode(false);
    }
  }, [shouldRunCode]);

  const stopExecution = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/sandbox.html';
      setIsRunning(false);
      setShowStopButton(false);
      addConsoleMessage('Execution stopped by user', 'error', 0);
      saveConsoleLog(JSON.stringify({ message: 'Execution stopped by user', type: 'error', groupDepth: 0 }));
      timers.current.forEach((timerId) => {
        if (typeof timerId === 'number') {
          clearTimeout(timerId);
        } else {
          clearInterval(timerId);
        }
      });
      timers.current = new Map();
      useStore.setState({ timers: new Map() });
    }
  };

  const reconnect = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/sandbox.html';
      setIsConnected(true);
      setConnectionError(null);
      resetFailedAttempts();
      timers.current.forEach((timerId) => clearTimeout(timerId));
      timers.current = new Map();
      useStore.setState({ timers: new Map() });
      setTimeout(() => runCode(), 500);
    }
  };

  return (
    <div className="flex flex-col h-[90%]">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 p-2">
          {failedAttempts >= 3 && (
            <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <p>Repeated connection failures. Please reload the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-1 bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
              >
                Reload
              </button>
            </div>
          )}
          <ConnectionBanner error={connectionError} onRetry={runCode} onReconnect={reconnect} />
          <CodeEditor value={code} onChange={setCode} />
        </div>
        <div className="w-1/2 p-2">
          {showStopButton && (
            <Button onClick={stopExecution} className="mb-2 bg-red-500 hover:bg-red-600 text-white">
              Stop Execution
            </Button>
          )}
          <ConsoleOutput messages={consoleMessages} onClear={clearConsoleLogs} />
          <ModalDialog iframeRef={iframeRef} />
        </div>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        src="/sandbox.html"
        style={{ display: 'none' }}
        title="Code Sandbox"
      />
    </div>
  );
}