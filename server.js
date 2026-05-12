 require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let scans = 0;

app.post('/api/scan', async (req, res) => {
  console.log('1. Requête reçue:', req.body.url);
  const isPro = req.headers['x-user-tier'] === 'pro';
  if (!isPro && scans >= 3) return res.status(403).json({ error: 'Limite 3 scans atteinte. Passe Pro.' });

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    let finalUrl = url.trim().toLowerCase();
    if (!finalUrl.startsWith('http://') &&!finalUrl.startsWith('https://')) {
      finalUrl = 'http://' + finalUrl;
    }

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const html = await axios.get(finalUrl, {
      timeout: 10000,
      maxRedirects: 5,
      httpsAgent: httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      validateStatus: status => status < 500
    }).then(r => r.data);

    const prompt = `Tu es un expert SEO. Analyse ce HTML et donne exactement 5 recommandations SEO concrètes et actionnables en français. Format en bullet points:\n\n${html.slice(0, 30000)}`;

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const report = geminiRes.data.candidates[0].content.parts[0].text;
    if (!isPro) scans++;
    res.json({ report, scansLeft: isPro? 'Illimité' : 3 - scans });

  } catch (err) {
    console.error('STATUS:', err.response?.status);
    console.error('DATA:', err.response?.data);
    console.error('MESSAGE:', err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
