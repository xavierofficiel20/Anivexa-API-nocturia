import { AutoRouter } from 'itty-router';
import { getAnimeList } from './core/anilist.js';
import { getEpisodeStrategy } from './core/episode-strategy.js';

const router = AutoRouter();

// ---------------------------------------------------------------------------
// GESTION DU PROXY (AVEC SUPPORT DES REQUÊTES RANGE & 206)
// ---------------------------------------------------------------------------
async function handleProxy(request) {
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "L'URL cible est requise (?url=...)" }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }

  let referer = 'https://vidmoly.to/';
  if (targetUrl.includes('sibnet')) {
    referer = 'https://video.sibnet.ru/';
  } else if (targetUrl.includes('sendvid')) {
    referer = 'https://sendvid.com/';
  } else if (targetUrl.includes('filecloud')) {
    referer = 'https://filecloud.sx/';
  }

  // Récupération de l'en-tête Range envoyé par le lecteur (vital pour le streaming/seeking)
  const rangeHeader = request.headers.get("range");

  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'Referer': referer
  };

  if (rangeHeader) {
    fetchHeaders['Range'] = rangeHeader;
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: fetchHeaders
    });

    const newHeaders = new Headers(upstreamResponse.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");

    // upstreamResponse.status transmettra automatiquement 200 OK ou 206 Partial Content
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: newHeaders
    });
  } catch (error) {
    console.error("Erreur Proxy Anivexa:", error);
    return new Response(JSON.stringify({ error: "Échec du relais proxy du flux vidéo" }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }
}

// ---------------------------------------------------------------------------
// ROUTES DE L'API
// ---------------------------------------------------------------------------

router.get('/api/proxy', (request) => handleProxy(request));

router.get('/api/anime', async (request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  
  const data = await getAnimeList(query, page);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

router.get('/api/episodes/:id', async (request) => {
  const { id } = request.params;
  const url = new URL(request.url);
  const episode = url.searchParams.get('ep') || '1';

  const data = await getEpisodeStrategy(id, episode);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

export default {
  fetch: (request, env, ctx) => router.fetch(request, env, ctx)
};
