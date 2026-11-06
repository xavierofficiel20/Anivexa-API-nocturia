// --- AJOUT DU PROXY POUR CONTOURNER LES ERREURS 403 ---
async function handleProxy(request) {
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "L'URL cible est requise (?url=...)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  let referer = 'https://vidmoly.to/';
  if (targetUrl.includes('sibnet')) {
    referer = 'https://video.sibnet.ru/';
  } else if (targetUrl.includes('sendvid')) {
    referer = 'https://sendvid.com/';
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': referer
      }
    });

    const newHeaders = new Headers(upstreamResponse.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: newHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Échec du relais proxy du flux vidéo" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
