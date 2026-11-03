module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const targetUrl = (body && body.url) || req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ status: 'error', message: 'URL is required' });
        }

        const formattedUrl = targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl;
        const response = await fetch(formattedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            return res.status(500).json({ status: 'error', message: `HTTP ${response.status}` });
        }

        const html = await response.text();

        // Regex helpers for Open Graph metadata
        const getMeta = (prop) => {
            const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
                      html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["']`, 'i'));
            return m ? m[1].trim() : '';
        };

        const title = getMeta('title') || (html.match(/<title[^>]*>(.*?)<\/title>/i) ? html.match(/<title[^>]*>(.*?)<\/title>/i)[1].trim() : '');
        const image = getMeta('image');
        const description = getMeta('description');

        const now = new Date();
        const dateStr = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

        return res.status(200).json({
            status: 'success',
            title: title || 'সংবাদের শিরোনাম',
            image: image || '',
            description: description || '',
            category: 'বাংলাদেশ',
            date: dateStr
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
};
