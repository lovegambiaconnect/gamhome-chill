# Gamhome&Chill

**Your Home. Your Movies. Your Entertainment.**

Gamhome&Chill is an independent streaming platform for movies, series, short films and creator channels, with a focus on Gambian and African storytelling.

## Platform features
- Viewer registration and sign-in through Supabase Auth
- Public library of approved movies and videos
- Creator profiles and private video uploads for moderation
- Private video storage and signed playback URLs
- Creator studio with stream progress, revenue and payout history
- Admin moderation queue
- Hybrid monetization foundation for qualified streams, advertisements, subscriptions and movie rentals

## Creator monetization rules
- Eligibility: 10,000 qualified streams
- Qualified stream: at least 30 seconds of playback, with server-side heartbeat validation
- Minimum payout: USD 20 equivalent
- Payout currency: GMD
- Schedule: monthly, after approval
- FX rate: captured from the payout provider at processing time

Revenue shares are not hard-coded; the platform records creator earnings after the applicable commercial terms are configured.

## Technical stack
- Static HTML, CSS and JavaScript frontend
- Supabase Auth, Postgres and Storage
- Supabase Edge Function for authenticated stream heartbeats
- Vercel hosting and GitHub source control

## Important deployment notes
The creator payout ledger and approval workflow are in place. Actual automatic disbursement requires a supported outgoing payout provider and its credentials. Rental and subscription checkout also require a payment provider configuration. Never expose the Supabase service-role key in browser code.
