import { describe, expect, it } from 'vitest'
import { resolveDesktopWindowSize } from '@/services/desktopWindow'

describe('desktop window sizing', () => {
  it('uses a larger proportional default on a full HD work area', () => {
    expect(resolveDesktopWindowSize({ width: 1920, height: 1040 })).toEqual({
      width: 980,
      height: 915,
    })
  })

  it('keeps the default inside a smaller laptop work area', () => {
    expect(resolveDesktopWindowSize({ width: 1366, height: 728 })).toEqual({
      width: 751,
      height: 680,
    })
  })

  it('restores a saved size but clamps it to the current work area', () => {
    expect(
      resolveDesktopWindowSize({ width: 1366, height: 728 }, { width: 1500, height: 1000 }),
    ).toEqual({
      width: 980,
      height: 704,
    })
  })
})
