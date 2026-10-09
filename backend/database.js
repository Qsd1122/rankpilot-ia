const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'rankpilot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur connexion BD:', err);
  } else {
    console.log('BD SQLite connectée à', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        domain TEXT,
        url TEXT,
        country TEXT DEFAULT 'FR',
        audience TEXT,
        goal TEXT,
        competitors TEXT,
        result TEXT NOT NULL,
        seo_score INTEGER,
        search_intent TEXT,
        difficulty TEXT,
        meta_title TEXT,
        meta_description TEXT,
        h1 TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erreur création table analyses:', err);
      else console.log('Table analyses prête');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        action TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES analyses(id)
      )
    `, (err) => {
      if (err) console.error('Erreur création table history:', err);
      else console.log('Table history prête');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES analyses(id)
      )
    `, (err) => {
      if (err) console.error('Erreur création table favorites:', err);
      else console.log('Table favorites prête');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        analyses TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erreur création table reports:', err);
      else console.log('Table reports prête');
    });
  });
}

module.exports = {
  db,

  createAnalysis: (analysisData) => {
    return new Promise((resolve, reject) => {
      const {
        keyword,
        domain,
        url,
        country,
        audience,
        goal,
        competitors,
        result,
        seo_score,
        search_intent,
        difficulty,
        meta_title,
        meta_description,
        h1
      } = analysisData;

      const query = `
        INSERT INTO analyses (
          keyword, domain, url, country, audience, goal, competitors,
          result, seo_score, search_intent, difficulty, meta_title, meta_description, h1
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [
          keyword,
          domain,
          url,
          country,
          audience,
          goal,
          competitors,
          result,
          seo_score,
          search_intent,
          difficulty,
          meta_title,
          meta_description,
          h1
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  getAnalysis: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM analyses WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAllAnalyses: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM analyses ORDER BY created_at DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  getAnalysesByKeyword: (keyword) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM analyses WHERE keyword LIKE ? ORDER BY created_at DESC',
        [`%${keyword}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  updateAnalysis: (id, updatedData) => {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(updatedData);
      const values = Object.values(updatedData);
      values.push(id);

      const setClause = keys.map((key) => `${key} = ?`).join(', ');
      const query = `UPDATE analyses SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

      db.run(query, values, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  deleteAnalysis: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM analyses WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  searchAnalyses: (filters) => {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM analyses WHERE 1=1';
      const params = [];

      if (filters.keyword) {
        query += ' AND keyword LIKE ?';
        params.push(`%${filters.keyword}%`);
      }

      if (filters.domain) {
        query += ' AND domain LIKE ?';
        params.push(`%${filters.domain}%`);
      }

      if (filters.minScore) {
        query += ' AND seo_score >= ?';
        params.push(filters.minScore);
      }

      if (filters.maxScore) {
        query += ' AND seo_score <= ?';
        params.push(filters.maxScore);
      }

      if (filters.difficulty) {
        query += ' AND difficulty = ?';
        params.push(filters.difficulty);
      }

      query += ' ORDER BY created_at DESC';

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  addFavorite: (analysisId) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO favorites (analysis_id) VALUES (?)', [analysisId], function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  },

  removeFavorite: (analysisId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM favorites WHERE analysis_id = ?', [analysisId], function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  getFavorites: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT a.* FROM analyses a
         INNER JOIN favorites f ON a.id = f.analysis_id
         ORDER BY a.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  isFavorite: (analysisId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM favorites WHERE analysis_id = ?', [analysisId], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });
  },

  getStatistics: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
          COUNT(*) as total_analyses,
          AVG(seo_score) as avg_seo_score,
          MAX(seo_score) as max_seo_score,
          MIN(seo_score) as min_seo_score
        FROM analyses`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0] || {});
        }
      );
    });
  },

  getTopKeywords: (limit = 10) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT keyword, COUNT(*) as count, AVG(seo_score) as avg_score
         FROM analyses
         GROUP BY keyword
         ORDER BY count DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  getDifficultyDistribution: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT difficulty, COUNT(*) as count
         FROM analyses
         WHERE difficulty IS NOT NULL
         GROUP BY difficulty`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  createReport: (reportData) => {
    return new Promise((resolve, reject) => {
      const { name, description, analyses } = reportData;
      db.run(
        'INSERT INTO reports (name, description, analyses) VALUES (?, ?, ?)',
        [name, description, JSON.stringify(analyses)],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  getReports: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM reports ORDER BY created_at DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  getReport: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM reports WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  deleteReport: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM reports WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
};
