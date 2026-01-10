/**
 * Setup Authentication Script
 *
 * Configures Droid CLI authentication for Docker container startup
 * Creates ~/.factory/config.json with GLM Coding Plan configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function setupAuth(): void {
  // Get environment variables
  const factoryApiKey = process.env.FACTORY_API_KEY;
  const zaiApiKey = process.env.ZAI_API_KEY;
  const droidModel = process.env.DROID_MODEL || 'glm-4.7';

  // Skip if no API keys provided
  if (!factoryApiKey && !zaiApiKey) {
    console.log('⏭️  Skipping Droid auth setup - no API keys provided');
    console.log('   Set FACTORY_API_KEY or ZAI_API_KEY in environment');
    return;
  }

  console.log('🔐 Setting up Droid authentication...');

  // Determine Factory home directory
  const factoryHome = path.join(os.homedir(), '.factory');
  const configPath = path.join(factoryHome, 'config.json');

  // Create directory if it doesn't exist
  if (!fs.existsSync(factoryHome)) {
    fs.mkdirSync(factoryHome, { recursive: true });
    console.log(`✅ Created directory: ${factoryHome}`);
  }

  // Build config object
  const config: Record<string, unknown> = {};

  // Add custom models if ZAI_API_KEY is provided (GLM Coding Plan)
  if (zaiApiKey) {
    config.custom_models = [
      {
        model_display_name: 'GLM-4.7 [Z.AI Coding Plan]',
        model: droidModel,
        base_url: 'https://api.z.ai/api/coding/paas/v4',
        api_key: zaiApiKey,
        provider: 'generic-chat-completion-api',
        max_tokens: 131072,
      },
    ];
    console.log(`✅ Configured GLM Coding Plan with model: ${droidModel}`);
  }

  // Write config file
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Successfully created config at: ${configPath}`);
  } catch (error) {
    console.error(`❌ Failed to write config: ${error}`);
    return;
  }

  console.log('✅ Droid authentication setup complete');
  
  if (factoryApiKey) {
    console.log('   Using FACTORY_API_KEY for authentication');
  }
  if (zaiApiKey) {
    console.log('   Using ZAI_API_KEY for GLM Coding Plan');
  }
}

// Run setup
setupAuth();
