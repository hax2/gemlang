# GemLang curriculum audit

Generated with:

```sh
node scripts/audit-curriculum.cjs
```

## Counting definitions

- **Word token:** one case-insensitive Spanish orthographic word in learner-facing Spanish text. Accents are preserved, so `si` and `sí` remain distinct.
- **Unique word:** a distinct normalized surface form. Inflections such as `hablo`, `hablas`, and `habló` count separately; this is not a lemma count.
- **Learning target:** one distinct key explicitly selected for the app's end-of-module “Key Words to Keep” recap. A target can be a word or a phrase such as `fin de semana`; other sentence glosses remain available as support vocabulary.
- **New word/target:** its first appearance in manifest order.
- **Prior token coverage:** the percentage of running words in a module that occurred in an earlier module.
- **Annotated exposure:** one sentence annotation for a learning target. For the special ser/estar modules, this is one appearance recognized by the app's ser/estar meaning map.

Conjugated forms and phrases can be separate learning targets, so the target total should not be interpreted as a dictionary-headword or lemma count.

## Files

- `module-summary.csv`: load, novelty, coverage, and repetition for every module.
- `word-by-module-frequency.csv`: exact frequency matrix for all 1,481 Spanish surface forms across all 70 modules.
- `learning-target-frequency.csv`: exposure count, module recurrence, and first introduction for every recap target.
- `summary.json`: headline corpus totals.

## Snapshot findings

- 70 modules contain 1,898 learner items and 9,963 Spanish word tokens.
- The corpus uses 1,559 distinct Spanish surface forms and teaches 578 explicit recap targets.
- No target receives only one annotated course exposure; 460 targets (79.6%) receive at least three.
- 455 targets (78.7%) recur in at least two modules.
- 289 targets (50.0%) receive at least five annotated exposures.
- Reviews introduce no new surface forms or targets, which is strong sequencing hygiene.
- Core stories introduce no more than three new targets each.
- Short practical modules now include additional contextual practice; literary modules are explicitly classified as enrichment readings.
- Formerly templated modules 37–43 now contain 30 items each, combining controlled repetition with questions, narration, and communicative contexts.
