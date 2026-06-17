export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !repo) return res.status(500).json({ error: 'GITHUB_TOKEN and GITHUB_REPO must be set in Vercel environment variables' });

  const { addition } = req.body;
  if (!addition || !addition.name) return res.status(400).json({ error: 'Invalid payload' });

  try {
    const apiURL = `https://api.github.com/repos/${repo}/contents/additions.json`;
    const hdrs = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };

    const getRes = await fetch(apiURL, { headers: hdrs });
    if (!getRes.ok) throw new Error(`GitHub read failed: ${getRes.status}`);
    const { sha, content: raw } = await getRes.json();

    const current = JSON.parse(Buffer.from(raw.replace(/\n/g, ''), 'base64').toString('utf-8'));
    current.push(addition);

    const putRes = await fetch(apiURL, {
      method: 'PUT',
      headers: { ...hdrs, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `feat: add ${addition.name}`,
        content: Buffer.from(JSON.stringify(current, null, 2)).toString('base64'),
        sha
      })
    });

    if (!putRes.ok) throw new Error((await putRes.json()).message || putRes.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
