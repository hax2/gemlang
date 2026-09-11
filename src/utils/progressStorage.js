export const emptyProgress = () => ({
  modules: {}, lastModuleId: null, lastPracticeMode: 'guided',
  hasChosenLevel: false, startingModuleId: null,
});

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;

export function normalizeProgress(value) {
  const result = emptyProgress();
  if (!isRecord(value)) return result;
  if (isRecord(value.modules)) {
    for (const [id, entry] of Object.entries(value.modules)) {
      if (!isRecord(entry) || !/^(module|review|story)-[a-z0-9-]+$/.test(id)) continue;
      const totalSentences = count(entry.totalSentences);
      result.modules[id] = {
        currentIndex: Math.min(count(entry.currentIndex), totalSentences),
        totalSentences,
        completedAt: date(entry.completedAt),
        lastAccessedAt: date(entry.lastAccessedAt),
        confidence: ['confident', 'somewhat', 'needsRefresh'].includes(entry.confidence) ? entry.confidence : 'needsRefresh',
        timesCompleted: count(entry.timesCompleted),
        practiceMode: entry.practiceMode === 'testing' ? 'testing' : 'guided',
      };
    }
  }
  result.hasChosenLevel = typeof value.hasChosenLevel === 'boolean'
    ? value.hasChosenLevel : Object.keys(result.modules).length > 0;
  result.lastModuleId = typeof value.lastModuleId === 'string' ? value.lastModuleId : null;
  result.startingModuleId = typeof value.startingModuleId === 'string' ? value.startingModuleId : null;
  result.lastPracticeMode = value.lastPracticeMode === 'testing' ? 'testing' : 'guided';
  return result;
}

export function parseProgressBackup(text) {
  const backup = JSON.parse(text);
  if (!isRecord(backup) || backup.app !== 'gemlang' || backup.version !== 1 ||
      !isRecord(backup.progress) || !isRecord(backup.progress.modules)) {
    throw new Error('Choose a GemLang progress backup (.json).');
  }
  return normalizeProgress(backup.progress);
}

// Restore is additive: keep completed work and prefer the furthest unfinished position.
export function mergeProgress(current, incoming) {
  const merged = normalizeProgress(current);
  const restored = normalizeProgress(incoming);
  for (const [id, entry] of Object.entries(restored.modules)) {
    const existing = merged.modules[id];
    if (!existing || (!existing.completedAt && (entry.completedAt || entry.currentIndex > existing.currentIndex)) ||
        (existing.completedAt && entry.completedAt && Date.parse(entry.completedAt) > Date.parse(existing.completedAt))) {
      merged.modules[id] = entry;
    }
  }
  merged.hasChosenLevel ||= restored.hasChosenLevel;
  merged.startingModuleId ||= restored.startingModuleId;
  merged.lastModuleId ||= restored.lastModuleId;
  return merged;
}
