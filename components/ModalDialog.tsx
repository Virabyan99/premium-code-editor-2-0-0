import React, { useState } from 'react';
import { useStore } from '@/lib/store';

const ModalDialog = ({ iframeRef }) => { // Add iframeRef as a prop
  const { dialogs, removeDialog } = useStore();
  const [promptValue, setPromptValue] = useState('');

  const currentDialog = dialogs[0];

  const handleResponse = (value: string | boolean | null) => {
    if (currentDialog && iframeRef.current) {
      iframeRef.current.contentWindow.postMessage( // Send to iframe's contentWindow
        { type: 'dialogResponse', id: currentDialog.id, value },
        '*'
      );
      removeDialog(currentDialog.id);
      setPromptValue('');
    }
  };

  if (!currentDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
        <p className="mb-4">{currentDialog.message}</p>
        {currentDialog.dialogType === 'prompt' && (
          <input
            type="text"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            autoFocus
          />
        )}
        <div className="flex justify-end space-x-2">
          {currentDialog.dialogType === 'alert' && (
            <button
              onClick={() => handleResponse(null)}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              OK
            </button>
          )}
          {currentDialog.dialogType === 'confirm' && (
            <>
              <button
                onClick={() => handleResponse(true)}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                OK
              </button>
              <button
                onClick={() => handleResponse(false)}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Cancel
              </button>
            </>
          )}
          {currentDialog.dialogType === 'prompt' && (
            <>
              <button
                onClick={() => handleResponse(promptValue)}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                OK
              </button>
              <button
                onClick={() => handleResponse(null)}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDialog;