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
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text(); // Use .text() to handle both JSON and non-JSON
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', details: (error as Error).message });
  }
}
