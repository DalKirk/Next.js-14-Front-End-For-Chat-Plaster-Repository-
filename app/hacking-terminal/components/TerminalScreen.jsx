import React from 'react';

export const TerminalScreen = ({ 
  terminalRef, 
  history, 
  input, 
  getPrompt, 
  inputRef, 
  setInput, 
  handleInput, 
  getTypeColor 
}) => {
  return (
    <div
      ref={terminalRef}
      className="flex-1 bg-black p-6 overflow-y-auto font-mono text-sm leading-relaxed cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {history.map((entry, i) => (
        <div key={i} className={`${getTypeColor(entry.type)} whitespace-pre-wrap`}>
          {entry.text}
        </div>
      ))}

      {/* Input Line */}
      <div className="flex items-center text-green-400 mt-1">
        <span className="select-none">{getPrompt()}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInput}
          className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
          autoFocus
          spellCheck={false}
        />
        <span className="animate-pulse ml-1">▊</span>
      </div>
    </div>
  );
};
