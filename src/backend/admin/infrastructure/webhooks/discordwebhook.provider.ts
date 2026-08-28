import type { ILogger } from '../../../shared/logger/ilogger.js';
import type { IWebhookProvider, WebhookMessage } from '../../application/ports/iwebhook.provider.js';

const DISCORD_TIMEOUT_MS = 5_000;

export class DiscordWebhookProvider implements IWebhookProvider {
  constructor(
    private readonly webhookUrl: string,
    private readonly logger?: ILogger
  ) {}

  async send(message: WebhookMessage): Promise<void> {
    if (!this.webhookUrl) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISCORD_TIMEOUT_MS);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createDiscordPayload(message)),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }
    } catch (error) {
      this.logger?.error('Discord webhook request failed', { error });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createDiscordPayload(message: WebhookMessage) {
  return {
    embeds: [
      {
        title: limit(message.title, 256),
        description: message.description ? limit(message.description, 4096) : undefined,
        url: message.url,
        color: 15_730_189,
        fields: (message.fields || []).map(field => ({
          name: limit(field.name, 256),
          value: limit(field.value, 1024),
          inline: true,
        })),
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function limit(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
