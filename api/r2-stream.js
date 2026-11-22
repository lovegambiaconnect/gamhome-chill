const { signedUrl } = require("../lib/r2");
const { Readable } = require("stream");
const SUPABASE_URL = "https://cxqijbdtcaqyttbfzqds.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Jy2atLUV9TeImEK42OjjcQ_Jg4QSN0D";
module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end("Method not allowed");
  try {
    const id = String(req.query.videoId || "");
    if (!id || id.length > 100) return res.status(400).end("A valid video ID is required.");
    const q = new URLSearchParams({ id: "eq." + id, moderation_status: "eq.approved", visibility: "eq.public", select: "video_url", limit: "1" });
    const lookup = await fetch(SUPABASE_URL + "/rest/v1/gamhome_videos?" + q.toString(), { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY } });
    if (!lookup.ok) throw new Error("Could not verify the movie's publication status.");
    const rows = await lookup.json();
    if (!rows.length || !rows[0].video_url) return res.status(404).end("This movie is not available for playback.");
    const method = req.method;
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(signedUrl(method, rows[0].video_url, 3600), { method, headers });
    if (!upstream.ok && upstream.status !== 206) {
      const detail = await upstream.text().catch(() => "");
      console.error("R2 stream returned", upstream.status, detail.slice(0, 300));
      return res.status(upstream.status || 502).end("The video file could not be retrieved from storage.");
    }
    res.statusCode = upstream.status;
    for (const h of ["content-type", "content-length", "content-range", "last-modified", "etag"]) {
      const value = upstream.headers.get(h);
      if (value) res.setHeader(h, value);
    }
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Disposition", "inline");
    if (method === "HEAD" || !upstream.body) return res.end();
    Readable.fromWeb(upstream.body).on("error", e => { console.error("R2 stream pipe failed", e.message); res.destroy(e); }).pipe(res);
  } catch (e) {
    console.error("R2 streaming failed", e.message);
    if (!res.headersSent) res.status(500).end("Could not prepare video playback."); else res.destroy(e);
  }
};
