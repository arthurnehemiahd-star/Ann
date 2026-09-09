class AnnGame {
  constructor(db) {
    this.db = db;
  }

  async startGame(userId) {
    const session = {
      status: 'playing',
      target: Math.floor(Math.random() * 10) + 1,
      attempts: 0,
    };
    await this.db.setSession(userId, session);
    return 'Game started! I picked a number between 1 and 10. Guess it.';
  }

  async handleGuess(userId, guessText) {
    const session = await this.db.getSession(userId);
    if (!session || session.status !== 'playing') {
      return 'No active game found. Type "play" to start one.';
    }

    const guess = Number.parseInt(guessText, 10);
    if (Number.isNaN(guess)) {
      return 'Please enter a valid number between 1 and 10.';
    }

    session.attempts += 1;

    if (guess < session.target) {
      await this.db.setSession(userId, session);
      return `Too low! Attempts: ${session.attempts}. Try again.`;
    }

    if (guess > session.target) {
      await this.db.setSession(userId, session);
      return `Too high! Attempts: ${session.attempts}. Try again.`;
    }

    session.status = 'won';
    session.lastResult = `You won in ${session.attempts} attempt(s)!`;
    await this.db.setSession(userId, session);
    return `Correct! You guessed ${guess} in ${session.attempts} attempt(s). Type "play" to start a new round.`;
  }
}

module.exports = { AnnGame };
