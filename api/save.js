export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  const file  = process.env.GITHUB_FILE || 'index.html';

  if (!token || !repo) return res.status(500).json({ error: 'GitHub not configured in Vercel env vars' });

  const { additions } = req.body;
  if (!Array.isArray(additions)) return res.status(400).json({ error: 'Invalid payload' });

  try {
    const apiURL = `https://api.github.com/repos/${repo}/contents/${file.split('/').map(encodeURIComponent).join('/')}`;
    const hdrs = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };

    const getRes = await fetch(apiURL, { headers: hdrs });
    if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
    const { sha, content: raw } = await getRes.json();

    const decoded = Buffer.from(raw.replace(/\n/g, ''), 'base64').toString('utf-8');
    const updated = decoded.replace(
      /const ADDITIONS = [\s\S]*?; \/\/ __ADDITIONS_END__/,
      `const ADDITIONS = ${JSON.stringify(additions)}; // __ADDITIONS_END__`
    );

    if (updated === decoded) return res.status(400).json({ error: 'ADDITIONS marker not found in file' });

    const lastName = additions.length ? additions[additions.length - 1].name : 'member';
    const putRes = await fetch(apiURL, {
      method: 'PUT',
      headers: { ...hdrs, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `feat: add ${lastName}`,
        content: Buffer.from(updated, 'utf-8').toString('base64'),
        sha
      })
    });

    if (!putRes.ok) throw new Error((await putRes.json()).message || putRes.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
