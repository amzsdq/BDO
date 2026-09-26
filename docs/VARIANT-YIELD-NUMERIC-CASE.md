# Discriminating live variant-yield case

BDO Codex KR recipe 169 and recipe 637 both produce item 9601, but the current pages report different base-yield ranges: 169 is 1-4 and 637 is 1.

A target of 100 outputs with the maximum-yield policy must therefore require 25 attempts for the variant bound to source recipe 169 and 100 attempts for the variant bound to source recipe 637. Under the minimum-yield policy both require 100 attempts, so a minimum-only regression would fail to detect recipe-level yield flattening.

For 100 craft attempts and item 9601 weight 0.10 LT, a later output-weight estimate must show 10-40 LT for the 169-bound variant and exactly 10 LT for the 637-bound variant. Random/higher-grade outputs are excluded unless separately modeled with verified evidence.
