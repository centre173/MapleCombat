import { describe, expect, it } from 'vitest'
import {
  resolveTooltipPlacement,
  resolveTooltipShift,
  type TooltipRect,
} from '@/components/buffs/tooltipPosition'

const boundary: TooltipRect = { left: 20, right: 220, top: 40, bottom: 300 }

describe('Buff tooltip positioning', () => {
  it('moves a left-edge tooltip right by its exact overflow', () => {
    expect(resolveTooltipShift({ left: 5, right: 105, top: 80, bottom: 104 }, boundary)).toBe(15)
  })

  it('moves a right-edge tooltip left by its exact overflow', () => {
    expect(resolveTooltipShift({ left: 145, right: 235, top: 80, bottom: 104 }, boundary)).toBe(
      -15,
    )
  })

  it('does not move a tooltip already inside both horizontal edges', () => {
    expect(resolveTooltipShift({ left: 55, right: 155, top: 80, bottom: 104 }, boundary)).toBe(0)
  })

  it('places first-row tooltips below when the upper space is insufficient', () => {
    expect(
      resolveTooltipPlacement(
        { left: 40, right: 70, top: 48, bottom: 78 },
        boundary,
        24,
        6,
      ),
    ).toBe('below')
  })

  it('keeps tooltips above when there is enough room', () => {
    expect(
      resolveTooltipPlacement(
        { left: 40, right: 70, top: 120, bottom: 150 },
        boundary,
        24,
        6,
      ),
    ).toBe('above')
  })
})
