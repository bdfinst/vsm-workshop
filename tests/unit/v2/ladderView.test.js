import { describe, it, expect } from 'vitest'
import { TONE } from '../../../src/utils/ui/flaggedSteps.js'
import {
  LABEL_CHAR_WIDTH,
  LABEL_FONT_SIZE,
  LABEL_GAP,
  LABEL_INSET,
  MAX_EQUAL_BOX_WIDTH,
  MIN_EQUAL_BOX_WIDTH,
  MIN_SCALED_BOX_WIDTH,
} from '../../../src/utils/ui/ladderGeometry.js'
import {
  MAX_PIXELS_PER_MINUTE,
  MIN_PIXELS_PER_MINUTE,
  annotationsOf,
  equalBoxWidthFor,
  labelLanes,
  layoutLabels,
  labelOverhangFor,
  pixelsPerMinuteToFit,
  textWidthOf,
} from '../../../src/utils/ui/ladderView.js'
import { LADDER_MODE, sizeLadder } from '../../../src/utils/ui/ladderLayout.js'
import { ladderModel } from '../../../src/utils/ui/ladderModel.js'
import { createStep } from '../../../src/models/v2/step.js'
import { calculateMetrics } from '../../../src/utils/calculations/v2/index.js'
import {
  insertAfter,
  outsideStep,
  referenceSteps,
  reworkSteps,
  team,
  versionOf,
  withStep,
  withoutWait,
} from './fixtures.js'

const CJK_NAME = '価値流れ図の作成と改善のための手順書一覧' // 20 characters, each a full em

const CAPITAL_WIDTH = 0.72 * LABEL_FONT_SIZE

const REFERENCE_MINUTES = 9030 // every wait and process minute of the reference map

const modelOf = (steps) => {
  const version = versionOf(steps)
  return ladderModel(version, calculateMetrics(version).flags)
}

const scaledLayout = (steps, pixelsPerMinute) =>
  sizeLadder(modelOf(steps), { mode: LADDER_MODE.SCALED, pixelsPerMinute })

describe('pixelsPerMinuteToFit', () => {
  it('fits the whole lead time into the available width', () => {
    expect(pixelsPerMinuteToFit(modelOf(referenceSteps()), 900)).toBeCloseTo(
      900 / REFERENCE_MINUTES,
      10
    )
  })

  it('counts an outside step by its elapsed time', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBeCloseTo(
      900 / (REFERENCE_MINUTES + 1440),
      10
    )
  })

  it('never goes below the minimum pixels per minute, so a long stream scrolls', () => {
    const steps = [team('Slow', 60, 1000000)]

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBe(
      MIN_PIXELS_PER_MINUTE
    )
  })

  it('never goes above the maximum pixels per minute, so a short stream is not blown up', () => {
    const steps = [team('Quick', 5, 5)]

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBe(
      MAX_PIXELS_PER_MINUTE
    )
  })

  it('gives a usable pixels per minute when no time is entered', () => {
    const steps = [
      {
        ...team('Intake'),
        processTime: { typ: null },
        waitTime: { typ: null },
      },
    ]

    expect(pixelsPerMinuteToFit(modelOf(steps), 900)).toBe(
      MAX_PIXELS_PER_MINUTE
    )
  })

  it('keeps the whole ladder inside the available width when boxes stay readable', () => {
    const steps = referenceSteps()
    const pixelsPerMinute = pixelsPerMinuteToFit(modelOf(steps), 900)

    const { totalWidth } = scaledLayout(steps, pixelsPerMinute)

    expect(totalWidth).toBeLessThanOrEqual(900)
  })
})

describe('pixelsPerMinuteToFit before the scroller is measured', () => {
  it('gives the minimum pixels per minute for an available width of 0', () => {
    expect(pixelsPerMinuteToFit(modelOf(referenceSteps()), 0)).toBe(
      MIN_PIXELS_PER_MINUTE
    )
  })

  it('gives the maximum for an available width of 0 when no time is entered', () => {
    const steps = [createStep({ name: 'Intake' })]

    expect(pixelsPerMinuteToFit(modelOf(steps), 0)).toBe(MAX_PIXELS_PER_MINUTE)
  })
})

