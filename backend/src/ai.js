const OpenAI = require('openai');

class AnnAI {
  constructor(apiKey, model = 'gpt-4o-mini') {
    this.model = model;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async respond(message, context = []) {
    if (!this.client) {
      return null;
    }

    const messages = [
      {
        role: 'system',
        content: `You are ANN, an AI assistant. Keep responses short, friendly, and helpful. You can manage chats, tools, games, and memory.`,
      },
      ...context.map((entry) => ({
        role: 'user',
        content: entry,
      })),
      { role: 'user', content: message },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 250,
    });

    return response.choices?.[0]?.message?.content?.trim() || null;
  }
}

module.exports = { AnnAI };
