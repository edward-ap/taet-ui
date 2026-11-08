# Preview version recommendations

These are project recommendations for preview releases; the maintainer confirms
each public version/tag. This document does not change the current version or
create a new compatibility guarantee.

0.6.0-rc.6 is a preview, not a 1.0 compatibility promise. Stable root and
experimental API are listed separately in STABLE_API.md. Import tiers describe
architecture; they do not change maturity.

Before 1.0, minor releases may introduce documented breaking changes. Patch
releases fix bugs without intentional public contract changes. Experimental APIs
may evolve; record migrations instead of silently changing their meaning.

Keep package.json/package-lock.json versions and generated bundle banners in sync.
Use a new rc number for changed artifacts after a public candidate has been released.
Never replace files under an already published tag/version with different bytes.
A release identifies its exact Git commit and asset hashes. Validate the final
candidate after all source/documentation edits, not only its previous runtime build.

The initial migration kept private:true. Explicit maintainer authorization now
prepares rc.4 for public npm publication with publishConfig.tag=next, alongside a
GitHub prerelease. These remain separate outcomes: confirm registry availability
and remote release assets independently; a local tarball is not publication.
