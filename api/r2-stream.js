const { signedUrl } = require("../lib/r2");
const SUPABASE_URL = "https://cxqijbdtcaqyttbfzqds.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Jy2atLUV9TeImEK42OjjcQ_Jg4QSN0D";

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end("Method not allowed");
  }
  try {
    const id = String(req.query.videoId || "");
    if (!id || id.length > 100) return res.status(400).end("A valid video ID is required.");
    const q = new URLSearchParams({ id: "eq." + id, moderation_status: "eq.approved", visibility: "eq.public", select: "video_url", limit: "1" });
    const lookup = await fetch(SUPABASE_URL + "/rest/v1/gamhome_videos?" + q.toString(), {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }
    });
    if (!lookup.ok) throw new Error("Could not verify the movie's publication status.");
    const rows = await lookup.json();
    if (!rows.length || !rows[0].video_url) return res.status(404).end("This movie is not available for playback.");
    const url = signedUrl(req.method, rows[0].video_url, 3600);
    res.setHeader("Location", url);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(307).end();
  } catch (e) {
    console.error("R2 stream redirect failed", e.message);
    return res.status(500).end("Could not prepare video playback.");
  }
};
