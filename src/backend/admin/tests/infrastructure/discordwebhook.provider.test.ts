import assert from 'node:assert/strict';
import test from 'node:test';

import { DiscordWebhookProvider } from '../../infrastructure/webhooks/discordwebhook.provider.js';

test('discordWebhookProvider sends a Discord embed payload', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestBody: any = null;

  globalThis.fetch = async (url, init) => {
    requestUrl = String(url);
    requestBody = JSON.parse(String(init?.body));
    return new Response(null, { status: 204 });
  };

  try {
    const provider = new DiscordWebhookProvider('https://discord.com/api/webhooks/test/token');
    await provider.send({
      title: 'New Gaspar conversation',
      description: 'Can you help with a fintech project?',
      url: 'https://arg.software/admin/ai-bot/?conversationId=conversation-id',
      fields: [{ name: 'Page', value: '/working-with-us/' }],
    });

    assert.equal(requestUrl, 'https://discord.com/api/webhooks/test/token');
    assert.equal(requestBody.embeds[0].title, 'New Gaspar conversation');
    assert.equal(requestBody.embeds[0].description, 'Can you help with a fintech project?');
    assert.equal(
      requestBody.embeds[0].url,
      'https://arg.software/admin/ai-bot/?conversationId=conversation-id'
    );
    assert.deepEqual(requestBody.embeds[0].fields[0], {
      name: 'Page',
      value: '/working-with-us/',
      inline: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
