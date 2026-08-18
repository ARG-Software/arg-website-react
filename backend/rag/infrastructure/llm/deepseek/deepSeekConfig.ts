import { getRequiredEnv, type EnvSource } from '../../../config/env.js';

export interface DeepSeekConfig {
  apiKey: string;
  model: string;
}

export function getDeepSeekConfig(env: EnvSource = process.env): DeepSeekConfig {
  return {
    apiKey: getRequiredEnv('AI_MODEL_API_KEY', env),
    model: getRequiredEnv('AI_MODEL', env),
  };
}
