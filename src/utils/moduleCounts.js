export const SPECIAL_TESTING_PROMPT_COUNTS = {
  'module-ser-vs-estar': 20,
  'module-ser-vs-estar-2': 20,
  'module-ser-vs-estar-3': 10,
};

export const withPracticeCounts = (module, puenteSentenceCount = 0) => {
  const hasSpecialTestingPrompts = Object.hasOwn(
    SPECIAL_TESTING_PROMPT_COUNTS,
    module.id
  );

  return {
    ...module,
    puenteSentenceCount,
    guidedSentenceCount: hasSpecialTestingPrompts
      ? module.sentenceCount
      : module.sentenceCount + puenteSentenceCount,
    testingSentenceCount:
      (hasSpecialTestingPrompts
        ? SPECIAL_TESTING_PROMPT_COUNTS[module.id]
        : module.sentenceCount) + puenteSentenceCount,
  };
};
