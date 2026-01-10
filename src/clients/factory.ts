/**
 * AI Assistant Client Factory
 *
 * Dynamically instantiates the appropriate AI assistant client based on type string.
 * Supports Droid (Factory) assistant only.
 */
import { IAssistantClient } from '../types';
import { DroidClient } from './droid';

/**
 * Get the appropriate AI assistant client based on type
 *
 * @param type - Assistant type identifier ('droid')
 * @returns Instantiated assistant client (always returns DroidClient)
 */
export function getAssistantClient(type: string): IAssistantClient {
  // Only droid is supported - log warning for legacy types but don't crash
  if (type !== 'droid') {
    console.warn(`[Factory] Unsupported assistant type '${type}', defaulting to 'droid'`);
  }
  return new DroidClient();
}
