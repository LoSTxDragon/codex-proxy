// api/tmdb.js - V3 with CORRECTED CORS Header

export default async function handler(request, response) {
  // --- MODIFIED: Universal CORS Header ---
  // This allows any website or extension to call your function.
  // This is safe because your API key is still kept secret on the server.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight requests for CORS
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- API Key & Config (No changes) ---
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return response.status(500).json({ error: 'API key not configured on server.' });
  }
  
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    return response.status(400).json({ error: 'TMDb endpoint not specified.' });
  }

  // --- Retry Logic Configuration (No changes) ---
  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 500;

  // --- The Retry Loop (No changes) ---
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tmdbUrl = `https://api.themoviedb.org/${endpoint}&api_key=${TMDB_API_KEY}`;
      const tmdbResponse = await fetch(tmdbUrl);

      if (tmdbResponse.ok) {
        const data = await tmdbResponse.json();
        response.setHeader('Cache-Control', 's-maxage=86400');
        return response.status(200).json(data);
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = delay * 0.2 * Math.random();
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else {
        throw new Error(`Failed after ${MAX_RETRIES} attempts with status ${tmdbResponse.status}`);
      }

    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = delay * 0.2 * Math.random();
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else {
        console.error(error);
        return response.status(500).json({ 
          error: 'Failed to fetch data from TMDb after multiple retries.',
          details: error.message
        });
      }
    }
  }
}