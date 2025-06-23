// api/tmdb.js - V2 with Retry Logic

export default async function handler(request, response) {
  // --- Security & CORS ---
  // This part remains the same. It allows your extension to call this function.
  response.setHeader('Access-Control-Allow-Origin', `chrome-extension://${chrome.runtime.id}`);
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- API Key & Config ---
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    return response.status(500).json({ error: 'API key not configured on server.' });
  }
  
  const endpoint = request.query.endpoint;
  if (!endpoint) {
    return response.status(400).json({ error: 'TMDb endpoint not specified.' });
  }

  // --- Retry Logic Configuration ---
  const MAX_RETRIES = 3; // We will try a total of 3 times.
  const INITIAL_DELAY_MS = 500; // Start with a 500ms delay.

  // --- The Retry Loop ---
  // We will loop up to MAX_RETRIES times.
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tmdbUrl = `https://api.themoviedb.org/${endpoint}&api_key=${TMDB_API_KEY}`;
      const tmdbResponse = await fetch(tmdbUrl);

      // --- Success Condition ---
      // If the response is OK (e.g., status 200), we've succeeded!
      if (tmdbResponse.ok) {
        const data = await tmdbResponse.json();
        // Set a cache header to be efficient
        response.setHeader('Cache-Control', 's-maxage=86400'); // Cache for 1 day
        // Send the successful response back and exit the function.
        return response.status(200).json(data);
      }

      // --- Failure Condition ---
      // If the response was NOT okay (e.g., 429 Too Many Requests, 500 Server Error)
      // and this is not our last attempt, we should wait and retry.
      if (attempt < MAX_RETRIES) {
        console.warn(`Attempt ${attempt} failed with status ${tmdbResponse.status}. Retrying...`);
        // Calculate the delay, increasing it for each attempt (500ms, 1000ms, etc.)
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        // Add a small amount of randomness ("jitter") to prevent thundering herd issues
        const jitter = delay * 0.2 * Math.random();
        // Wait for the calculated delay before the next loop iteration.
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else {
        // If this was our last attempt and it still failed, give up.
        throw new Error(`Failed after ${MAX_RETRIES} attempts with status ${tmdbResponse.status}`);
      }

    } catch (error) {
      // This catches network errors (e.g., TMDb is down) or our "last attempt" error.
      if (attempt < MAX_RETRIES) {
        console.warn(`Attempt ${attempt} failed with network error. Retrying...`);
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = delay * 0.2 * Math.random();
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      } else {
        // If it failed even on the last attempt, send a final error response.
        console.error(error);
        return response.status(500).json({ 
          error: 'Failed to fetch data from TMDb after multiple retries.',
          details: error.message
        });
      }
    }
  }
}