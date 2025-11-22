import { AIProvider } from './AIProvider.js';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider extends AIProvider {
    constructor(config) {
        super(config);
        this.client = new Anthropic({
            apiKey: config.apiKey,
        });
    }

    async generateText(systemPrompt, userPrompt, model, tools = []) {
        const params = {
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        };

        if (tools && tools.length > 0) {
            params.tools = tools;
        }

        const response = await this.client.messages.create(params);

        return {
            content: response.content,
            usage: response.usage,
        };
    }
}
