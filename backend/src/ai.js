const OpenAI = require('openai');

class MiahAI {
  constructor(
    apiKey = process.env.HF_TOKEN,
    model = process.env.HF_MODEL || 'openai/gpt-oss-20b:groq'
  ) {
    this.model = model;

    this.client = apiKey
      ? new OpenAI({
          baseURL: 'https://router.huggingface.co/v1',
          apiKey,
        })
      : null;
  }

  async respond(message, context = []) {
    if (!this.client) {
      return "Miah's AI service is not configured. Add HF_TOKEN to Render.";
    }

    const messages = [
      {
        role: 'system',
        content: `
You are Miah, a personal AI assistant built by the user.

Your personality:
- Friendly
- Natural
- Helpful
- Intelligent
- Conversational
- Patient
- Clear

Conversation behavior:
- Understand previous messages.
- Understand follow-up questions.
- Use the conversation history when answering.
- Do not unnecessarily repeat yourself.
- Give useful answers.
- Adapt your explanation to the user's level.
- Be honest when you do not know something.
- Do not pretend to be ChatGPT.
- Your name is Miah.
        `.trim(),
      },

      ...context
        .filter(
          (entry) =>
            entry &&
            (entry.role === 'user' ||
              entry.role === 'assistant') &&
            typeof entry.content === 'string'
        )
        .map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),

      {
        role: 'user',
        content: message,
      },
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      return (
        response?.choices?.[0]?.message?.content?.trim() ||
        "I couldn't generate a response right now."
      );
    } catch (error) {
      console.error('Hugging Face AI error:', error);

      if (error?.status === 401) {
        return "Miah's Hugging Face token is invalid. Check HF_TOKEN in Render.";
      }

      if (error?.status === 403) {
        return "Miah's Hugging Face token does not have permission to use Inference Providers.";
      }

      if (error?.status === 404) {
        return `The model "${this.model}" was not found. Check HF_MODEL in Render.`;
      }

      if (error?.status === 429) {
        return "Miah has reached the available inference limit for now.";
      }

      return "Miah couldn't reach the AI service right now.";
    }
  }
}

module.exports = { MiahAI };