describe('a long stream in a narrow scroller', () => {
  const AVAILABLE_WIDTH = 400
  const fortyOne = () =>
    Array.from({ length: 41 }, (_, index) => team(`Step ${index}`, 60, 120))

  it('is wider than the available width to scale, so its scroller scrolls', () => {
    const pixelsPerMinute = pixelsPerMinuteToFit(
      modelOf(fortyOne()),
      AVAILABLE_WIDTH
    )

    expect(
      scaledLayout(fortyOne(), pixelsPerMinute).totalWidth
    ).toBeGreaterThan(AVAILABLE_WIDTH)
  })

  it('is wider than the available width in equal width, so its scroller scrolls', () => {
    const boxWidth = equalBoxWidthFor(41, AVAILABLE_WIDTH)

    expect(
      sizeLadder(modelOf(fortyOne()), { mode: LADDER_MODE.EQUAL, boxWidth })
        .totalWidth
    ).toBeGreaterThan(AVAILABLE_WIDTH)
  })
})

describe('pixelsPerMinuteToFit with short steps', () => {
  it('keeps the ladder inside the available width although short steps are drawn at the minimum box width', () => {
    const steps = [
      team('Intake', 1, 1),
      team('Tiny', 1, 1),
      team('Development', 480, 960),
      team('Code review', 60, 2880),
    ]
    const pixelsPerMinute = pixelsPerMinuteToFit(modelOf(steps), 900)

    const { totalWidth } = scaledLayout(steps, pixelsPerMinute)

    expect(totalWidth).toBeCloseTo(900, 5)
  })

  it('still keeps every long box proportional to its minutes', () => {
    const intakeAndDevelopment = [
      team('Intake', 1, 1),
      team('Development', 480, 960),
    ]
    const pixelsPerMinute = pixelsPerMinuteToFit(
      modelOf(intakeAndDevelopment),
      900
    )

    const { steps } = scaledLayout(intakeAndDevelopment, pixelsPerMinute)

    expect(steps[1].waitBlock.width / steps[1].processBlock.width).toBeCloseTo(
      2,
      5
    )
  })
})

describe('equalBoxWidthFor', () => {
  it('splits the available width between the steps', () => {
    expect(equalBoxWidthFor(5, 700)).toBe(140)
  })

  it('stays readable for a long stream, which then scrolls', () => {
    expect(equalBoxWidthFor(41, 900)).toBe(MIN_EQUAL_BOX_WIDTH)
  })

  it('does not stretch a few steps across the available width', () => {
    expect(equalBoxWidthFor(2, 900)).toBe(MAX_EQUAL_BOX_WIDTH)
  })

  it('splits evenly in between', () => {
    expect(equalBoxWidthFor(6, 720)).toBe(120)
  })
})

describe('annotationsOf', () => {
  const annotations = (steps, name) =>
    annotationsOf(scaledLayout(steps, 0.1).steps.find((s) => s.name === name))

  it('has none for a plain step', () => {
    expect(annotations(referenceSteps(), 'Development')).toEqual([])
  })

  it('names a handoff', () => {
    const steps = withStep(referenceSteps(), 'Deploy', { isHandoff: true })

    expect(annotations(steps, 'Deploy')).toEqual([
      { text: 'handoff', tone: TONE.HANDOFF },
    ])
  })

  it('names the flags the layout carries', () => {
    expect(annotations(reworkSteps(), 'Code review')).toEqual([
      { text: 'largest wait', tone: TONE.WARN },
      { text: 'lowest %C/A', tone: TONE.CRIT },
    ])
  })

  it('names the times that are not entered', () => {
    const steps = withoutWait(referenceSteps(), 'Deploy')

    expect(annotations(steps, 'Deploy')).toEqual([
      { text: 'needs wait time', tone: TONE.WARN },
    ])
  })

  it('says an outside step is a handoff and outside, with its split unknown', () => {
    const steps = insertAfter(
      referenceSteps(),
      'Code review',
      outsideStep('Security review', 1440)
    )

    expect(annotations(steps, 'Security review')).toEqual([
      { text: 'handoff', tone: TONE.HANDOFF },
      { text: 'outside', tone: TONE.MUTED },
      { text: 'elapsed · split unknown', tone: TONE.MUTED },
    ])
  })
})

