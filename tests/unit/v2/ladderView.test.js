import { describe, it, expect } from 'vitest'
import {
  MAX_EQUAL_BOX_WIDTH,
  MAX_PIXELS_PER_MINUTE,
  MIN_EQUAL_BOX_WIDTH,
  MIN_PIXELS_PER_MINUTE,
  LABEL_CHAR_WIDTH,
  LABEL_FONT_SIZE,
  LABEL_GAP,
  LABEL_INSET,
  TONE,
  annotationsOf,
  equalBoxWidthFor,
  labelLanes,
  layoutLabels,
  labelOverhangFor,
  pixelsPerMinuteToFit,
  textWidthOf,
} from '../../../src/utils/ui/ladderView.js'
import {
  LADDER_MODE,
  MIN_SCALED_BOX_WIDTH,
  sizeLadder,
} from '../../../src/utils/ui/ladderLayout.js'
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

  it('keeps the whole ladder inside the pane when boxes stay readable', () => {
    const steps = referenceSteps()
    const pixelsPerMinute = pixelsPerMinuteToFit(modelOf(steps), 900)

    const { totalWidth } = scaledLayout(steps, pixelsPerMinute)

    expect(totalWidth).toBeLessThanOrEqual(900)
  })
})

describe('pixelsPerMinuteToFit before the pane is measured', () => {
  it('gives the minimum pixels per minute for a pane of width 0', () => {
    expect(pixelsPerMinuteToFit(modelOf(referenceSteps()), 0)).toBe(
      MIN_PIXELS_PER_MINUTE
    )
  })

  it('gives the maximum for a pane of width 0 when no time is entered', () => {
    const steps = [createStep({ name: 'Intake' })]

    expect(pixelsPerMinuteToFit(modelOf(steps), 0)).toBe(MAX_PIXELS_PER_MINUTE)
  })
})

describe('a long stream on a narrow pane', () => {
  const PANE = 400
  const fortyOne = () =>
    Array.from({ length: 41 }, (_, index) => team(`Step ${index}`, 60, 120))

  it('is wider than the pane to scale, so the pane scrolls', () => {
    const pixelsPerMinute = pixelsPerMinuteToFit(modelOf(fortyOne()), PANE)

    expect(
      scaledLayout(fortyOne(), pixelsPerMinute).totalWidth
    ).toBeGreaterThan(PANE)
  })

  it('is wider than the pane in equal width, so the pane scrolls', () => {
    const boxWidth = equalBoxWidthFor(41, PANE)

    expect(
      sizeLadder(modelOf(fortyOne()), { mode: LADDER_MODE.EQUAL, boxWidth })
        .totalWidth
    ).toBeGreaterThan(PANE)
  })
})

describe('pixelsPerMinuteToFit with short steps', () => {
  it('keeps the ladder inside the pane although short steps are drawn at the minimum box width', () => {
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

  it('does not stretch a few steps across the pane', () => {
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

  it('takes an average character at LABEL_CHAR_WIDTH', () => {
    expect(textWidthOf('Code review')).toBe(
      'Code review'.length * LABEL_CHAR_WIDTH
    )
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

  it('takes a narrow capital and a lower-case w at the average', () => {
    expect(textWidthOf('Iw')).toBe(2 * LABEL_CHAR_WIDTH)
  })

  it('adds the classes up in a mixed name', () => {
    // Q, A, a space and a space are average; 自, 動, 化, W and M are a full em.
    expect(textWidthOf('QA 自動化 WM')).toBe(
      4 * LABEL_CHAR_WIDTH + 5 * LABEL_FONT_SIZE
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
    const name = 'Customer intake and triage'
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

    const label = 'needs process time'.length * LABEL_CHAR_WIDTH
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

  it('never lets two labels on one lane overlap, even for bold capitals', () => {
    const steps = layoutOf(
      Array.from({ length: 12 }, (_, index) =>
        team(`WWWW ${'M'.repeat(index + 1)}`, 5, 5)
      )
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
      LABEL_INSET +
        'needs process time'.length * LABEL_CHAR_WIDTH -
        MIN_SCALED_BOX_WIDTH
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
      LABEL_INSET +
        'needs process time'.length * LABEL_CHAR_WIDTH -
        MIN_SCALED_BOX_WIDTH
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
