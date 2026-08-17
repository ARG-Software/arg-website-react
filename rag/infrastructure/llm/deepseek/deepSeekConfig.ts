import { getRequiredEnv } from '../../../config/env.js';

export interface DeepSeekConfig {
  apiKey: string;
  model: string;
}

export function getDeepSeekConfig(): DeepSeekConfig {
  return {
    apiKey: getRequiredEnv('AI_MODEL_API_KEY'),
    model: getRequiredEnv('AI_MODEL'),
  };
}
