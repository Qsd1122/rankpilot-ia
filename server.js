const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn("ATTENTION: GOOGLE_API_KEY est manquant. Définissez la variable d'environnement avant de lancer le serveur.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) : null;

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'RankPilot IA Backend running',
    endpoint: 'POST /api/ask'
  });
});

function extractTextFromResponse(response) {
  try {
    if (!response) return '';

    if (typeof response.text === 'function') {
      return response.text();
    }

    if (typeof response === 'string') {
      return response;
    }

    return JSON.stringify(response, null, 2);
  } catch (error) {
    return '';
  }
}

app.post('/api/ask', async (req, res) => {
  try {
    const body = req.body || {};
    const keyword = body.keyword || body.query || body.question || body.prompt || body.message || '';

    if (!keyword || (typeof keyword !== 'string' && !Array.isArray(keyword))) {
      return res.status(400).json({
        success: false,
        error: 'Le champ keyword/query/question/prompt est requis.'
      });
    }

    if (!genAI || !model) {
      return res.status(500).json({
        success: false,
        error: 'Clé API Google manquante. Ajoutez GOOGLE_API_KEY dans votre .env.'
      });
    }

    const url = body.url || '';
    const domain = body.domain || '';
    const country = body.country || 'FR';
    const audience = body.audience || 'utilisateurs français';
    const competitors = body.competitors || 'concurrents directs et leaders du secteur';
    const goal = body.goal || 'améliorer le référencement naturel et la conversion';

    const userInput = typeof keyword === 'string' ? keyword : keyword.map(item => item.text || '').join('\n');

    const seoPrompt = `Tu es un expert en SEO, marketing digital, rédaction web et analyse de concurrence.\n\nTu dois produire une analyse SEO ultra utile pour RankPilot IA.\n\nContexte:\n- Mot-clé principal: ${userInput}\n- URL du site: ${url || 'non fournie'}\n- Domaine: ${domain || 'non fourni'}\n- Pays: ${country}\n- Audience cible: ${audience}\n- Objectif: ${goal}\n- Concurrents: ${competitors}\n\nRègles:\n1. Réponds exclusivement en JSON valide, sans markdown, sans texte hors JSON.\n2. Le JSON doit avoir exactement cette structure :\n{\n  "keyword": "...",\n  "search_intent": "...",\n  "difficulty": "...",\n  "recommended_strategy": "...",\n  "seo_score": 0,\n  "meta_title": "...",\n  "meta_description": "...",\n  "h1": "...",\n  "content_outline": ["...", "...", "..."],\n  "seo_tips": ["...", "...", "..."],\n  "competitive_analysis": "...",\n  "cta_recommendation": "..."\n}\n3. seo_score doit être un nombre entre 0 et 100.\n4. Fournis un conseil concret et exploitable pour améliorer le classement.\n5. Adapte la réponse à un site français et au pays indiqué.\n\nRetourne seulement le JSON final.`;

    const result = await model.generateContent(seoPrompt);
    const rawText = extractTextFromResponse(result.response || result);

    let parsedResponse;

    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (error) {
      parsedResponse = {
        keyword: userInput,
        search_intent: 'Analyse de mots-clés SEO',
        difficulty: 'Non calculée',
        recommended_strategy: rawText,
        seo_score: 0,
        meta_title: '',
        meta_description: '',
        h1: '',
        content_outline: [],
        seo_tips: ['Le modèle n’a pas renvoyé de JSON exploitable.'],
        competitive_analysis: rawText,
        cta_recommendation: 'Récupérez un résultat plus structuré via un second appel.'
      };
    }

    return res.json({
      success: true,
      answer: parsedResponse
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
