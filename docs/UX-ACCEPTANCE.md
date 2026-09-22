# UX acceptance — release blocker

The planner is not releasable merely because its calculations are correct.

## Primary task benchmark

A first-time user should be able to:

1. identify Cooking vs Alchemy;
2. find a target by typing its Korean name;
3. choose desired output quantity **or** utensil-use count;
4. read the preparation list without opening a dependency tree;
5. understand required / owned / missing quantities;
6. mark prepared materials complete;
7. return later and retain checklist state.

No account, workspace, setup wizard, or database terminology may precede the first calculation.

## Interaction budget

For an already-known target:
- target search begins immediately on focus;
- selecting a result and entering quantity is sufficient to calculate;
- switching output/attempt mode is one visible control;
- intermediate-craft behavior is editable in context, not hidden in a settings page;
- checking a material is a single click/tap.

## Information hierarchy

Default row:
- icon;
- Korean item name;
- required quantity;
- owned quantity when supplied;
- missing quantity;
- completion checkbox.

Secondary details (source, canonical id, dependency provenance) stay available but visually subordinate.

## Required states

Design and test:
- empty query;
- no search result;
- one result;
- many results;
- very large quantities;
- zero owned stock;
- partial owned stock;
- fully prepared;
- recursive intermediate chain;
- alternative recipe available;
- unresolved/uncertain yield;
- missing icon fallback;
- narrow/mobile layout;
- keyboard-only flow.

## Accessibility floor

- all inputs have programmatic labels;
- visible focus treatment;
- buttons are buttons, not click-only divs;
- checklist controls are keyboard reachable;
- no color-only distinction between Cooking/Alchemy or ready/missing;
- text contrast remains readable;
- reduced-width layout does not hide required/missing quantities.

## Evidence

Before release, capture deterministic screenshots or visual-regression fixtures for the primary states and run at least one real recipe end-to-end against the completeness-verified dataset.
