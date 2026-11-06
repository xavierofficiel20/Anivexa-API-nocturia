const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

export function canExtractVidmoly(url) {
  return /vidmoly\.(net|biz|to)/i.test(String(url));
}

export async function extractVidmoly(embedUrl, { fetchImpl = fetch, userAgent = DEFAULT_USER_AGENT, referer } = {}) {
  const url = String(embedUrl).startsWith("//") ? `https:${embedUrl}` : String(embedUrl);
  
  const response = await fetchImpl(url, {
    headers: { 
      "User-Agent": userAgent, 
      "Referer": referer ?? "https://animenosub.to/" 
    },
    redirect: "follow"
  });
  
  if (!response.ok) throw new Error(`Vidmoly fetch HTTP ${response.status}`);
  const html = await response.text();
  
  // Expression régulière améliorée pour capturer la source vidéo
  const match = html.match(/sources:\s*\[\s*\{\s*file:\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error("Vidmoly source file not found in embed HTML");
  
  const streamUrl = match[1];

  // On retourne un objet structuré avec le type de flux et les en-têtes nécessaires 
  // pour que le front-end ou un proxy sache comment le lire sans erreur CORS.
  return [{
    url: streamUrl,
    type: streamUrl.includes('.m3u8') ? 'hls' : 'mp4',
    headers: {
      "Referer": url,
      "User-Agent": userAgent
    }
  }];
}
