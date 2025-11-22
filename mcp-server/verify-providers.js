import { AnthropicProvider } from './src/ai/AnthropicProvider.js';
import { GeminiProvider } from './src/ai/GeminiProvider.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing AI Providers...');

// Mock config
const config = { apiKey: 'test-key' };

try {
    console.log('Initializing AnthropicProvider...');
    const anthropic = new AnthropicProvider(config);
    if (typeof anthropic.generateText === 'function') {
        console.log('✅ AnthropicProvider initialized and has generateText method');
    } else {
        console.error('❌ AnthropicProvider missing generateText method');
    }
} catch (error) {
    console.error('❌ Failed to initialize AnthropicProvider:', error);
}

try {
    console.log('Initializing GeminiProvider...');
    const gemini = new GeminiProvider(config);
    if (typeof gemini.generateText === 'function') {
        console.log('✅ GeminiProvider initialized and has generateText method');
    } else {
        console.error('❌ GeminiProvider missing generateText method');
    }

    // Test tool mapping
    const tools = [{
        name: 'test_tool',
        description: 'A test tool',
        input_schema: {
            type: 'object',
            properties: {
                param: { type: 'string' }
            }
        }
    }];

    const mappedTools = gemini.mapTools(tools);
    if (mappedTools && mappedTools[0].functionDeclarations) {
        console.log('✅ GeminiProvider tool mapping works');
    } else {
        console.error('❌ GeminiProvider tool mapping failed');
    }

} catch (error) {
    console.error('❌ Failed to initialize GeminiProvider:', error);
}
