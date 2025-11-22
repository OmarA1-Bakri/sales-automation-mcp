import { AIProvider } from './AIProvider.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider extends AIProvider {
    constructor(config) {
        super(config);
        this.genAI = new GoogleGenerativeAI(config.apiKey);
    }

    /**
     * Map generic tool definitions to Gemini format
     */
    mapTools(tools) {
        if (!tools || tools.length === 0) return undefined;

        // Gemini expects a specific function declaration format
        const functionDeclarations = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema
        }));

        return [{ functionDeclarations }];
    }

    /**
     * Map Anthropic model names to Gemini models
     */
    mapModel(model) {
        // Map Haiku (fast) to Gemini Flash
        if (model.includes('haiku')) {
            return 'gemini-2.0-flash-exp';
        }
        // Map Sonnet (smart) to Gemini Pro/Flash (using Flash for now as it's very capable)
        if (model.includes('sonnet')) {
            return 'gemini-2.0-flash-exp'; // Or gemini-pro-1.5 if available/preferred
        }
        return 'gemini-2.0-flash-exp';
    }

    async generateText(systemPrompt, userPrompt, model, tools = []) {
        const geminiModelName = this.mapModel(model);
        const geminiTools = this.mapTools(tools);

        const modelConfig = {
            model: geminiModelName,
        };

        if (geminiTools) {
            modelConfig.tools = geminiTools;
        }

        if (systemPrompt) {
            modelConfig.systemInstruction = systemPrompt;
        }

        const generativeModel = this.genAI.getGenerativeModel(modelConfig);

        const chat = generativeModel.startChat({
            history: [],
        });

        const result = await chat.sendMessage(userPrompt);
        const response = await result.response;

        // Parse response to match Anthropic format structure for compatibility
        const content = [];

        // Check for function calls
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            functionCalls.forEach(call => {
                content.push({
                    type: 'tool_use',
                    name: call.name,
                    input: call.args,
                    // Gemini doesn't provide a tool_use_id in the same way, so we generate one or handle it
                    id: `call_${Math.random().toString(36).substr(2, 9)}`
                });
            });
        } else {
            // Regular text response
            content.push({
                type: 'text',
                text: response.text()
            });
        }

        return {
            content,
            usage: {
                input_tokens: response.usageMetadata?.promptTokenCount || 0,
                output_tokens: response.usageMetadata?.candidatesTokenCount || 0
            }
        };
    }
}
