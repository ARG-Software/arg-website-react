import { Chatbot } from './Chatbot.jsx';

const COPY = {
  statusText: 'Online',
  labels: {
    open: 'Open chatbot',
    dialog: 'Chatbot',
    clear: 'Clear conversation',
    expand: 'Expand',
    minimize: 'Minimize',
    close: 'Close',
    sendQuestion: 'Send question',
  },
  messages: {
    welcome: 'Hi, I am Nova. Ask me about setup, product capabilities, or next steps.',
  },
};

const ASSISTANT = {
  name: 'Nova',
  imageSrc: '/images/ai/gaspar.png',
};

const MESSAGES = [
  {
    role: 'user',
    content: 'Can I connect this assistant to product documentation?',
  },
  {
    role: 'assistant',
    content:
      'Yes. The UI supports source links, quick actions, loading states, and controlled input behavior.',
    linksLabel: 'Related links',
    links: [
      {
        node: (
          <a key="docs" className="aw-source-link" href="/docs/">
            Product docs
          </a>
        ),
      },
    ],
    actions: [
      {
        node: (
          <button key="brief" className="aw-action" type="button">
            Start setup
          </button>
        ),
      },
    ],
  },
];

const meta = {
  title: 'Widgets/Chatbot',
  component: Chatbot,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ARG dark' },
  },
  args: {
    triggerImageSrc: ASSISTANT.imageSrc,
    triggerHidden: true,
    panelState: 'open',
    isOpen: true,
    language: 'en',
    direction: 'ltr',
    copy: COPY,
    assistant: ASSISTANT,
    inputValue: '',
    inputPlaceholder: 'Ask about this product...',
    messages: MESSAGES,
    welcomePrompts: [
      { label: 'What can I configure?' },
      { label: 'How do I start?' },
      { label: 'Show integrations' },
    ],
    onOpen: () => {},
    onClose: () => {},
    onClear: () => {},
    onToggleFullscreen: () => {},
    onInputChange: () => {},
    onSubmit: event => event.preventDefault(),
    onQuickPrompt: () => {},
  },
};

export default meta;

export const Open = {};
Open.decorators = [
  Story => (
    <main className="storybook-full-panel">
      <Story />
    </main>
  ),
];

export const Loading = {
  args: {
    loading: true,
    pendingStatus: 'Searching product content...',
  },
};
Loading.decorators = [
  Story => (
    <main className="storybook-full-panel">
      <Story />
    </main>
  ),
];

export const Fullscreen = {
  args: {
    panelState: 'fullscreen',
  },
};
Fullscreen.decorators = [
  Story => (
    <main className="storybook-full-panel">
      <Story />
    </main>
  ),
];
