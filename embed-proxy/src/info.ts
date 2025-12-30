import { Context } from "hono";

export default function info(c: Context): Response {
  return c.text(
    `
Simple Embed Proxy
==================

v1 Usage:
---------

/?src=<video-url>&width=<width>&height=<height>
or
/v1/?src=<video-url>&width=<width>&height=<height>

Example:

/?src=https%3A%2F%2Fexample.com%2Fvideo.mp4&width=480&height=360



v2 Usage:
---------

/v2/<slug>

How to add a new embed:
POST /v2/add
-->
{
  "src": "https://example.com/video.mp4",
}

<--
{
  "slug": "my-video-ffff"
}

  `.trim(),
  );
}
