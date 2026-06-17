export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !repo) return res.status(200).json([]);

  try {
    const apiURL = `https://api.github.com/repos/${repo}/contents/additions.json`;
    const getRes = await fetch(apiURL, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!getRes.ok) return res.status(200).json([]);
    const { content: raw } = await getRes.json();
    const additions = JSON.parse(Buffer.from(raw.replace(/\n/g, ''), 'base64').toString('utf-8'));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(additions);
  } catch (e) {
    res.status(200).json([]);
  }
}
