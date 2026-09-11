export function mergeReviewCards(base, reviews) {
  const cards = [...base];
  for (const review of reviews) cards.splice(Math.min(review.index, cards.length), 0, review.item);
  return cards;
}

export function scheduleReview(cards, reviews, currentIndex) {
  const current = cards[currentIndex];
  if (!current || current.type !== 'sentence') return reviews;
  if (cards.slice(currentIndex + 1).some((card) => card.isRepeat && card.data.id === current.data.id)) return reviews;
  return [...reviews, {
    index: Math.min(currentIndex + 4, cards.length),
    item: { ...current, isRepeat: true },
  }];
}
