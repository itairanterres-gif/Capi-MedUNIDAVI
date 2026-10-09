This branch contains code and the unchanged 31-image SHA256 manifest only.
Original images remain in the previous local preparation checkout/evidence.
Local fixtures use ignored `.local-assets/amrigs`; never upload fixture output.

Production build is intentionally blocked before installation/output, including
direct shell build calls. No environment flag approves the pending contract.
No bucket, policy, upload, credential or remote change has been performed.

Future integration requires a private bucket in the existing canonical Supabase,
Storage SELECT policy checking current authenticated identity, institutional
eligibility and a linked released AMRIGS question. Merely authenticated is
insufficient. Deny anonymous read/list and browser writes. Verify these controls
against actual Storage before changing this gate. The proposed namespace is the
original package SHA256; preserve every image byte and manifest hash.

The download primitive is wired into the question and error-notebook UI. Every
image is checked against its manifest SHA256 and PNG signature. Answers remain
disabled until required images decode. Errors, including 401/403/404, show a
generic status without SDK tokens. Logout/auth refresh/navigation removes image
sources, revokes owned Blob URLs and discards stale downloads. No public or
signed fallback, persistent image cache or extra dependency is used.
Tests use a synthetic PNG signature and mocked DOM decoding; actual browser
Storage/RLS and real image decoding remain future hosted verification.

Reference: https://supabase.com/docs/guides/storage/serving/downloads
and https://supabase.com/docs/guides/storage/security/access-control

This is a public-code preparation, not a production-ready release. The earlier
CLOUDFLARE-GIT-FIELDS describes proposed dashboard values; production remains
blocked regardless of those values until the private delivery gate is replaced
after implementation and authorization verification.
