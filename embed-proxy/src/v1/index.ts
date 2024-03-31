import { Hono } from 'hono';

const v1 = new Hono();

v1.get('/', async (c) => {
  const src = c.req.query('src') || '';
  const width = c.req.query('width') || '';
  const height = c.req.query('height') || '';
  const title = c.req.query('title') || '';
  const img =
    c.req.query('img') ||
    `https://dummyimage.com/${width}x${height}/000000/fff&text=+`;

  return c.html(`
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
</html>`);
});

export default v1;
