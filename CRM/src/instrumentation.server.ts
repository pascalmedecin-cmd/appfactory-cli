import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://a4987c6a60bb49ceaf641612b2fb69df@o4511454624153600.ingest.de.sentry.io/4511454740152400',
  enabled: false,

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});