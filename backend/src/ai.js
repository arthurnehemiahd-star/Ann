const OpenAI = require("openai");

class MiahAI {
  constructor(apiKey, model = process.env.OPENAI_MODEL || "gpt-5") {
    this.model = model;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async respond(message, context = []) {
    if (!this.client) {
      return "Miah's AI service is not configured yet.";
    }

    const conversation = context.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    conversation.push({
      role: "user",
      content: message,
    });

    const response = await this.client.responses.create({
      model: this.model,

      instructions: `
You are Miah, a personal AI assistant.

Your personality:
- Friendly and natural.
- Helpful and intelligent.
- Conversational rather than robotic.
- Understand the context of previous messages.
- Answer follow-up questions naturally.
- Be honest when you do not know something.
- Adapt your response length to the user's question.
- Remember useful information the user explicitly asks you to remember.
- You were built by the user.
- Never claim to be ChatGPT.
- Never pretend to be another AI assistant.
      `,

      input: conversation,
      max_output_tokens: 800,
    });

    return (
      response.output_text?.trim() ||
      "Sorry, I couldn't generate a response right now."
    );
  }
}

module.exports = { MiahAI };
