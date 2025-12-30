import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import Haikunator from "haikunator";
import { AppT } from "..";

const EmbedSchema = z.object({
  src: z.string(),
  width: z.number(),
  height: z.number(),
  title: z.string().optional(),
  thumbnail: z.string().optional(),
});

const v2 = new Hono<
  AppT & {
    Variables: {
      Haikunator: Haikunator;
    };
  }
>();

v2.use(async (c, next) => {
  c.set("Haikunator", new Haikunator());
  return next();
});

v2.get("/healthz", async (c) => {
  return c.text("OK");
});

v2.post("/add", zValidator("json", EmbedSchema), async (c) => {
  const body = await c.req.valid("json");
  const slug = c.get("Haikunator").haikunate();
  await c.env.Slugs.put(slug, JSON.stringify(body));
  return c.json({ slug });
});

v2.get("/~/:slug", async (c) => {
  const slug = c.req.param("slug");
  const data = await c.env.Slugs.get(slug);
  if (!data) {
    c.status(404);
    return c.json({ error: "Not found" });
  }
  console.log(data);

  const embed = EmbedSchema.safeParse(JSON.parse(data));
  if (!embed.success) {
    console.error(embed.error);
    c.status(500);
    return c.json({ error: "Database error. Contact admin" });
  }

  // c.header('Link', `<${c.env.Host}/v2/~/${slug}/oembed.json>; rel="alternate"; type="application/json+oembed"`);
  // return c.text("");
  return c.html(`
<!DOCTYPE html>
<html>
<head>
  <title>Embed</title>
  <!-- <link rel="alternate" type="application/json+oembed" href="${c.env.Host}/v2/${slug}/oembed.json"> -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${c.env.Host}/v2/~/${slug}">
  <meta property="og:title" content="${embed.data.title || ""}">
  <meta property="og:image" content="${embed.data.thumbnail || `https://dummyimage.com/${embed.data.width}x${embed.data.height}/000000/fff&text=+`}">
  <meta property="og:video" content="${embed.data.src}">
</head>
<body>
</body>
</html>
  `);
});

v2.get("/~/:slug/oembed.json", async (c) => {
  const slug = c.req.param("slug");
  const data = await c.env.Slugs.get(slug);
  if (!data) {
    c.status(404);
    return c.json({ error: "Not found" });
  }
  console.log(data);

  const embed = EmbedSchema.safeParse(JSON.parse(data));
  if (!embed.success) {
    console.error(embed.error);
    c.status(500);
    return c.json({ error: "Database error. Contact admin" });
  }

  return c.json({
    version: "1.0",
    type: "video",
    provider_name: "Liben - Embed Proxy",
    provider_url: c.env.Host,
    title: embed.data.title || "Video",
    width: embed.data.width,
    height: embed.data.height,
    html: `<video src="${embed.data.src}" width="${embed.data.width}" height="${embed.data.height}" controls>`,
  });
});

export default v2;
