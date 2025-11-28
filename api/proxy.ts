export default async function handler(req: any, res: any) {
  // Get the target endpoint from the query, e.g. match-list-data/22 or match/12345
  const { target, ...rest } = req.query;

  if (!target || typeof target !== 'string') {
    res.status(400).json({ error: 'Missing or invalid target parameter' });
    return;
  }

  // Build the 24live.com API URL
  const url = `https://24live.com/api/${target}`;

  // Forward the request to 24live.com with the same query params (except 'target')
  const params = new URLSearchParams(rest as Record<string, string>).toString();
  const fullUrl = params ? `${url}?${params}` : url;

  try {
    const response = await fetch(fullUrl, {
      method: req.method,
      // Add browser-like headers; some origins block generic serverless traffic
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://24live.com/',
        'Origin': 'https://24live.com',
      },
    });

    const data = await response.text(); // Use .text() to handle both JSON and non-JSON
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', details: (error as Error).message });
  }
}