describe('annotationsOf with two distinct flagged steps', () => {
  // Code review has the largest wait; Development has the lowest %C/A.
  const steps = () =>
    withStep(
      withStep(referenceSteps(), 'Development', { pctCA: 70 }),
      'Code review',
      {
        pctCA: 80,
      }
    )
  const annotations = (name) =>
    annotationsOf(scaledLayout(steps(), 0.1).steps.find((s) => s.name === name))

  it('writes each flag on the step that earns it', () => {
    expect(annotations('Code review')).toEqual([
      { text: 'largest wait', tone: TONE.WARN },
    ])
    expect(annotations('Development')).toEqual([
      { text: 'lowest %C/A', tone: TONE.CRIT },
    ])
  })
})

describe('annotationsOf for an outside step', () => {
  it('also says "handoff", before "outside"', () => {
    const steps = [outsideStep('Security review', 1440)]

    expect(
      annotationsOf(scaledLayout(steps, 0.1).steps[0]).map(({ text }) => text)
    ).toEqual(['handoff', 'outside', 'elapsed · split unknown'])
  })
})

describe('textWidthOf', () => {
  it('is nothing for no text', () => {
    expect(textWidthOf('')).toBe(0)
  })

  it('takes an ordinary character at LABEL_CHAR_WIDTH', () => {
    expect(textWidthOf('code ride')).toBe('code ride'.length * LABEL_CHAR_WIDTH)
  })

  // Scenario Outline: A label character is measured by its class
  it.each([
    { kind: 'an ordinary character', text: 'e', ems: 2 / 3 },
    { kind: 'a capital', text: 'H', ems: 0.72 },
    { kind: 'a capital with an accent', text: 'É', ems: 0.72 },
    { kind: 'a lower-case m', text: 'm', ems: 0.9 },
    { kind: 'a lower-case w', text: 'w', ems: 0.9 },
    { kind: 'a wide capital W', text: 'W', ems: 1 },
    { kind: 'a wide capital M', text: 'M', ems: 1 },
    { kind: 'an East Asian wide character', text: '価', ems: 1 },
    { kind: 'an emoji', text: '🚀', ems: 1.3 },
    { kind: 'an emoji with a skin tone, one glyph', text: '👍🏽', ems: 1.3 },
    { kind: 'a flag, one glyph', text: '🇯🇵', ems: 1.3 },
    {
      kind: 'a family joined by zero-width joiners, one glyph',
      text: '👨‍👩‍👧',
      ems: 1.3,
    },
    {
      kind: 'an emoji with a presentation selector, one glyph',
      text: '❤️',
      ems: 1.3,
    },
    { kind: 'a letter with a combining accent', text: 'e\u0301', ems: 2 / 3 },
  ])(
    'A label character is measured by its class: $kind at $ems em',
    ({ text, ems }) => {
      expect(textWidthOf(text)).toBeCloseTo(ems * LABEL_FONT_SIZE, 10)
    }
  )

  it('takes a digit, a space and punctuation as ordinary characters', () => {
    expect(textWidthOf('7 %.')).toBe(4 * LABEL_CHAR_WIDTH)
  })

  it('takes a CJK character at a full em, wider than an average one', () => {
    expect([...CJK_NAME]).toHaveLength(20)
    expect(textWidthOf(CJK_NAME)).toBe(20 * LABEL_FONT_SIZE)
    expect(textWidthOf(CJK_NAME)).toBeGreaterThan(20 * LABEL_CHAR_WIDTH)
  })

  it.each([
    ['Hiragana', 'あ'],
    ['Katakana', 'カ'],
    ['Hangul', '한'],
    ['fullwidth Latin', 'Ａ'],
    ['CJK punctuation', '、'],
    ['a CJK character outside the Basic Multilingual Plane', '\u{20BB7}'],
  ])('takes %s at a full em', (_, character) => {
    expect(textWidthOf(character)).toBe(LABEL_FONT_SIZE)
  })

  it('counts a character outside the Basic Multilingual Plane once, not as two halves', () => {
    expect(textWidthOf('\u{20BB7}\u{20BB7}')).toBe(2 * LABEL_FONT_SIZE)
  })

  it.each(['W', 'M'])('takes the wide capital %s at a full em', (capital) => {
    expect(textWidthOf(capital)).toBe(LABEL_FONT_SIZE)
  })

  it('adds the classes up in a mixed name', () => {
    // Q and A are capitals; the two spaces are ordinary; 自, 動, 化, W and M are a full em;
    // m is a wide lower-case letter; the rocket is an emoji.
    expect(textWidthOf('QA 自動化 WM m🚀')).toBeCloseTo(
      2 * CAPITAL_WIDTH +
        3 * LABEL_CHAR_WIDTH +
        5 * LABEL_FONT_SIZE +
        0.9 * LABEL_FONT_SIZE +
        1.3 * LABEL_FONT_SIZE,
      10
    )
  })
})

