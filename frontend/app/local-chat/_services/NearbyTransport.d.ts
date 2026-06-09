import type { LocalTransport } from "./transport";

/**
 * Type surface shared by the platform implementations
 * (`NearbyTransport.android.ts` / `NearbyTransport.ios.ts`). Metro resolves
 * the concrete file per platform at bundle time; TypeScript reads this.
 */
export declare function createNearbyTransport(): LocalTransport;
