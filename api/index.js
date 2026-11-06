import { AutoRouter } from 'itty-router';
import { getAnimeList } from './core/anilist.js';
import { getEpisodeStrategy } from './core/episode-strategy.js';

const router = AutoRouter();

// ---------------------------------------------------------------------------
// 1. GESTION DU PROXY POUR ÉLIMINER L'ERREUR 403 ET LES RESTRICTIONS CORS
// ---------------------------------------------------------------------------
async function handleProxy(request) {
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "L'URL cible est requise dans la requête (?url=...)" }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }

  // Détermination du Referer selon l'hébergeur pour passer les protections anti-bot
  let referer = 'https://vidmoly.to/';
  if (targetUrl.includes('sibnet')) {
    referer = 'https://video.sibnet.ru/';
  } else if (targetUrl.includes('sendvid')) {
    referer = 'https://sendvid.com/';
  } else if (targetUrl.includes('filecloud')) {
    referer = 'https://filecloud.sx/';
  }

  try {
    // Le serveur Render télécharge le flux vidéo à la place du navigateur
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': referer
      }
    });

    if (!upstreamResponse.ok) {
      return new Response(`Erreur lors de la récupération du flux : ${upstreamResponse.statusText}`, {
        status: upstreamResponse.status,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // Copie des en-têtes et injection du CORS
    const newHeaders = new Headers(upstreamResponse.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");

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
// 2. DÉCLARATION DES ROUTES DE L'API ANIVEXA
// ---------------------------------------------------------------------------

// Route Proxy (Pour Vercel et le lecteur front-end)
router.get('/api/proxy', (request) => handleProxy(request));

// Route de recherche / catalogue
router.get('/api/anime', async (request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  
  const data = await getAnimeList(query, page);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

// Route de récupération des épisodes et liens de streaming
router.get('/api/episodes/:id', async (request) => {
  const { id } = request.params;
  const url = new URL(request.url);
  const episode = url.searchParams.get('ep') || '1';

  const data = await getEpisodeStrategy(id, episode);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

// ---------------------------------------------------------------------------
// 3. EXPORT DU WORKER ET DU HANDLER DE REQUÊTES
// ---------------------------------------------------------------------------
export default {
  fetch: (request, env, ctx) => router.fetch(request, env, ctx)
};