describe('layoutLabels', () => {
  const layoutOf = (steps, pixelsPerMinute = 0.1) =>
    scaledLayout(steps, pixelsPerMinute).steps

  it('is tied to the font size: a character is at least two thirds of an em wide', () => {
    expect(LABEL_CHAR_WIDTH).toBeGreaterThanOrEqual((LABEL_FONT_SIZE * 2) / 3)
  })

  it('has nothing for no steps', () => {
    expect(layoutLabels([])).toEqual({ labels: [], lanes: [], rightEdge: 0 })
  })

  it('measures a label by its widest line, from the inset, at the conservative width', () => {
    const name = 'plain intake and triage'
    const [step] = layoutOf([team(name, 60, 60)])

    const { labels } = layoutLabels([step])

    expect(labels[0]).toMatchObject({
      step,
      left: step.x + LABEL_INSET,
      labelWidth: name.length * LABEL_CHAR_WIDTH,
    })
    expect(labels[0].lines[0]).toEqual({ text: name, tone: null })
  })

  it('measures a CJK name by the em, so its label is wider than the same count of average characters', () => {
    const steps = layoutOf([team(CJK_NAME, 60, 60)])

    const { labels } = layoutLabels(steps)

    expect(labels[0].labelWidth).toBe(20 * LABEL_FONT_SIZE)
  })

  it('lists the name first and then the annotations', () => {
    const steps = layoutOf(reworkSteps())
    const codeReview = steps.find((s) => s.name === 'Code review')

    const { labels } = layoutLabels([codeReview])

    expect(labels[0].lines.map(({ text }) => text)).toEqual([
      'Code review',
      'largest wait',
      'lowest %C/A',
    ])
  })

  it('reaches past the last box when its label is wider than the box', () => {
    const steps = layoutOf([createStep({ name: 'Intake' })])
    const [intake] = steps

    const { rightEdge } = layoutLabels(steps)

    const label = textWidthOf('needs process time')
    expect(intake.boxWidth).toBeLessThan(label)
    expect(rightEdge).toBe(intake.x + LABEL_INSET + label)
  })

  it('reaches the last box edge when every label is narrower', () => {
    const steps = layoutOf(referenceSteps())
    const last = steps.at(-1)

    expect(layoutLabels(steps).rightEdge).toBe(last.x + last.boxWidth)
  })

  it('gives a long name on an earlier step the right edge', () => {
    const steps = layoutOf([
      team('A very long step name indeed', 1, 1),
      team('Deploy', 600, 600),
    ])

    const { rightEdge, labels } = layoutLabels(steps)

    expect(rightEdge).toBe(
      Math.max(labels[0].right, steps[1].x + steps[1].boxWidth)
    )
  })

  it.each([
    ['capitals', (index) => `HNOGQ ${'H'.repeat(index + 1)}`],
    [
      'lower-case m and w',
      (index) => `${'m'.repeat(index + 1)}${'w'.repeat(3)}`,
    ],
    ['emoji', (index) => `Ship ${'🚀'.repeat(index + 1)}`],
    ['the wide capitals', (index) => `WWWW ${'M'.repeat(index + 1)}`],
  ])('Names heavy in %s never overlap on one lane', (_, nameFor) => {
    const steps = layoutOf(
      Array.from({ length: 12 }, (_, index) => team(nameFor(index), 5, 5))
    )

    const { labels, lanes } = layoutLabels(steps)

    const byLane = Object.groupBy(
      labels.map((label, index) => ({ ...label, lane: lanes[index] })),
      ({ lane }) => lane
    )
    for (const inLane of Object.values(byLane)) {
      inLane.slice(1).forEach((label, index) => {
        expect(label.left).toBeGreaterThanOrEqual(
          inLane[index].right + LABEL_GAP
        )
      })
    }
  })

  it('reaches as far as an emoji name is wide, so the last label is not clipped', () => {
    const name = 'Ship it 🚀🎉'
    const steps = layoutOf([team('Intake', 5, 5), team(name, 5, 5)])

    const { rightEdge, labels } = layoutLabels(steps)

    expect(labels[1].labelWidth).toBe(textWidthOf(name))
    expect(rightEdge).toBe(labels[1].right)
  })

  it('draws no more lanes than it needs', () => {
    const steps = layoutOf(referenceSteps(), 0.1)

    expect(Math.max(...layoutLabels(steps).lanes)).toBeLessThanOrEqual(1)
  })
})

