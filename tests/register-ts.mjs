import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') return { url: specifier, shortCircuit: true };
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) && context.parentURL) {
      const url = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(url)) return nextResolve(url.href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'cloudflare:workers')
      return {
        format: 'module',
        source: 'export const env = globalThis.__testCloudflareEnv ||= {};',
        shortCircuit: true,
      };
    return nextLoad(url, context);
  },
});
