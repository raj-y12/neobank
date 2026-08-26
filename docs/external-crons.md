# External cron jobs

The scheduled jobs are intentionally run by an external cron provider. They are required for production, but deployment/configuration must be confirmed before claiming the recovery path is operational. Configure both jobs against the production deployment:

| Job | Method | URL | Schedule |
| --- | --- | --- | --- |
| Lithic recovery | `GET` | `https://neobank-blush.vercel.app/api/jobs/lithic-recovery` | Every 5 minutes |
| Standing orders | `POST` | `https://neobank-blush.vercel.app/api/jobs/standing-orders` | Daily at 07:00 UTC |

For each request, add this header:

```text
Authorization: Bearer <the same CRON_SECRET configured in Vercel>
```

Use a long random value for `CRON_SECRET`; never put it in this repository or in a URL. The standing-order job is idempotent, so a retry is safe. The Lithic recovery job only replays events older than its recovery window.
