const { AnnAI } = require('./ai');
const { AnnGame } = require('./game');

class AnnBot {
  constructor({ db, ai, game }) {
    this.db = db;
    this.ai = ai || new AnnAI(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || 'gpt-4o-mini');
    this.game = game || new AnnGame(db);
  }

  async handleIncomingMessage(sender, message) {
    const text = String(message || '').trim();
    if (!text) {
      return 'I did not receive a message.';
    }

    if (this.db) {
      await this.db.saveMessage(sender, text);
    }

    const lower = text.toLowerCase();

    if (lower.includes('remember')) {
      await this.db?.setMemory('last_note', text);
      return 'I saved that in memory for you.';
    }

    if (lower.includes('memory')) {
      const saved = await this.db?.getMemory('last_note');
      return saved ? `I remember: ${saved}` : 'I have no saved memory yet.';
    }

    if (lower.includes('what can you do') || lower.includes('what are you') || lower.includes('help') || lower.includes('explain yourself')) {
      return 'I am ANN. I can chat with you, remember notes, answer questions, start a number game, tell the time, and show your dashboard data. I can also protect the dashboard with a password and reset it with Gmail verification.';
    }

    if (lower.includes('game')) {
      return await this.game.startGame(sender);
    }

    if (lower.includes('play')) {
      return await this.game.startGame(sender);
    }

    if (/^\d+$/.test(text)) {
      return await this.game.handleGuess(sender, text);
    }

    if (lower.includes('time')) {
      return `The current time is ${new Date().toLocaleTimeString()}.`;
    }

    const aiReply = await this.ai.respond(text, []);
    if (aiReply) {
      return aiReply;
    }

    return 'ANN is active and ready to help with chat, tools, games, and memory.';
  }
}

module.exports = { AnnBot };
