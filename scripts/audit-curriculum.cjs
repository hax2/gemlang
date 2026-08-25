const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = require(path.join(root, 'src/data/modules-manifest.json'));
const modulesDir = path.join(root, 'src/data/modules');
const outputDir = path.resolve(process.argv[2] || path.join(root, 'reports/curriculum-audit'));

const lessonPlayerSource = fs.readFileSync(path.join(root, 'src/components/LessonPlayer.jsx'), 'utf8');
const serEstarMeaningsMatch = lessonPlayerSource.match(
  /const SER_ESTAR_WORD_MEANINGS = (\{[\s\S]*?\n\});/
);
const serEstarMeanings = serEstarMeaningsMatch
  ? vm.runInNewContext(`(${serEstarMeaningsMatch[1]})`)
  : {};

const normalize = (value) => value.normalize('NFC').toLocaleLowerCase('es');
const tokenize = (value) =>
  normalize(value).match(/[\p{L}\p{M}]+(?:[’'][\p{L}\p{M}]+)*/gu) || [];
const csvCell = (value) => {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
};
const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';

const getTexts = (module) => {
  if (module.specialPractice === 'ser-estar-rules') {
    return module.rules.flatMap((rule) => [
      ...rule.examples.map(
        (example) => `${example.prompt || ''} ${example.correct || ''} ${example.continuation || ''}`
      ),
      ...rule.translations.map((translation) => translation.spanish),
    ]);
  }
  return module.sentences.map((sentence) => sentence.spanish);
};

// Mirrors the vocabulary recap logic in LessonPlayer: ordinary modules use
// wordMeanings keys; the three special ser/estar modules use their meaning map.
const getAnnotatedTargetCounts = (module) => {
  const counts = new Map();
  if (module.specialPractice === 'ser-estar-rules') {
    getTexts(module).forEach((text) => {
      text.split(/\s+/).forEach((rawWord) => {
        const word = rawWord.replace(/[.,¿?¡!]/g, '');
        const key = normalize(word);
        if (serEstarMeanings[key] || serEstarMeanings[word]) {
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
    });
    Object.keys(module.vocabulary || {}).forEach((key) => {
      const normalizedKey = normalize(key);
      if (!counts.has(normalizedKey)) counts.set(normalizedKey, 0);
    });
    return counts;
  }

  module.sentences.forEach((sentence) => {
    Object.keys(sentence.wordMeanings || {}).forEach((target) => {
      const key = normalize(target);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return counts;
};

const courseModules = manifest.map((manifestModule) =>
  require(path.join(modulesDir, manifestModule.file))
);
const configuredTargets = new Set(
  courseModules.flatMap((module) => (module.learningTargets || []).map(normalize))
);
const targetIntroductions = new Map();
courseModules.forEach((module, index) => {
  (module.learningTargets || []).forEach((target) => {
    const key = normalize(target);
    if (!targetIntroductions.has(key)) {
      targetIntroductions.set(key, { firstModuleNumber: index + 1, firstModuleId: module.id });
    }
  });
});

const seenWords = new Set();
const seenTargets = new Set();
const globalWordCounts = new Map();
const globalTargetStats = new Map();
const moduleWordCounts = new Map();
const moduleRows = [];

courseModules.forEach((module, index) => {
  const texts = getTexts(module);
  const tokens = texts.flatMap(tokenize);
  const wordCounts = new Map();
  tokens.forEach((word) => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    globalWordCounts.set(word, (globalWordCounts.get(word) || 0) + 1);
  });
  moduleWordCounts.set(module.id, wordCounts);

  const annotatedTargetCounts = getAnnotatedTargetCounts(module);
  const moduleTargetSet = Array.isArray(module.learningTargets)
    ? new Set(module.learningTargets.map(normalize))
    : new Set(annotatedTargetCounts.keys());
  const targetCounts = new Map(
    [...annotatedTargetCounts].filter(([target]) => moduleTargetSet.has(target))
  );
  annotatedTargetCounts.forEach((exposures, target) => {
    if (!configuredTargets.has(target)) return;
    const current = globalTargetStats.get(target) || {
      exposures: 0,
      modules: 0,
      ...targetIntroductions.get(target),
    };
    current.exposures += exposures;
    current.modules += 1;
    globalTargetStats.set(target, current);
  });

  const newWords = [...wordCounts.keys()].filter((word) => !seenWords.has(word));
  const newTargets = [...targetCounts.keys()].filter((target) => !seenTargets.has(target));
  const previouslySeenTokens = tokens.filter((word) => seenWords.has(word)).length;
  const exactDuplicateItems = texts.length - new Set(texts.map((text) => normalize(text.trim()))).size;

  wordCounts.forEach((_, word) => seenWords.add(word));
  targetCounts.forEach((_, target) => seenTargets.add(target));

  moduleRows.push({
    sequence: index + 1,
    id: module.id,
    title: module.title,
    type: module.type || 'lesson',
    level: module.level,
    cefr: module.cefr,
    items: texts.length,
    tokens: tokens.length,
    uniqueWords: wordCounts.size,
    newWords: newWords.length,
    priorTokenCoverage: tokens.length ? (previouslySeenTokens / tokens.length) * 100 : 0,
    learningTargets: targetCounts.size,
    newLearningTargets: newTargets.length,
    targetAnnotations: [...targetCounts.values()].reduce((sum, count) => sum + count, 0),
    onceInModule: [...wordCounts.values()].filter((count) => count === 1).length,
    exactDuplicateItems,
    cumulativeTargets: seenTargets.size,
  });
});

fs.mkdirSync(outputDir, { recursive: true });

const moduleHeader = [
  'sequence', 'module_id', 'title', 'type', 'level', 'cefr', 'items', 'tokens', 'unique_words',
  'new_words', 'prior_token_coverage_pct', 'learning_targets', 'new_learning_targets',
  'target_annotations', 'words_seen_once_in_module', 'exact_duplicate_items',
  'cumulative_learning_targets',
];
const moduleCsvRows = moduleRows.map((row) => [
  row.sequence, row.id, row.title, row.type, row.level, row.cefr, row.items, row.tokens, row.uniqueWords,
  row.newWords, row.priorTokenCoverage.toFixed(1), row.learningTargets, row.newLearningTargets,
  row.targetAnnotations, row.onceInModule, row.exactDuplicateItems, row.cumulativeTargets,
]);
fs.writeFileSync(path.join(outputDir, 'module-summary.csv'), toCsv([moduleHeader, ...moduleCsvRows]));

const sortedWords = [...globalWordCounts.keys()].sort((a, b) => a.localeCompare(b, 'es'));
const matrixHeader = ['word', 'total', 'modules_used', ...manifest.map((module) => module.id)];
const matrixRows = sortedWords.map((word) => {
  const moduleCounts = manifest.map((module) => moduleWordCounts.get(module.id).get(word) || 0);
  return [word, globalWordCounts.get(word), moduleCounts.filter(Boolean).length, ...moduleCounts];
});
fs.writeFileSync(
  path.join(outputDir, 'word-by-module-frequency.csv'),
  toCsv([matrixHeader, ...matrixRows])
);

const targetHeader = [
  'learning_target', 'annotated_exposures', 'modules_used', 'first_module_sequence', 'first_module_id',
];
const targetRows = [...globalTargetStats.entries()]
  .sort(([a], [b]) => a.localeCompare(b, 'es'))
  .map(([target, stats]) => [
    target, stats.exposures, stats.modules, stats.firstModuleNumber, stats.firstModuleId,
  ]);
fs.writeFileSync(
  path.join(outputDir, 'learning-target-frequency.csv'),
  toCsv([targetHeader, ...targetRows])
);

const totalItems = moduleRows.reduce((sum, row) => sum + row.items, 0);
const totalTokens = moduleRows.reduce((sum, row) => sum + row.tokens, 0);
const targetValues = [...globalTargetStats.values()];
const oneExposureTargets = targetValues.filter((target) => target.exposures === 1).length;
const oneModuleTargets = targetValues.filter((target) => target.modules === 1).length;
const targetsWithThreeExposures = targetValues.filter((target) => target.exposures >= 3).length;
const targetsWithFiveExposures = targetValues.filter((target) => target.exposures >= 5).length;
const targetsInMultipleModules = targetValues.filter((target) => target.modules >= 2).length;
const summary = {
  modules: manifest.length,
  learnerItems: totalItems,
  spanishWordTokens: totalTokens,
  uniqueSpanishWordForms: globalWordCounts.size,
  uniqueLearningTargets: globalTargetStats.size,
  learningTargetsWithOneAnnotatedExposure: oneExposureTargets,
  learningTargetsUsedInOnlyOneModule: oneModuleTargets,
  learningTargetsWithAtLeastThreeExposures: targetsWithThreeExposures,
  learningTargetsWithAtLeastFiveExposures: targetsWithFiveExposures,
  learningTargetsUsedInMultipleModules: targetsInMultipleModules,
};
fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Curriculum audit written to ${outputDir}`);
console.log(summary);
