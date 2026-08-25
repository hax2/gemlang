const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'src', 'data', 'modules-manifest.json');
const modulesDir = path.join(__dirname, 'src', 'data', 'modules');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
let failures = 0;
const modules = [];
const normalize = (value) => value.normalize('NFC').toLocaleLowerCase('es');
const levelRank = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const cefrRank = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
let previousLevel = 0;
let previousCefr = 0;

for (const manifestModule of manifest) {
  const modulePath = path.join(modulesDir, manifestModule.file);

  if (!fs.existsSync(modulePath)) {
    console.error(`Missing module file: ${manifestModule.file}`);
    failures++;
    continue;
  }

  const moduleData = JSON.parse(fs.readFileSync(modulePath, 'utf-8'));
  modules.push(moduleData);
  let sentenceCount = Array.isArray(moduleData.sentences) ? moduleData.sentences.length : 0;
  if (moduleData.specialPractice === 'ser-estar-rules' && Array.isArray(moduleData.rules)) {
    sentenceCount = moduleData.rules.reduce((total, rule) => {
      const examples = Array.isArray(rule.examples) ? rule.examples.length : 0;
      const translations = Array.isArray(rule.translations) ? rule.translations.length : 0;
      return total + examples + translations;
    }, 0);
  }

  if (moduleData.id !== manifestModule.id) {
    console.error(
      `ID mismatch for ${manifestModule.file}: manifest has ${manifestModule.id}, file has ${moduleData.id}`
    );
    failures++;
  }

  if (sentenceCount !== manifestModule.sentenceCount) {
    console.error(
      `Count mismatch for ${manifestModule.id}: manifest has ${manifestModule.sentenceCount}, file has ${sentenceCount}`
    );
    failures++;
  }

  if (manifestModule.level !== moduleData.level || manifestModule.cefr !== moduleData.cefr) {
    console.error(`Level metadata mismatch for ${manifestModule.id}`);
    failures++;
  }

  const currentLevel = levelRank[moduleData.level] || 0;
  const currentCefr = cefrRank[moduleData.cefr] || 0;
  if (!currentLevel || currentLevel < previousLevel) {
    console.error(`Level order regresses at ${manifestModule.id}`);
    failures++;
  }
  if (!currentCefr || currentCefr < previousCefr) {
    console.error(`CEFR order regresses at ${manifestModule.id}`);
    failures++;
  }
  previousLevel = currentLevel;
  previousCefr = currentCefr;

  const targets = Array.isArray(moduleData.learningTargets) ? moduleData.learningTargets : [];
  if (targets.length < 5 || targets.length > 15) {
    console.error(`Learning-target load for ${manifestModule.id} is ${targets.length}; expected 5–15`);
    failures++;
  }
  if (new Set(targets.map(normalize)).size !== targets.length) {
    console.error(`Duplicate learning target in ${manifestModule.id}`);
    failures++;
  }
  if (manifestModule.learningTargetCount !== targets.length) {
    console.error(`Learning-target count mismatch for ${manifestModule.id}`);
    failures++;
  }

  const availableTargets = new Set(
    (moduleData.sentences || []).flatMap((sentence) =>
      Object.keys(sentence.wordMeanings || {}).map(normalize)
    )
  );
  if (moduleData.specialPractice === 'ser-estar-rules') {
    moduleData.rules.forEach((rule) => {
      const texts = [
        ...rule.examples.map(
          (example) => `${example.prompt || ''} ${example.correct || ''} ${example.continuation || ''}`
        ),
        ...rule.translations.map((translation) => translation.spanish),
      ];
      texts.forEach((text) => {
        (normalize(text).match(/[\p{L}\p{M}]+/gu) || []).forEach((word) =>
          availableTargets.add(word)
        );
      });
    });
    Object.keys(moduleData.vocabulary || {}).map(normalize).forEach((word) =>
      availableTargets.add(word)
    );
  }
  targets.forEach((target) => {
    if (!availableTargets.has(normalize(target))) {
      console.error(`Learning target "${target}" is not available in ${manifestModule.id}`);
      failures++;
    }
  });

  const sentenceIds = (moduleData.sentences || []).map((sentence) => sentence.id);
  if (new Set(sentenceIds).size !== sentenceIds.length) {
    console.error(`Duplicate sentence ID in ${manifestModule.id}`);
    failures++;
  }
}

const annotatedExposures = new Map();
modules.forEach((moduleData) => {
  (moduleData.sentences || []).forEach((sentence) => {
    Object.keys(sentence.wordMeanings || {}).forEach((target) => {
      const key = normalize(target);
      annotatedExposures.set(key, (annotatedExposures.get(key) || 0) + 1);
    });
  });
  if (moduleData.specialPractice === 'ser-estar-rules') {
    moduleData.rules.forEach((rule) => {
      const texts = [
        ...rule.examples.map(
          (example) => `${example.prompt || ''} ${example.correct || ''} ${example.continuation || ''}`
        ),
        ...rule.translations.map((translation) => translation.spanish),
      ];
      texts.forEach((text) => {
        const tokens = normalize(text).match(/[\p{L}\p{M}]+/gu) || [];
        tokens.forEach((token) => {
          annotatedExposures.set(token, (annotatedExposures.get(token) || 0) + 1);
        });
      });
    });
  }
});

const introducedTargets = new Set();
modules.forEach((moduleData) => {
  const targets = moduleData.learningTargets.map(normalize);
  const newTargets = targets.filter((target) => !introducedTargets.has(target));
  if (moduleData.type === 'review' && newTargets.length > 0) {
    console.error(`Review ${moduleData.id} introduces targets: ${newTargets.join(', ')}`);
    failures++;
  }
  if (moduleData.id.startsWith('story-') && newTargets.length > 3) {
    console.error(`Story ${moduleData.id} introduces ${newTargets.length} targets; maximum is 3`);
    failures++;
  }
  targets.forEach((target) => {
    introducedTargets.add(target);
    if ((annotatedExposures.get(target) || 0) < 2) {
      console.error(`Learning target "${target}" has fewer than two course exposures`);
      failures++;
    }
  });
});

if (failures > 0) {
  process.exit(1);
}

console.log('Module data ok');
