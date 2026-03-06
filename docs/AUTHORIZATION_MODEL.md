# Authorization Model

This document describes which resources are **shared** (any admin can manage) vs **owned** (scoped by `createdBy`).

## Shared Resources (Global — any admin)

These resources are site-wide settings or content managed collaboratively. Any authenticated admin can create, read, update, or delete them.

| Resource | Model | Route File |
|----------|-------|------------|
| Header config | `Header` | `header.mjs` |
| Hero section | `HeroContent` | `hero.mjs` |
| Story Hero | `StoryHero` | `storyHero.mjs` |
| Home events | `HomeEvent` | `homeEvents.mjs` |
| Page events | `PageEvent` | `pageEvents.mjs` |
| Seasons | `Season` | `seasons.mjs` |
| Timeline | `TimelineSection`, `TimelinePhase` | `timeline.mjs` |
| Awards | `AwardsSettings` | `awards.mjs` |
| Brand settings | `BrandSettings` | `brandSettings.mjs` |
| CTA sections | `CTA` | `cta.mjs` |
| Training Hero/CTA | `TrainingHero`, `TrainingCTA` | `trainingHero.mjs`, `trainingCTA.mjs` |
| Stats | `Stat` | `stats.mjs` |
| Sponsors | `Sponsor` | `sponsors.mjs` |
| Testimonials | `Testimonial` | `testimonials.mjs` |
| Forms | `Form` | `forms.mjs` |

## Owned Resources (Scoped by `createdBy`)

These resources track which admin created them. Admin queries filter by `createdBy: req.adminId`.

| Resource | Model | Route File | `createdBy` Field |
|----------|-------|------------|-------------------|
| Blogs | `Blog` | `blogs.mjs` | ✅ Required |
| Trainings | `Training` | `trainings.mjs` | ✅ Required |
| Members | `Member` | `members.mjs` | ✅ Required |

## Notes

- With only 1–2 admins, the distinction is mostly for audit trail purposes.
- If the admin count grows, consider adding `createdBy` to shared resources for accountability (not access control).
