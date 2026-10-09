Local pilot build preparation; no push, deploy, Auth or database activation.

Production now requires build-inputs/amrigs/pilot-readback.json. This checked-in
template remains pending: no canonical participant, access grant, origin, policy
readback fingerprint or active window has been confirmed. It contains no email,
name, account UUID, password, token or secret. Do not put participant data in it.
Independent corpus/storage preparation evidence remains recorded separately;
false fields here mean no complete pilot-specific receipt has been recorded.

The build gate binds one question/image, canonical project, exact approved origin,
reviewed access mode and a window of at most 24 hours. An individual egresso also
requires a separate confirmed canonical identity and individual grant. The JSON
is a reviewed build prerequisite, not authentication or cryptographic proof of
remote state. Server RLS remains the actual access control. Browser timers cannot
replace server-side grant expiry or shutdown/rollback.

The public auth-config contains only a scoped ready-for-positive-test contract,
selected question/image, expiry and honest verification limits. It never claims
whole-corpus validation or turns unperformed image SHA/JWT tests into successes.
The browser accepts only that question/image during the pilot and refuses expired
contracts. The existing authenticated download checks the original SHA256.

Both fixture and eventual hosted output contain ZERO protected PNGs. The original
31 images and their manifest hashes are preserved outside the static output.
Fixtures remain local only; CI/Pages rejects the fixture switch. No fixture key,
secret key or service_role may be used in the eventual hosted build. Google stays
off; no callbacks were changed. Existing password login does not require a new
callback; a future invitation/password-creation flow needs a separate review.

The shell can display a future neutral egresso profile, without treating that
label as institutional enrollment or authorization. This creates no role/account
in the database. The identified legacy egresso has no canonical account: the
former institutional-learner SQL cannot be applied to that situation. No copying
legacy UUID as canonical UUID, password/hash/session, or inventing enrollment.

Fields unchanged: Framework None, root empty, npm run build:pages,
apps/shell/hosted-dist, Node 22.23.2, SKIP_DEPENDENCY_INSTALL=1, canonical Supabase
publishable already existing. Exact origin is still pending. Receipt updates and
push/deploy require review after the additional account/access approval.

Tests are local/synthetic. These changes do not certify an Auth invitation,
canonical egresso eligibility, Storage remote bytes or positive delivery flow.
