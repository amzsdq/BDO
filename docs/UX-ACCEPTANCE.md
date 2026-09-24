# UX acceptance — release blocker

The planner is not releasable merely because its calculations are correct.

## Primary task benchmark

A first-time user should be able to:

1. identify Cooking vs Alchemy;
2. find a target by typing its Korean name;
3. choose desired output quantity, recipe/material servings, or utensil-use count;
4. when planning by desired output, choose the visible minimum / expected / maximum yield policy without implying an unverified expected yield is exact;
5. for Cooking utensil-use planning, choose the visible material-preparation policy without equating durability uses to raw servings;
6. read the preparation list without opening a dependency tree;
7. understand required / owned / missing quantities;
8. mark prepared materials complete;
9. return later and retain target mode/policy, inventory, and checklist state.

No account, workspace, setup wizard, or database terminology may precede the first calculation.

## Interaction budget

For an already-known target:
- target search begins immediately on focus;
- selecting a result and entering quantity is sufficient to calculate;
- switching output / material-servings / durability mode is one visible control;
- yield and Cooking preparation policies appear only where they affect the selected mode;
- simultaneous-target chips expose enough mode/policy context to distinguish materially different plans;
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
- minimum / expected / maximum output-yield policies;
- unresolved/uncertain yield with conservative fallback clearly labelled;
- Cooking durability preparation policies including 95% estimate labelling;
- Alchemy durability without Cooking Mass Cooking controls;
- multiple simultaneous targets with different modes/policies;
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

Before release, capture deterministic screenshots or visual-regression fixtures for the primary states and run at least one real recipe end-to-end against the completeness-verified dataset. Synthetic fixtures prove deterministic behavior but do not replace production-dataset acceptance evidence.
