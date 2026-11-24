const SUPABASE_URL = "https://cxqijbdtcaqyttbfzqds.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Jy2atLUV9TeImEK42OjjcQ_Jg4QSN0D";
const SITE = "https://gamhome-chill.vercel.app";
const xml = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const slug = s => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"movie";
module.exports = async function(req,res) {
  if(req.method!=="GET") return res.status(405).setHeader("Allow","GET").end("Method not allowed");
  try {
    const urls=[`<url><loc>${SITE}/</loc></url>`];
    for(let offset=0;offset<10000;offset+=1000) {
      const q=new URLSearchParams({select:"id,title,published_at",moderation_status:"eq.approved",visibility:"eq.public",order:"published_at.desc"});
      const response=await fetch(SUPABASE_URL+"/rest/v1/gamhome_videos?"+q.toString(),{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY,Range:`${offset}-${offset+999}`}});
      if(!response.ok) throw new Error("Could not load public movie list");
      const rows=await response.json();
      for(const v of rows){const loc=SITE+"/movie/"+encodeURIComponent(v.id)+"/"+slug(v.title);const last=v.published_at&&Number.isFinite(Date.parse(v.published_at))?`<lastmod>${new Date(v.published_at).toISOString()}</lastmod>`:"";urls.push(`<url><loc>${xml(loc)}</loc>${last}</url>`);}
      if(rows.length<1000) break;
    }
    const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
    res.setHeader("Content-Type","application/xml; charset=utf-8");res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=600");return res.status(200).send(body);
  } catch(e) { console.error("Movie sitemap error:",e.message);return res.status(500).setHeader("Content-Type","text/plain; charset=utf-8").send("Sitemap temporarily unavailable"); }
};
