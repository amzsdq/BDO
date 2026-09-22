# Release-blocking end-to-end acceptance

These scenarios are the minimum real-user flows required before `PROGRAM_COMPLETE`. Unit tests and a successful production build do not replace them. Run against the promoted `COMPLETE_VERIFIED` KR dataset, not the sample fallback.

## Global preconditions

- production dataset passes `data:release-gate` with `ZERO_UNEXPLAINED_DIFF`;
- every referenced local icon asset is installed and resolvable;
- fresh browser profile starts with no planner local state;
- desktop and narrow/mobile viewport runs are both required;
- keyboard-only execution is required for search and primary controls.

## E2E-01 Cooking output target

1. Search a Cooking result by Korean partial text and by choseong.
2. Select it using the keyboard.
3. Enter a desired output quantity.
4. Verify the planner converts output to craft attempts using the selected yield policy.
5. Verify required / owned / missing quantities are readable and update after owned inventory changes.
6. Tick materials and reload; checklist and inventory must persist.

Pass: the same selected recipe/variant drives summary, material plan, batch weight and checklist.

## E2E-02 Cooking utensil durability + mastery

1. Select a Cooking recipe and enter utensil durability uses.
2. Enter a source-verified Cooking mastery breakpoint.
3. Verify minimum, expected, 95% and maximum material-serving preparation policies are clearly distinguished.
4. Select each policy and verify the actionable checklist and requested batch weight use that policy's material servings, not raw durability uses.
5. Enter an off-grid mastery value; probabilistic preparation must fail closed rather than interpolate.

Pass: Mass Cooking never equates one durability use to one material serving except the explicitly labelled no-mass minimum baseline.

## E2E-03 Alchemy mastery separation

1. Select an Alchemy recipe.
2. Enter Alchemy mastery.
3. Verify Alchemy effects use the Alchemy model only.
4. Verify no Mass Cooking preparation control or Cooking probability is applied.

Pass: Cooking and Alchemy mastery semantics remain separate through the full UI flow.

## E2E-04 Weight-limited requested batch

1. Enter max LT and reserved/current LT.
2. Request a known recipe-serving/material-batch count.
3. Verify available LT, LT per serving, maximum loadable servings, exact per-item carry quantities and total starting ingredient LT.
4. Request more than capacity and verify a clear warning without silently clipping the requested plan.
5. Use a fixture with unknown ingredient weight and verify capacity math fails closed.

Pass: exact input-load math is never mixed with probabilistic output/peak estimates.

## E2E-05 Intermediate acquire vs craft

1. Select a recipe containing a craftable intermediate.
2. Leave the intermediate as externally acquired and record totals.
3. Switch it to craft; verify recursive base materials replace only the missing intermediate quantity after owned stock is consumed.
4. Where multiple producer recipes or variants exist, explicitly choose each and verify totals change accordingly.

Pass: no alternative producer/variant is silently flattened or lost.

## E2E-06 Multiple simultaneous targets

1. Add at least one Cooking and one Alchemy target to one batch plan.
2. Include a shared ingredient and a shared craftable intermediate.
3. Verify owned inventory is consumed once globally and shortages are aggregated deterministically.
4. Remove one target and verify totals return to the single-target result.

Pass: multi-target aggregation does not double-spend owned inventory.

## E2E-07 Images and fallback

1. Verify target and checklist items with canonical local icons render the installed WebP assets.
2. Force one image request to fail in a non-release fixture and verify the deterministic placeholder appears without layout shift or broken-image chrome.

Pass: the production dataset itself must not rely on missing local assets; fallback is resilience, not release acceptance.

## E2E-08 Persistence, export and reset

1. Set profile, inventory and checklist state.
2. Reload and verify state restoration.
3. Export and verify a versioned snapshot contains the same persisted state.
4. Reset explicitly and verify all persisted planner state is cleared in one action.

Pass: reset is deliberate and export is usable without hidden setup.

## E2E-09 Data failure states

1. Start with missing, malformed and unverified production dataset fixtures.
2. Verify the app labels them as unverified/fallback and never presents them as release-complete data.
3. Restore the promoted dataset and verify the verified state returns.

Pass: completeness and provenance failures are visible and fail closed.

## Completion evidence

For release acceptance, record the exact main commit, dataset fingerprint, reconciliation report fingerprint/timestamp, browser(s), viewport(s), and pass/fail result for every scenario. Any failed scenario keeps the program in `CONTINUE`.
