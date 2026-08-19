import { useEffect, useRef, useState } from 'react';

const OVERVIEW_EXCLUDED_COMMANDS = new Set(['/all', '/principles']);

const STACK_GROUP_LABELS = {
  '/ai': 'AI',
  '/backend': 'Backend',
  '/databases': 'Data',
  '/frontend': 'Frontend',
  '/infra': 'Infrastructure',
  '/languages': 'Languages',
  '/observe': 'Observability',
  '/testing': 'Testing',
};

const EMPTY_INITIAL_COMMANDS = [];

export function InteractiveConsole({
  className = '',
  data,
  initialCommands = EMPTY_INITIAL_COMMANDS,
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
  tone = 'dark',
}) {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState(() =>
    initialCommands.map(command => buildEntry(command, data))
  );
  const inputRef = useRef(null);
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

    setEntries(currentEntries => [...currentEntries, buildEntry(command, data)]);
    setInput('');
  };

  const handleSubmit = event => {
    event.preventDefault();
    runCommand(input);
  };

  const handleConsoleClick = () => {
    inputRef.current?.focus();
  };

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      className={`interactive-console interactive-console--${tone} ${className}`.trim()}
      aria-label={data.ariaLabel}
      onClick={handleConsoleClick}
      {...animationAttrs}
    >
      <div className="interactive-console__header">
        <span className="interactive-console__dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span className="interactive-console__path">{data.path}</span>
        <span className="interactive-console__meta">{data.meta}</span>
      </div>

      <div className="interactive-console__screen" ref={logRef} aria-live="polite">
        {entries.map((entry, index) => (
          <ConsoleEntry key={`${entry.command}-${index}`} entry={entry} data={data} />
        ))}
      </div>

      <form className="interactive-console__input-row" onSubmit={handleSubmit}>
        <span className="interactive-console__prompt">{data.prompt}</span>
        <div className="interactive-console__input-field">
          {!input && <span className="interactive-console__cursor" aria-hidden="true" />}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder={data.inputPlaceholder}
            spellCheck="false"
            autoCapitalize="off"
            aria-label="Run console command"
          />
        </div>
      </form>
    </div>
  );
}

function ConsoleEntry({ entry, data }) {
  return (
    <div className="interactive-console__entry">
      <div className="interactive-console__command-line">
        <span className="interactive-console__prompt">{data.prompt}</span>
        <span>{entry.command}</span>
      </div>
      {renderOutput(entry, data)}
    </div>
  );
}

function renderOutput(entry, data) {
  if (entry.type === 'help') {
    return (
      <ul className="interactive-console__command-list">
        {Object.entries(data.commands).map(([command, definition]) => (
          <li key={command}>
            <code>{command}</code>
            <span>{definition.description}</span>
          </li>
        ))}
        {Object.entries(data.systemCommands).map(([command, description]) => (
          <li key={command}>
            <code>{command}</code>
            <span>{description}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (entry.type === 'unknown') {
    return <p className="interactive-console__error">command not found: try /help</p>;
  }

  if (entry.groups) {
    return (
      <div className="interactive-console__stack-grid">
        {entry.groups.map(group => (
          <section key={group.label} className="interactive-console__stack-group">
            <h4>{group.label}</h4>
            <div className="interactive-console__stack-tags">
              {group.lines.map(line => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul className="interactive-console__output-list">
      {entry.lines.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function buildEntry(rawCommand, data) {
  const command = normalizeCommand(rawCommand);
  if (command === '/help') return { command, type: 'help' };
  if (command === '/all') return { command, groups: buildStackGroups(data) };

  const definition = data.commands[command];
  if (!definition) return { command, type: 'unknown' };

  return {
    command,
    lines: definition.lines,
    type: 'output',
  };
}

function buildStackGroups(data) {
  return Object.entries(data.commands)
    .filter(([command, definition]) => {
      return !OVERVIEW_EXCLUDED_COMMANDS.has(command) && Array.isArray(definition.lines);
    })
    .map(([command, definition]) => ({
      label: STACK_GROUP_LABELS[command] || formatCommandLabel(command),
      lines: definition.lines,
    }));
}

function formatCommandLabel(command) {
  return command
    .replace(/^\//, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();
  if (!command) return '';
  return command.startsWith('/') ? command : `/${command}`;
}
