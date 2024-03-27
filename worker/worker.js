/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const src = url.searchParams.get('src') || "";
    const title = url.searchParams.get('title') || "";
    const width = url.searchParams.get('width') || "";
    const height = url.searchParams.get('height') || "";
    const img = url.searchParams.get('img') || `https://dummyimage.com/${width}x${height}/000000/fff&text=+`;

    return new Response(`
<!DOCTYPE html>
<html>  
  <head>
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="${src}">
    <meta property="og:title" content="${title}">
    <meta property="og:image" content="${img}">
    <meta property="og:video" content="${src}">
    <meta property="og:video:url" content="${src}">
    <meta property="og:video:secure_url" content="${src}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="${width}">
    <meta property="og:video:height" content="${height}">
  </head>
  <body>
    <video src="${src}" width="${width}" height="${height}" controls>
  </body>
</html>`, {
  headers: {
    'Content-Type': 'text/html'
  }
});
  },
};