export type WebhookField = {
  name: string;
  value: string;
};

export type WebhookMessage = {
  title: string;
  description?: string;
  url?: string;
  fields?: WebhookField[];
};

export interface IWebhookProvider {
  send(message: WebhookMessage): Promise<void>;
}
