const { MiahAI } = require("./ai");
const { AnnGame } = require("./game");

class MiahBot {
  constructor({ db, ai, game }) {
    this.db = db;

    this.ai =
      ai ||
      new MiahAI(
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL || "gpt-5"
      );

    this.game = game || new AnnGame(db);
  }

  async getConversation(sender, limit = 20) {
    if (!this.db || typeof this.db.getRecentMessages !== "function") {
      return [];
    }

    const messages = await this.db.getRecentMessages(limit * 2);

    return messages
      .filter((entry) => entry.sender === sender)
      .slice(-limit)
      .map((entry) => ({
        role: entry.role || "user",
        content: entry.text,
      }));
  }

  async handleIncomingMessage(sender, message) {
    const text = String(message || "").trim();

    if (!text) {
      return "I didn't receive a message.";
    }

    const conversation = await this.getConversation(sender);

    const reply = await this.ai.respond(text, conversation);

    if (this.db && typeof this.db.saveMessage === "function") {
      await this.db.saveMessage(sender, text);

      if (reply) {
        await this.db.saveMessage(sender, reply);
      }
    }

    return reply || "Miah is ready to chat.";
  }
}

module.exports = { MiahBot };
