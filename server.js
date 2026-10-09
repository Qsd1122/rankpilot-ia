const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('ATTENTION: GOOGLE_API_KEY est manquant. Définissez la variable d\'environnement avant de lancer le serveur.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) : null;

// Route d'accueil pour éviter le redirect
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'RankPilot IA Backend running',
    endpoint: 'POST /api/ask'
  });
});

// Route API principale
app.post('/api/ask', async (req, res) => {
  try {
    const body = req.body || {};
    const prompt =
      body.prompt ||
      body.query ||
      body.question ||
      body.message ||
      body.keyword ||
      '';

    const url = body.url || '';
    const domain = body.domain || '';
    const keyword = body.keyword || '';

    if (!prompt || (typeof prompt !== 'string' && !Array.isArray(prompt))) {
      return res.status(400).json({
        success: false,
        error: 'Le champ prompt/query/question est requis.'
      });
    }

    if (!genAI || !model) {
      return res.status(500).json({
        success: false,
        error: 'Clé API Google manquante. Ajoutez GOOGLE_API_KEY dans votre .env.'
      });
    }

    let finalPrompt = typeof prompt === 'string' ? prompt : prompt.map(p => p.text || '').join('\n');

    if (url || domain || keyword) {
      finalPrompt = `Contexte:\n- URL: ${url || 'Non fournie'}\n- Domaine: ${domain || 'Non fourni'}\n- Mot-clé: ${keyword || 'Non fourni'}\n\nQuestion:\n${finalPrompt}`;
    }

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return res.json({
      success: true,
      answer: text
    });
  } catch (error) {
    console.error('Erreur /api/ask:', error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur lors de l\'analyse IA.'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
