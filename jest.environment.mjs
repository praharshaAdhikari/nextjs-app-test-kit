import { TestEnvironment } from 'jest-environment-jsdom';

/**
 * jsdom, plus the web APIs that Node has and jsdom does not: fetch, Request, Response, Headers,
 * TextEncoder, streams, structuredClone. Without them, `new Response(...)` in a component test
 * throws and code that calls fetch has nothing to stub.
 *
 * Only fills gaps: jsdom's own FormData, Blob, URL and AbortController stay, because Node's
 * versions don't work with DOM elements (`new FormData(formElement)` would throw).
 */
const FROM_NODE = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'TextEncoder',
  'TextDecoder',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'structuredClone',
  'BroadcastChannel',
];

export default class JsdomWithFetchEnvironment extends TestEnvironment {
  constructor(...args) {
    super(...args);
    for (const name of FROM_NODE) {
      if (this.global[name] === undefined) this.global[name] = globalThis[name];
    }
  }
}
