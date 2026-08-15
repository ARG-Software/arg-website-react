import { InteractiveConsole } from './InteractiveConsole.jsx';

const CONSOLE_DATA = {
  ariaLabel: 'Interactive product console',
  path: 'product@console ~ /features.sh',
  meta: 'interactive command browser',
  prompt: 'product:~$',
  inputPlaceholder: 'type /help to check the commands',
  commands: {
    '/all': { description: 'show all available command categories' },
    '/overview': {
      description: 'shows the product overview',
      lines: ['Composable UI', 'Accessible defaults', 'Design-token friendly'],
    },
    '/channels': {
      description: 'shows supported communication channels',
      lines: ['In-app', 'Email', 'Webhook', 'Analytics stream'],
    },
    '/controls': {
      description: 'shows interaction controls',
      lines: ['Keyboard commands', 'Quick actions', 'Progressive disclosure'],
    },
    '/integrations': {
      description: 'shows integration surfaces',
      lines: ['REST API', 'SDK hooks', 'Event payloads', 'Embeddable widgets'],
    },
    '/principles': {
      description: 'shows the operating principles behind the interface',
      lines: ['Clear states', 'Fast feedback', 'Recoverable actions', 'Plain language'],
    },
  },
  systemCommands: {
    '/help': 'lists available commands',
    '/clear': 'clears the shell output',
  },
};

const meta = {
  title: 'Widgets/InteractiveConsole',
  component: InteractiveConsole,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'ARG dark' },
  },
  decorators: [
    Story => (
      <main className="storybook-showcase storybook-showcase--center">
        <section className="storybook-frame storybook-frame--md storybook-section">
          <div className="storybook-section__head">
            <p className="storybook-eyebrow">Interactive console</p>
            <h1 className="storybook-title storybook-title--sm">Command-driven product browser.</h1>
          </div>
          <Story />
        </section>
      </main>
    ),
  ],
  args: {
    data: CONSOLE_DATA,
  },
};

export default meta;

export const Empty = {};

export const Help = {
  args: {
    initialCommands: ['/help'],
  },
};

export const AllStacks = {
  args: {
    initialCommands: ['/all'],
  },
};

export const Light = {
  args: {
    initialCommands: ['/overview'],
    tone: 'light',
  },
  parameters: {
    backgrounds: { default: 'White' },
  },
  decorators: [
    Story => (
      <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
        <section className="storybook-frame storybook-frame--md storybook-section">
          <div className="storybook-section__head">
            <p className="storybook-eyebrow">Interactive console</p>
            <h1 className="storybook-title storybook-title--sm">Light command surface.</h1>
          </div>
          <Story />
        </section>
      </main>
    ),
  ],
};

export const UnknownCommand = {
  args: {
    initialCommands: ['/react'],
  },
};
