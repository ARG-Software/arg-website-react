


import { useState } from 'react';

const COMMANDS = {
  '/languages': {
    label: 'Production languages we use daily',
    items: ['TypeScript', 'C# / .NET', 'Node', 'Python'],
    highlighted: ['TypeScript', 'C# / .NET'],
  },
  '/databases': {
    label: 'Data layer: storage, caches, and streams',
    items: ['Postgres', 'Redis', 'Kafka', 'ClickHouse', 'MongoDB'],
    highlighted: ['Postgres', 'Kafka'],
  },
  '/frontend': {
    label: 'Frontend: web and real-time UIs',
    items: ['React', 'Next.js', 'TanStack Query', 'GSAP'],
    highlighted: ['React', 'Next.js'],
  },
  '/infra': {
    label: 'Infrastructure: ship, run, rollback',
    items: ['Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'AWS'],
    highlighted: ['Kubernetes'],
  },
  '/observe': {
    label: 'Observability: know before the customer does',
    items: ['OpenTelemetry', 'Grafana', 'Sentry', 'Prometheus'],
    highlighted: ['OpenTelemetry'],
  },
  '/principles': {
    label: 'How we work, in four lines',
    items: ['architecture-first', 'no patchwork', 'gold standard', 'handoff-ready'],
    highlighted: ['architecture-first', 'no patchwork', 'gold standard'],
  },
};

const SYSTEM_COMMANDS = {
  '/help': 'Show available commands',
  '/all': 'Show every stack category',
  '/clear': 'Reset the console',
};

const SHORTCUTS = ['/help', ...Object.keys(COMMANDS), '/all', '/clear'];

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

  const runCommand = rawCommand => {
    const command = normalizeCommand(rawCommand);
    if (!command) return;

    if (command === '/clear') {
      setLog(INITIAL_LOG);
      setInput('');
      setActiveCommand('/help');
      return;
    }

    setLog(currentLog => [...currentLog, buildLogEntry(command)]);
    setInput('');
    setActiveCommand(command);
  };

  const handleSubmit = event => {
    event.preventDefault();
    runCommand(input);
  };

  return (
    <div
      className={`tech-stack-console ${className}`.trim()}
      aria-label="ARG technology stack console"
    >
      <div className="tech-stack-console__header">
        <span className="tech-stack-console__dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span className="tech-stack-console__path">arg@gold-standard ~ /stack.sh</span>
        <span className="tech-stack-console__meta">type a command or click a shortcut</span>
      </div>

      <div className="tech-stack-console__body">
        <div className="tech-stack-console__log" aria-live="polite">
          <div className="tech-stack-console__response tech-stack-console__response--intro">
            <span className="tech-stack-console__caption">arg @ gold-standard - stack browser</span>
            <p>
              No surprises, no migration roulette. Every tool here is something we have run at
              scale, on call, with someone&apos;s money on the line.
            </p>
          </div>
          {log.map((entry, index) => (
            <ConsoleEntry key={`${entry.command}-${index}`} entry={entry} />
          ))}
        </div>

        <div className="tech-stack-console__shortcuts" aria-label="Console shortcuts">
          <span>try:</span>
          {SHORTCUTS.map(command => (
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
          <span>arg@gold-standard:~$</span>
          <input
            type="text"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="/help"
            spellCheck="false"
            autoCapitalize="off"
            aria-label="Run stack console command"
          />
        </form>
      </div>
    </div>
  );
}

function ConsoleEntry({ entry }) {
  return (
    <div className="tech-stack-console__entry">
      <div className="tech-stack-console__prompt">
        <span>arg@gold-standard:~$</span>
        <strong>{entry.command}</strong>
      </div>
      {renderResponse(entry)}
    </div>
  );
}

function renderResponse(entry) {
  if (entry.type === 'help') {
    return (
      <div className="tech-stack-console__response">
        <span className="tech-stack-console__caption">available commands</span>
        <div className="tech-stack-console__help">
          {Object.entries(COMMANDS).map(([command, definition]) => (
            <span key={command}>
              <b>{command}</b>
              <i>{definition.label}</i>
            </span>
          ))}
          {Object.entries(SYSTEM_COMMANDS).map(([command, label]) => (
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

function buildLogEntry(command) {
  if (command === '/help') return { command, type: 'help' };
  if (command === '/all') {
    return {
      command,
      label: 'Every category at once',
      items: Object.values(COMMANDS).flatMap(definition => definition.items),
      highlighted: Object.values(COMMANDS).flatMap(definition => definition.highlighted),
    };
  }

  const definition = COMMANDS[command];
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
