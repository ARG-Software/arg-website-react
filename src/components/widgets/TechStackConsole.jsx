import { useState } from 'react';
import consoleData from '../../data/techStackConsole.json';

const INITIAL_LOG = [
  {
    command: '/help',
    type: 'help',
  },
];

export function TechStackConsole({ className = '' }) {
  const [input, setInput] = useState('');
  const [log, setLog] = useState(INITIAL_LOG);
  const [activeCommand, setActiveCommand] = useState('/help');

  const commands = consoleData.commands;
  const systemCommands = consoleData.systemCommands;
  const shortcuts = ['/help', ...Object.keys(commands), '/all', '/clear'];

  const runCommand = rawCommand => {
    const command = normalizeCommand(rawCommand);
    if (!command) return;

    if (command === '/clear') {
      setLog(INITIAL_LOG);
      setInput('');
      setActiveCommand('/help');
      return;
    }

    setLog(currentLog => [...currentLog, buildLogEntry(command, commands)]);
    setInput('');
    setActiveCommand(command);
  };

  const handleSubmit = event => {
    event.preventDefault();
    runCommand(input);
  };

  return (
    <div className={`tech-stack-console ${className}`.trim()} aria-label={consoleData.ariaLabel}>
      <div className="tech-stack-console__header">
        <span className="tech-stack-console__dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span className="tech-stack-console__path">{consoleData.path}</span>
        <span className="tech-stack-console__meta">{consoleData.meta}</span>
      </div>

      <div className="tech-stack-console__body">
        <div className="tech-stack-console__log" aria-live="polite">
          <div className="tech-stack-console__response tech-stack-console__response--intro">
            <span className="tech-stack-console__caption">{consoleData.intro.caption}</span>
            <p>{consoleData.intro.text}</p>
          </div>
          {log.map((entry, index) => (
            <ConsoleEntry
              key={`${entry.command}-${index}`}
              entry={entry}
              commands={commands}
              prompt={consoleData.prompt}
              systemCommands={systemCommands}
            />
          ))}
        </div>

        <div className="tech-stack-console__shortcuts" aria-label="Console shortcuts">
          <span>{consoleData.shortcutLabel}</span>
          {shortcuts.map(command => (
            <button
              key={command}
              type="button"
              className={activeCommand === command ? 'is-active' : ''}
              onClick={() => runCommand(command)}
            >
              {command}
            </button>
          ))}
        </div>

        <form className="tech-stack-console__input-row" onSubmit={handleSubmit}>
          <span>{consoleData.prompt}</span>
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
    </div>
  );
}

function ConsoleEntry({ entry, commands, prompt, systemCommands }) {
  return (
    <div className="tech-stack-console__entry">
      <div className="tech-stack-console__prompt">
        <span>{prompt}</span>
        <strong>{entry.command}</strong>
      </div>
      {renderResponse(entry, commands, systemCommands)}
    </div>
  );
}

function renderResponse(entry, commands, systemCommands) {
  if (entry.type === 'help') {
    return (
      <div className="tech-stack-console__response">
        <span className="tech-stack-console__caption">available commands</span>
        <div className="tech-stack-console__help">
          {Object.entries(commands).map(([command, definition]) => (
            <span key={command}>
              <b>{command}</b>
              <i>{definition.label}</i>
            </span>
          ))}
          {Object.entries(systemCommands).map(([command, label]) => (
            <span key={command}>
              <b>{command}</b>
              <i>{label}</i>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (entry.type === 'unknown') {
    return (
      <div className="tech-stack-console__response">
        <span className="tech-stack-console__caption tech-stack-console__caption--warning">
          command not found
        </span>
        <p>Try /help for the list of commands.</p>
      </div>
    );
  }

  return (
    <div className="tech-stack-console__response">
      <span className="tech-stack-console__caption">{entry.label}</span>
      <div className="tech-stack-console__chips">
        {entry.items.map(item => (
          <span key={item} className={entry.highlighted.includes(item) ? 'is-highlighted' : ''}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildLogEntry(command, commands) {
  if (command === '/help') return { command, type: 'help' };
  if (command === '/all') {
    return {
      command,
      label: 'Every category at once',
      items: Object.values(commands).flatMap(definition => definition.items),
      highlighted: Object.values(commands).flatMap(definition => definition.highlighted),
    };
  }

  const definition = commands[command];
  if (!definition) return { command, type: 'unknown' };

  return {
    command,
    ...definition,
  };
}

function normalizeCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();
  if (!command) return '';
  return command.startsWith('/') ? command : `/${command}`;
}
