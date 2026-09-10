const { MiahAI } = require("./ai");
const { AnnGame } = require("./game");

class MiahBot {
  constructor({ db, ai, game }) {
    this.db = db;

    this.ai =
      ai ||
      new MiahAI(
        process.env.HF_TOKEN,
        process.env.HF_MODEL || "openai/gpt-oss-20b:groq"
      );

    this.game = game || new AnnGame(db);
  }

  async getConversation(sender, limit = 20) {
    if (
      !this.db ||
      typeof this.db.getConversation !== "function"
    ) {
      return [];
    }

    const messages =
      await this.db.getConversation(sender, limit);

    return messages
      .filter(
        (message) =>
          message &&
          typeof message.text === "string" &&
          message.text.trim()
      )
      .map((message) => ({
        role:
          message.role === "assistant"
            ? "assistant"
            : "user",
        content: message.text,
      }));
  }

  async handleIncomingMessage(sender, message) {
    const text =
      String(message || "").trim();

    if (!text) {
      return "I didn't receive a message.";
    }

    const userId =
      String(sender || "web-user");

    // Keep the game functionality.
    const lower =
      text.toLowerCase();

    if (
      lower === "play" ||
      lower === "start game"
    ) {
      const reply =
        await this.game.startGame(userId);

      await this.db.saveMessage(
        userId,
        text,
        "user"
      );

      await this.db.saveMessage(
        userId,
        reply,
        "assistant"
      );

      return reply;
    }

    if (/^\d+$/.test(text)) {
      const reply =
        await this.game.handleGuess(
          userId,
          text
        );

      await this.db.saveMessage(
        userId,
        text,
        "user"
      );

      await this.db.saveMessage(
        userId,
        reply,
        "assistant"
      );

      return reply;
    }

    // Remember something.
    if (
      lower.startsWith("remember ")
    ) {
      const note =
        text
          .slice("remember ".length)
          .trim();

      if (note) {
        await this.db.setMemory(
          `user:${userId}:last_note`,
          note
        );

        const reply =
          `I'll remember that: ${note}`;

        await this.db.saveMessage(
          userId,
          text,
          "user"
        );

        await this.db.saveMessage(
          userId,
          reply,
          "assistant"
        );

        return reply;
      }
    }

    // Retrieve saved note.
    if (
      lower === "what do you remember" ||
      lower === "show my memory" ||
      lower === "what do you remember about me"
    ) {
      const saved =
        await this.db.getMemory(
          `user:${userId}:last_note`
        );

      const reply = saved
        ? `I remember: ${saved}`
        : "I don't have a saved note for you yet.";

      await this.db.saveMessage(
        userId,
        text,
        "user"
      );

      await this.db.saveMessage(
        userId,
        reply,
        "assistant"
      );

      return reply;
    }

    // Get previous conversation BEFORE
    // saving the new user message.
    const context =
      await this.getConversation(
        userId,
        20
      );

    const reply =
      await this.ai.respond(
        text,
        context
      );

    await this.db.saveMessage(
      userId,
      text,
      "user"
    );

    await this.db.saveMessage(
      userId,
      reply,
      "assistant"
    );

    return (
      reply ||
      "Miah is ready to chat."
    );
  }
}

module.exports = { MiahBot };
