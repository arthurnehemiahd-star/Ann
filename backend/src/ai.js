const OpenAI = require("openai");

class MiahAI {
  constructor(
    apiKey = process.env.HF_TOKEN,
    model = process.env.HF_MODEL || "openai/gpt-oss-20b:groq"
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
      return "Miah's AI service is not configured yet.";
    }

    const messages = [
      {
        role: "system",
        content: `
You are Miah, a personal AI assistant built by the user.

Your personality:
- Friendly
- Natural
- Intelligent
- Helpful
- Patient
- Conversational

Conversation behavior:
- Understand the conversation history.
- Understand follow-up questions.
- Do not unnecessarily repeat yourself.
- Give clear explanations.
- Adapt explanations to the user's level.
- Be honest when you do not know something.
- Your name is Miah.
- Never claim to be ChatGPT.
- Never pretend to be another assistant.
- You were built by the user.
        `.trim(),
      },

      ...context
        .filter(
          (item) =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim()
        )
        .map((item) => ({
          role: item.role,
          content: item.content,
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
          temperature: 0.7,
          max_tokens: 1000,
        });

      return (
        response?.choices?.[0]?.message?.content?.trim() ||
        "I couldn't generate a response right now."
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
        return "Miah has reached the available inference limit for now.";
      }

      if (error?.status === 404) {
        return `The model "${this.model}" was not found. Check HF_MODEL in Render.`;
      }

      return "Miah couldn't reach the AI service right now.";
    }
  }
}

module.exports = { MiahAI };
