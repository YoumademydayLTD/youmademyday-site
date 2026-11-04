// Route matching: "METHOD /path" with ":name" segments (pure, unit-tested).
export interface RouteMatch<H> { handler: H; params: Record<string, string>; key: string }
export interface Route<H> { method: string; pattern: string; handler: H }

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split("/");
  const got = path.split("/");
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i += 1) {
    const part = want[i] ?? "";
    const value = got[i] ?? "";
    if (part.startsWith(":")) {
      if (!value) return null;
      params[part.slice(1)] = decodeURIComponent(value);
    } else if (part !== value) return null;
  }
  return params;
}

export function matchRoute<H>(routes: Route<H>[], method: string, path: string): RouteMatch<H> | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPath(route.pattern, path);
    if (params) return { handler: route.handler, params, key: `${route.method} ${route.pattern}` };
  }
  return null;
}
