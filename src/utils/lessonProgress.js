export function isProgressItem(item, specialPractice = false) {
  return specialPractice
    ? item.type === 'ser-estar-choice' || item.type === 'ser-estar-translation'
    : item.type === 'sentence';
}

export function getResumeIndex(items, savedCount, specialPractice = false) {
  if (savedCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < items.length; index++) {
    if (isProgressItem(items[index], specialPractice)) seen++;
    if (seen >= savedCount) return Math.min(index + 1, items.length);
  }
  return 0;
}
