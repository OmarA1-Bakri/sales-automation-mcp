/**
 * Abstract base class for AI providers
 */
export class AIProvider {
    constructor(config) {
        this.config = config;
    }

    /**
     * Generate text from a prompt
     * @param {string} systemPrompt - The system prompt
     * @param {string} userPrompt - The user prompt
     * @param {string} model - The model to use
     * @param {Array} tools - Optional list of tools
     * @returns {Promise<object>} - The response object { content: [], usage: {} }
     */
    async generateText(systemPrompt, userPrompt, model, tools = []) {
        throw new Error('Not implemented');
    }

    /**
     * Map generic tool definitions to provider-specific format
     * @param {Array} tools - List of generic tool definitions
     * @returns {Array} - Provider-specific tool definitions
     */
    mapTools(tools) {
        return tools;
    }
}
