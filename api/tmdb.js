// api/tmdb.js

export default async function handler(request, response) {
  // --- Security & CORS ---
  // Allow requests from your Chrome extension's origin
  response.setHeader('Access-Control-Allow-Origin', `chrome-extension://${chrome.runtime.id}`);
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle pre-flight requests for CORS
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- API Key ---
  // Pull the secret API key from environment variables. It's NOT in the code.
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return response.status(500).json({ error: 'API key not configured.' });
  }

  // --- Dynamic API Call ---
  // Get the TMDb endpoint path from the request's query parameters
  // e.g., /3/movie/123?append_to_response=credits
  const endpoint = request.query.endpoint;

  if (!endpoint) {
    return response.status(400).json({ error: 'TMDb endpoint not specified.' });
  }

  const tmdbUrl = `https://api.themoviedb.org/${endpoint}&api_key=${TMDB_API_KEY}`;
  
  try {
    const tmdbResponse = await fetch(tmdbUrl);
    const data = await tmdbResponse.json();
    
    // --- Send the response back to your extension ---
    // The 'Cache-Control' header tells browsers/Vercel to cache the response
    // for 1 day (86400 seconds), reducing your API usage for popular titles.
    response.setHeader('Cache-Control', 's-maxage=86400');
    return response.status(200).json(data);

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to fetch data from TMDb.' });
  }
}