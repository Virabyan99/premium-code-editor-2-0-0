import React from 'react';

interface ConsoleOutputProps {
  messages: string[];
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ messages }) => {
  return (
    <div className="mt-2 p-2 bg-gray-100 border rounded h-32 overflow-auto">
      {messages.length === 0 && <p className="text-gray-500">No output</p>}
      {messages.map((msg, index) => (
        <p key={index} className="text-sm">
          {msg}
        </p>
      ))}
    </div>
  );
};

export default ConsoleOutput;