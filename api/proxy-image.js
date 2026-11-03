module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('URL required');

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        if (!response.ok) return res.status(response.status).send('Failed to fetch image');

        const contentType = response.headers.get('content-type') || 'image/png';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const arrayBuffer = await response.arrayBuffer();
        res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err) {
        res.status(500).send(err.message);
    }
};
