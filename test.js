 require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function listModels() {
  try {
    const { models } = await genAI.listModels();
    console.log('Modèles dispos pour generateContent:');
    models.forEach(m => {
      if (m.supportedGenerationMethods.includes('generateContent')) {
        console.log(m.name);
        const model genAI.getGenerativeModel(model gemini-2.0-flash);
      }
    });
  } catch (err) {
    console.error('Erreur listModels:', err.message);
  }
}

listModels();
