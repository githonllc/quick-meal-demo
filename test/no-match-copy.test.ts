import { describe, expect, it } from 'vitest'
import type { UiFilters } from '../src/state/filters'
import { describeFilters } from '../src/state/noMatchCopy'

const NONE: UiFilters = { budget: null, time: null, distance: null, cuisine: null, sort: 'best' }

describe('describeFilters', () => {
  it('joins three parts with a comma and "and"', () => {
    expect(describeFilters({ ...NONE, budget: 15, time: 15, distance: 0.5 })).toBe(
      'Nothing fits a $15 budget, 15 min and 0.5 mi. Here are the closest meals.',
    )
  })
  it('joins two parts with "and"', () => {
    expect(describeFilters({ ...NONE, budget: 15, time: 15 })).toBe(
      'Nothing fits a $15 budget and 15 min. Here are the closest meals.',
    )
  })
  it('names one part alone', () => {
    expect(describeFilters({ ...NONE, budget: 15 })).toBe('Nothing fits a $15 budget. Here are the closest meals.')
  })
  it('adds the cuisine', () => {
    expect(describeFilters({ ...NONE, budget: 10, cuisine: 'chinese' })).toBe(
      'Nothing fits a $10 budget in Chinese. Here are the closest meals.',
    )
  })
  it('handles no budget, time or distance', () => {
    expect(describeFilters(NONE)).toBe('Nothing is open right now.')
    expect(describeFilters({ ...NONE, cuisine: 'sushi' })).toBe('No Sushi places are open nearby.')
  })
})
