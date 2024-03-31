import { Hono } from 'hono';
import v1 from './v1';
import v2 from './v2';
import info from './info';

export type AppT = {
  Bindings: {
    Host: string;
    Slugs: KVNamespace;
  };
};

const app = new Hono<AppT>({
  strict: false,
});

app.route('/v1', v1);
app.route('/v2', v2);

app.get('/', (c) => {
  if (
    c.req.query('src') &&
    c.req.query('width') &&
    c.req.query('height')
  ) {
    const url = new URL(c.req.url);
    return c.redirect('/v1/?' + url.searchParams.toString());
  }

  return info(c);
});

export default app;