describe('labelOverhangFor', () => {
  it('is 0 when every label fits its box and the boxes after it', () => {
    const model = modelOf([team('A', 60, 60), team('B', 60, 60)])

    expect(labelOverhangFor(model.steps, 200)).toBe(0)
  })

  it('bounds how far the last label can run past the ladder at the minimum box width', () => {
    const model = modelOf([createStep({ name: 'Intake' })])

    expect(labelOverhangFor(model.steps, MIN_SCALED_BOX_WIDTH)).toBe(
      LABEL_INSET + textWidthOf('needs process time') - MIN_SCALED_BOX_WIDTH
    )
  })

  it('counts a CJK name by the em', () => {
    const model = modelOf([team(CJK_NAME, 60, 60)])

    expect(labelOverhangFor(model.steps, MIN_SCALED_BOX_WIDTH)).toBe(
      LABEL_INSET + 20 * LABEL_FONT_SIZE - MIN_SCALED_BOX_WIDTH
    )
  })

  it('counts the boxes that follow a label, which cover part of its width', () => {
    const model = modelOf([createStep({ name: 'Intake' }), team('Next', 1, 1)])

    expect(labelOverhangFor(model.steps, MIN_SCALED_BOX_WIDTH)).toBeLessThan(
      LABEL_INSET + textWidthOf('needs process time') - MIN_SCALED_BOX_WIDTH
    )
  })

  it('is never less than the real overhang when every box is at least the minimum', () => {
    const steps = [
      createStep({ name: 'Intake' }),
      team('Tiny', 1, 1),
      team('Tinier', 1, 1),
    ]
    const layout = scaledLayout(steps, 0.5)

    const { rightEdge } = layoutLabels(layout.steps)

    expect(rightEdge - layout.totalWidth).toBeLessThanOrEqual(
      labelOverhangFor(modelOf(steps).steps, MIN_SCALED_BOX_WIDTH)
    )
  })
})

describe('labelLanes', () => {
  const block = (x, width) => ({ x, width })

  it('puts labels that do not touch on the first lane', () => {
    expect(labelLanes([block(0, 50), block(60, 50)])).toEqual([0, 0])
  })

  it('drops a label that would run into the previous one to the next lane', () => {
    expect(labelLanes([block(0, 100), block(20, 50)])).toEqual([0, 1])
  })

  it('reuses a lane once its last label has ended', () => {
    expect(labelLanes([block(0, 100), block(20, 50), block(110, 40)])).toEqual([
      0, 1, 0,
    ])
  })

  it('keeps a gap between labels on one lane', () => {
    expect(labelLanes([block(0, 50), block(52, 50)], 8)).toEqual([0, 1])
  })

  it('has no lanes for no labels', () => {
    expect(labelLanes([])).toEqual([])
  })
})
