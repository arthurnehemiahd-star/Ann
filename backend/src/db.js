const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const defaultDbPath =
  process.env.DB_PATH || path.join(__dirname, '..', 'miah.db');

class MemoryDB {
  constructor(filePath = defaultDbPath) {
    this.provider = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
    this.filePath = filePath;
    this.db =
      this.provider === 'sqlite' ? new sqlite3.Database(filePath) : null;
    this.postgresClient = null;
    this._connected = false;

    this.init();
  }

  async _ensurePostgres() {
    if (this.provider !== 'postgres') {
      return;
    }

    if (!this.postgresClient) {
      const { Client } = require('pg');

      this.postgresClient = new Client({
        connectionString: process.env.DATABASE_URL,
      });
    }

    if (!this._connected) {
      await this.postgresClient.connect();

      await this.postgresClient.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender TEXT NOT NULL,
          text TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.postgresClient.query(`
        CREATE TABLE IF NOT EXISTS memory (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      await this.postgresClient.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          user_id TEXT PRIMARY KEY,
          state TEXT NOT NULL
        )
      `);

      this._connected = true;
    }
  }

  init() {
    if (this.provider !== 'sqlite') {
      return;
    }

    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender TEXT NOT NULL,
          text TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS memory (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          user_id TEXT PRIMARY KEY,
          state TEXT NOT NULL
        )
      `);

      // Upgrade an older messages table that doesn't have "role".
      this.db.all(
        `PRAGMA table_info(messages)`,
        (error, columns) => {
          if (error) {
            console.error('Database schema check failed:', error);
            return;
          }

          const hasRole = columns.some((column) => column.name === 'role');

          if (!hasRole) {
            this.db.run(
              `ALTER TABLE messages ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
              (alterError) => {
                if (alterError) {
                  console.error(
                    'Could not add message role column:',
                    alterError
                  );
                }
              }
            );
          }
        }
      );
    });
  }

  async saveMessage(sender, text, role = 'user') {
    const safeRole = role === 'assistant' ? 'assistant' : 'user';

    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      await this.postgresClient.query(
        `
        INSERT INTO messages (sender, text, role)
        VALUES ($1, $2, $3)
        `,
        [sender, text, safeRole]
      );

      return;
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT INTO messages (sender, text, role)
        VALUES (?, ?, ?)
        `,
        [sender, text, safeRole],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  async getConversation(sender, limit = 20) {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      const result = await this.postgresClient.query(
        `
        SELECT sender, text, role, created_at
        FROM messages
        WHERE sender = $1
        ORDER BY id DESC
        LIMIT $2
        `,
        [sender, limit]
      );

      return [...result.rows].reverse();
    }

    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT sender, text, role, created_at
        FROM messages
        WHERE sender = ?
        ORDER BY id DESC
        LIMIT ?
        `,
        [sender, limit],
        (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows.reverse());
        }
      );
    });
  }

  async getRecentMessages(limit = 10) {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      const result = await this.postgresClient.query(
        `
        SELECT sender, text, role, created_at
        FROM messages
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
      );

      return [...result.rows].reverse();
    }

    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT sender, text, role, created_at
        FROM messages
        ORDER BY id DESC
        LIMIT ?
        `,
        [limit],
        (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows.reverse());
        }
      );
    });
  }

  async setMemory(key, value) {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      await this.postgresClient.query(
        `
        INSERT INTO memory (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value
        `,
        [key, value]
      );

      return;
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT INTO memory (key, value)
        VALUES (?, ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
        `,
        [key, value],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  async getMemory(key) {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      const result = await this.postgresClient.query(
        `SELECT value FROM memory WHERE key = $1`,
        [key]
      );

      return result.rows[0]?.value || null;
    }

    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT value FROM memory WHERE key = ?`,
        [key],
        (error, row) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(row ? row.value : null);
        }
      );
    });
  }

  async setSession(userId, state) {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      await this.postgresClient.query(
        `
        INSERT INTO sessions (user_id, state)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET state = EXCLUDED.state
        `,
        [userId, JSON.stringify(state)]
      );

      return;
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT INTO sessions (user_id, state)
        VALUES (?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET state = excluded.state
        `,
        [userId, JSON.stringify(state)],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  async getSession(userId) {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      const result = await this.postgresClient.query(
        `SELECT state FROM sessions WHERE user_id = $1`,
        [userId]
      );

      const state = result.rows[0]?.state;

      if (!state) {
        return null;
      }

      try {
        return JSON.parse(state);
      } catch {
        return null;
      }
    }

    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT state FROM sessions WHERE user_id = ?`,
        [userId],
        (error, row) => {
          if (error) {
            reject(error);
            return;
          }

          if (!row || !row.state) {
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(row.state));
          } catch {
            resolve(null);
          }
        }
      );
    });
  }

  async getDashboardSummary() {
    if (this.provider === 'postgres') {
      await this._ensurePostgres();

      const [messages, memoryRows, sessions] = await Promise.all([
        this.postgresClient.query(`
          SELECT sender, text, role, created_at
          FROM messages
          ORDER BY id DESC
          LIMIT 10
        `),

        this.postgresClient.query(`
          SELECT key, value
          FROM memory
          ORDER BY key ASC
        `),

        this.postgresClient.query(`
          SELECT user_id, state
          FROM sessions
          ORDER BY user_id ASC
        `),
      ]);

      return {
        messageCount: messages.rows.length,
        memoryCount: memoryRows.rows.length,
        sessionCount: sessions.rows.length,
        recentMessages: [...messages.rows].reverse(),
        memory: memoryRows.rows,
        sessions: sessions.rows,
      };
    }

    const [messages, memoryRows, sessions] = await Promise.all([
      this.getRecentMessages(10),

      new Promise((resolve, reject) => {
        this.db.all(
          `SELECT key, value FROM memory ORDER BY key ASC`,
          (error, rows) => (error ? reject(error) : resolve(rows))
        );
      }),

      new Promise((resolve, reject) => {
        this.db.all(
          `SELECT user_id, state FROM sessions ORDER BY user_id ASC`,
          (error, rows) => (error ? reject(error) : resolve(rows))
        );
      }),
    ]);

    return {
      messageCount: messages.length,
      memoryCount: memoryRows.length,
      sessionCount: sessions.length,
      recentMessages: messages,
      memory: memoryRows,
      sessions,
    };
  }

  close() {
    if (this.provider === 'postgres' && this.postgresClient) {
      return this.postgresClient.end();
    }

    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { MemoryDB };
