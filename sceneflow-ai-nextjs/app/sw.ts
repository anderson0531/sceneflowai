import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry } from '@serwist/precaching';
import { installSerwist } from '@serwist/sw';

declare global {
  interface WorkerGlobalScope {
    __WB_MANIFEST: PrecacheEntry[];
  }
}

declare const self: WorkerGlobalScope;

installSerwist({
  precacheEntries: self.__WB_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});
