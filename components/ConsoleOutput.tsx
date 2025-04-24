import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconTrash, IconCopy } from '@tabler/icons-react';
import { useStore } from '@/lib/store';

const ConsoleOutput = () => {
  const { consoleMessages, collapsedGroups, toggleGroupCollapse, clearConsoleLogs, timers } = useStore();
  const consoleRef = useRef(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const filteredMessages = showErrorsOnly
    ? consoleMessages.filter((entry) => entry.type === 'error')
    : consoleMessages;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const isInsideCollapsedGroup = (entryIndex) => {
    let depth = 0;
    for (let i = entryIndex; i >= 0; i--) {
      if (consoleMessages[i].type === 'group') {
        depth++;
        if (collapsedGroups.has(consoleMessages[i].id)) {
          return depth;
        }
      } else if (consoleMessages[i].type === 'groupEnd') {
        depth--;
      }
    }
    return 0;
  };

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  return (
    <div ref={consoleRef} className="relative h-full p-2 bg-gray-100 dark:bg-gray-800 border rounded overflow-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="p-1 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded">
          Active Timers: {timers.size}
        </span>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={showErrorsOnly}
              onChange={(e) => setShowErrorsOnly(e.target.checked)}
              className="form-checkbox"
            />
            <span>Errors Only</span>
          </label>
          <Button onClick={clearConsoleLogs} variant="ghost" size="sm">
            <IconTrash size={16} />
          </Button>
        </div>
      </div>
      {filteredMessages.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Console output will appear here...</p>
      )}
      {filteredMessages.map((entry, index) => {
        if (entry.type === 'groupEnd') return null;

        const collapsedDepth = isInsideCollapsedGroup(index);
        if (collapsedDepth > 0 && entry.type !== 'group') {
          return null;
        }

        const indent = entry.groupDepth * 10;

        return (
          <div key={entry.id} className="text-sm mb-1 flex items-start">
            <div style={{ paddingLeft: `${indent}px` }} className="flex-1">
              {entry.type === 'table' && typeof entry.message !== 'string' && (
                <table className="border-collapse border border-gray-300 w-full">
                  <thead>
                    <tr>
                      {entry.message.headers.map((header, i) => (
                        <th key={i} className="border border-gray-300 p-1">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entry.message.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gray-300 p-1">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {entry.type === 'group' && (
                <div className="cursor-pointer flex items-center" onClick={() => toggleGroupCollapse(entry.id)}>
                  <span className="mr-2">{collapsedGroups.has(entry.id) ? '▶' : '▼'}</span>
                  <pre className="whitespace-pre-wrap text-blue-600">
                    {typeof entry.message === 'string' ? entry.message : ''}
                  </pre>
                </div>
              )}
              {entry.type === 'info' && (
                <pre className="whitespace-pre-wrap text-blue-600">{typeof entry.message === 'string' ? entry.message : ''}</pre>
              )}
              {entry.type === 'debug' && (
                <pre className="whitespace-pre-wrap text-gray-600">{typeof entry.message === 'string' ? entry.message : ''}</pre>
              )}
              {entry.type === 'trace' && (
                <pre className="whitespace-pre-wrap text-purple-600">{typeof entry.message === 'string' ? entry.message : ''}</pre>
              )}
              {entry.type === 'assert' && (
                <pre className="whitespace-pre-wrap text-red-600">{typeof entry.message === 'string' ? entry.message : ''}</pre>
              )}
              {entry.type === 'count' && typeof entry.message !== 'string' && (
                <pre className="whitespace-pre-wrap text-green-700">
                  {entry.message.label}: {entry.message.count}
                </pre>
              )}
              {(entry.type === 'log' || entry.type === 'warn' || entry.type === 'error') && (
                <pre
                  className={`whitespace-pre-wrap ${
                    entry.type === 'error'
                      ? 'text-red-600'
                      : entry.type === 'warn'
                      ? 'text-yellow-600'
                      : 'text-black dark:text-white'
                  }`}
                >
                  {typeof entry.message === 'string' ? entry.message : ''}
                </pre>
              )}
              {entry.type === 'time' && (
                <pre className="whitespace-pre-wrap text-gray-600">
                  Timer "{typeof entry.message === 'string' ? entry.message : ''}" started
                </pre>
              )}
              {entry.type === 'timeEnd' && typeof entry.message !== 'string' && (
                <pre className="whitespace-pre-wrap text-gray-600">
                  Timer "{entry.message.label}" ended: {entry.message.duration.toFixed(2)}ms
                </pre>
              )}
              {entry.type === 'result' && (
                <pre className="whitespace-pre-wrap text-green-600">
                  {typeof entry.message === 'string' ? entry.message : ''}
                </pre>
              )}
            </div>
            {(entry.type === 'error' || (typeof entry.message === 'string' && entry.message.includes('Syntax Error'))) && (
              <Button
                onClick={() => copyToClipboard(typeof entry.message === 'string' ? entry.message : '')}
                size="sm"
                variant="secondary"
                className="ml-2"
              >
                <IconCopy size={16} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConsoleOutput;