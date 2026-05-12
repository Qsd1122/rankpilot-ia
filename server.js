 const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Route d'accueil pour éviter le redirect
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RankPilot IA Backend running',
    endpoint: 'POST /api/ask' 
  });
});

// Ta route API existante
app.post('/api/ask', async (req, res) => {
  // ... ton code actuel
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

