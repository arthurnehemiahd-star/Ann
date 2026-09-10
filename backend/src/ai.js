const OpenAI = require("openai");

class MiahAI {
  constructor(
    apiKey = process.env.HF_TOKEN,
    model = process.env.HF_MODEL || "openai/gpt-oss-120b:groq"
  ) {
    this.model = model;

    this.client = apiKey
      ? new OpenAI({
          baseURL: "https://router.huggingface.co/v1",
          apiKey,
        })
      : null;
  }

  async respond(message, context = []) {
    if (!this.client) {
      return "Miah's AI service is not configured yet. Add HF_TOKEN to Render.";
    }

    const messages = [
      {
        role: "system",
        content: `
You are Miah, a personal AI assistant built by the user.

Your personality:
- Friendly, natural, intelligent, and helpful.
- Speak conversationally.
- Understand previous messages and follow-up questions.
- Maintain context throughout the conversation.
- Give clear explanations.
- Match the user's level of understanding.
- Do not unnecessarily repeat yourself.
- Be honest when you don't know something.
- Your name is Miah.
- Never claim to be ChatGPT.
- Never pretend to be another assistant.
- You were built by the user.
        `.trim(),
      },

      ...context
        .filter(
          (entry) =>
            entry &&
            (entry.role === "user" ||
              entry.role === "assistant") &&
            typeof entry.content === "string"
        )
        .map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),

      {
        role: "user",
        content: message,
      },
    ];

    try {
      const response =
        await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: 800,
          temperature: 0.7,
        });

      const answer =
        response?.choices?.[0]?.message?.content?.trim();

      return (
        answer ||
        "Sorry, I couldn't generate a response right now."
      );
    } catch (error) {
      console.error("Hugging Face AI error:", error);

      if (error?.status === 401) {
        return "Miah's Hugging Face token is invalid. Check HF_TOKEN in Render.";
      }

      if (error?.status === 403) {
        return "Miah's Hugging Face token does not have permission to use Inference Providers.";
      }

      if (error?.status === 429) {
        return "Miah has reached the available free inference limit for now.";
      }

      if (error?.status === 404) {
        return `The AI model "${this.model}" is unavailable. Check HF_MODEL in Render.`;
      }

      return "Miah couldn't reach the AI service right now.";
    }
  }
}

module.exports = { MiahAI };
