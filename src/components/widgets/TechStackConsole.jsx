import { useEffect, useRef, useState } from 'react';
import consoleData from '../../data/techStackConsole.json';

export function TechStackConsole({
  className = '',
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
}) {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries]);

  const runCommand = rawCommand => {
    const command = normalizeCommand(rawCommand);
    if (!command) return;

    if (command === '/clear') {
      setEntries([]);
      setInput('');
      return;
    }

    setEntries(currentEntries => [...currentEntries, buildEntry(command)]);
    setInput('');
  };

  const handleSubmit = event => {
    event.preventDefault();
    runCommand(input);
  };

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      className={`tech-stack-console ${className}`.trim()}
      aria-label={consoleData.ariaLabel}
      {...animationAttrs}
    >
      <div className="tech-stack-console__header">
        <span className="tech-stack-console__dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span className="tech-stack-console__path">{consoleData.path}</span>
        <span className="tech-stack-console__meta">{consoleData.meta}</span>
      </div>

      <div className="tech-stack-console__screen" ref={logRef} aria-live="polite">
        {entries.map((entry, index) => (
          <ConsoleEntry key={`${entry.command}-${index}`} entry={entry} />
        ))}
      </div>

      <form className="tech-stack-console__input-row" onSubmit={handleSubmit}>
        <span className="tech-stack-console__prompt">{consoleData.prompt}</span>
        <input
          type="text"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder={consoleData.inputPlaceholder}
          spellCheck="false"
          autoCapitalize="off"
          aria-label="Run stack console command"
        />
      </form>
    </div>
  );
}

function ConsoleEntry({ entry }) {
  return (
    <div className="tech-stack-console__entry">
      <div className="tech-stack-console__command-line">
        <span className="tech-stack-console__prompt">{consoleData.prompt}</span>
        <span>{entry.command}</span>
      </div>
      {renderOutput(entry)}
    </div>
  );
}

function renderOutput(entry) {
  if (entry.type === 'help') {
    return (
      <ul className="tech-stack-console__command-list">
        {Object.entries(consoleData.commands).map(([command, definition]) => (
          <li key={command}>
            <code>{command}</code>
            <span>{definition.description}</span>
          </li>
        ))}
        {Object.entries(consoleData.systemCommands).map(([command, description]) => (
          <li key={command}>
            <code>{command}</code>
            <span>{description}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (entry.type === 'unknown') {
    return <p className="tech-stack-console__error">command not found: try /help</p>;
  }

  return (
    <ul className="tech-stack-console__output-list">
      {entry.lines.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function buildEntry(command) {
  if (command === '/help') return { command, type: 'help' };

  const definition = consoleData.commands[command];
  if (!definition) return { command, type: 'unknown' };

  return {
    command,
    lines: definition.lines,
    type: 'output',
  };
}

function normalizeCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();
  if (!command) return '';
  return command.startsWith('/') ? command : `/${command}`;
}
