// Throwaway runner for Step 2.1 (deleted in 6.1). Opens spikes/file-protocol-probe.html from disk
// (file://) in Chromium and Firefox with Playwright and prints one decision-table row per browser.
//
//   node spikes/run-probe.mjs [--json out.json]
//
// Two-copy, moved-file and version-skew columns use real temp copies of the probe in different
// folders, opened in one browser profile. "IDB persists" closes the browser and relaunches the
// same profile.
import { chromium, firefox } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PROBE = fileURLToPath(
  new URL('./file-protocol-probe.html', import.meta.url)
)
const BROWSERS = [
  { label: 'Chromium (macOS, automated)', type: chromium },
  { label: 'Firefox (macOS, automated)', type: firefox },
]
const RUN_TIMEOUT = 30000

const makeCopy = (root, relPath, schemaVersion) => {
  const file = path.join(root, relPath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const html = fs
    .readFileSync(PROBE, 'utf8')
    .replace(
      'const SCHEMA_VERSION = 1',
      `const SCHEMA_VERSION = ${schemaVersion}`
    )
  fs.writeFileSync(file, html)
  return file
}

const open = async (ctx, file) => {
  const page = await ctx.newPage()
  await page.goto(pathToFileURL(file).href)
  return page
}

const run = async (page) => {
  await page.evaluate(() => {
    document.getElementById('out').textContent = ''
  })
  await page.click('#run')
  await page.waitForFunction(
    () => document.getElementById('out').textContent.trim().startsWith('{'),
    null,
    { timeout: RUN_TIMEOUT }
  )
  return JSON.parse(await page.textContent('#out'))
}

const events = (page) => page.evaluate(() => window.__events)

const checkBeforeUnload = async (ctx, file) => {
  const page = await open(ctx, file)
  await page.click('#arm')
  const dialog = page.waitForEvent('dialog', { timeout: 4000 }).then(
    (d) => {
      const type = d.type()
      return d.accept().then(() => type)
    },
    () => null
  )
  await page.close({ runBeforeUnload: true })
  return dialog
}

const okOrDetail = (v) =>
  typeof v === 'string' && v.startsWith('ok') ? 'ok' : JSON.stringify(v)

async function probeBrowser({ label, type }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vsm-probe-'))
  const profile = path.join(root, 'profile')
  const A = makeCopy(root, 'copyA/probe.html', 1)
  const B = makeCopy(root, 'copyB/nested/probe.html', 1)
  const C = makeCopy(root, 'copyC/probe.html', 2)
  const raw = { label, files: { A, B, C } }
  const launch = () => type.launchPersistentContext(profile, { headless: true })

  let ctx = await launch()
  const pageA = await open(ctx, A)
  raw.firstRun = await run(pageA)
  raw.beforeunloadDialog = await checkBeforeUnload(ctx, A)
  await ctx.close()

  ctx = await launch()
  const reopened = await open(ctx, A)
  raw.afterRestart = await run(reopened)

  const pageB = await open(ctx, B)
  raw.copyB = await run(pageB)

  const moved = path.join(root, 'copyD', 'renamed-probe.html')
  fs.mkdirSync(path.dirname(moved), { recursive: true })
  fs.renameSync(A, moved)
  const pageD = await open(ctx, moved)
  raw.movedFile = await run(pageD)
  raw.movedPath = moved

  // Three copies open at once. A broadcast from the reopened copy, then a newer copy upgrades the schema.
  await Promise.all(
    [pageB, pageD].map((p) => p.evaluate(() => (window.__events = [])))
  )
  await run(reopened)
  await pageB.waitForTimeout(500)
  raw.broadcastSeenByB = (await events(pageB)).filter(
    (e) => e.kind === 'broadcast'
  ).length
  raw.broadcastSeenByD = (await events(pageD)).filter(
    (e) => e.kind === 'broadcast'
  ).length
  await Promise.all(
    [reopened, pageB, pageD].map((p) =>
      p.evaluate(() => (window.__events = []))
    )
  )
  const pageC = await open(ctx, C)
  raw.newerCopy = await run(pageC)
  await pageC.waitForTimeout(500)
  raw.versionchangeSeen = {
    reopened: (await events(reopened)).filter((e) => e.kind === 'versionchange')
      .length,
    B: (await events(pageB)).filter((e) => e.kind === 'versionchange').length,
    D: (await events(pageD)).filter((e) => e.kind === 'versionchange').length,
  }
  raw.newerCopyEvents = await events(pageC)

  const olderAgain = await open(ctx, B)
  raw.olderAfterNewer = await run(olderAgain)
  await ctx.close()
  fs.rmSync(root, { recursive: true, force: true })
  return raw
}

const same = (marker, file) =>
  Boolean(marker && !marker.error && marker.href === pathToFileURL(file).href)

const summarize = (raw) => {
  const {
    firstRun: f,
    afterRestart: r,
    copyB: b,
    movedFile: d,
    newerCopy: n,
    olderAfterNewer: o,
  } = raw
  const roundtrip = f.idb.roundtrip === true
  const kept = same(r.idb.markerBefore, raw.files.A)
  const idb = !roundtrip
    ? `no (round trip: ${JSON.stringify(f.idb.roundtrip)}; open: ${f.idb.openError || 'n/a'})`
    : kept
      ? 'yes'
      : 'round trip ok, not kept after restart'
  const persist = f.persist.api
    ? `${f.persist.granted}${f.persist.error ? ` (${f.persist.error})` : ''}`
    : 'N/A: navigator.storage.persist absent'
  const picker = f.picker.showSaveFilePicker ? 'yes' : 'no'
  const prev = r.handle.previous || {}
  const handleProxy = !r.handle.opfsAvailable
    ? 'OPFS absent'
    : `stored=${JSON.stringify(f.handle.stored)}; after restart found=${prev.found}, query=${JSON.stringify(prev.queryPermission)}, request=${JSON.stringify(prev.requestPermission)}, write=${JSON.stringify(prev.writeOk)}`
  const handle = f.picker.showSaveFilePicker
    ? `N/A for a user-picked handle (native dialog, not automatable); OPFS-handle proxy: ${handleProxy}`
    : `no picker, so no user-picked handle; OPFS-handle proxy: ${handleProxy}`
  const beforeunload =
    raw.beforeunloadDialog === 'beforeunload'
      ? 'prompt shown'
      : `no prompt (dialog=${raw.beforeunloadDialog})`
  const e = f.exportCanvas
  const exp = [e.textWithInlinedFont, e.dataUriImage, e.foreignObjectSvg].every(
    (v) => typeof v === 'string' && v.startsWith('ok')
  )
    ? `ok: font inlined=${e.font}, text, data-URI image, foreignObject SVG`
    : `text=${okOrDetail(e.textWithInlinedFont)}; dataUriImage=${okOrDetail(e.dataUriImage)}; foreignObject=${okOrDetail(e.foreignObjectSvg)}; font=${JSON.stringify(e.font)}`
  const shared = same(b.idb.markerBefore, raw.files.A)
    ? "shared: copy in another folder read copy A's record"
    : `per-path: copy in another folder saw ${JSON.stringify(b.idb.markerBefore)}`
  const movedFound = same(d.idb.markerBefore, raw.files.A)
  const moved = movedFound
    ? 'found (record visible after move and rename)'
    : `not found (saw ${JSON.stringify(d.idb.markerBefore)})`
  const vc = raw.versionchangeSeen
  const blocked = raw.newerCopyEvents.some((x) => x.kind === 'open-blocked')
  const two = `live read of A's data from B while A open: ${b.skew.existing ? 'yes' : 'no'}; BroadcastChannel to open copies: B=${raw.broadcastSeenByB}, D=${raw.broadcastSeenByD}; versionchange on a newer copy's upgrade: ${[vc.reopened, vc.B, vc.D].filter((n) => n > 0).length} of 3 open copies; upgrade blocked: ${blocked ? 'yes' : 'no'}`
  const skew = `newer copy opened at IDB v2: ${n.idb.openedAtOwnVersion ? 'ok' : n.idb.openError}; older copy: VersionError=${o.idb.versionError}, fallback open=${o.idb.usedUnversionedFallback}, sees newer record=${Boolean(o.skew.existing && o.skew.existing.schemaVersion === 2)}, refused=${o.skew.refusedNewerData}`
  return {
    idb,
    persist,
    picker,
    handle,
    beforeunload,
    exp,
    shared,
    moved,
    two,
    skew,
  }
}

const rowFor = (label, s) =>
  `| ${label} | ${[s.idb, s.persist, s.picker, s.handle, s.beforeunload, s.exp, s.shared, s.moved, s.two, s.skew].join(' | ')} |`

const results = []
for (const b of BROWSERS) {
  try {
    const raw = await probeBrowser(b)
    results.push({ ...b, raw, summary: summarize(raw) })
  } catch (err) {
    results.push({ ...b, error: String(err && err.stack ? err.stack : err) })
  }
}

for (const r of results) {
  console.log(
    r.error
      ? `| ${r.label} | ERROR: ${r.error.split('\n')[0]} |`
      : rowFor(r.label, r.summary)
  )
}
const jsonIdx = process.argv.indexOf('--json')
if (jsonIdx !== -1) {
  fs.writeFileSync(
    process.argv[jsonIdx + 1],
    JSON.stringify(
      results.map(({ type: _t, ...rest }) => rest),
      null,
      2
    )
  )
}
if (results.some((r) => r.error)) {
  for (const r of results.filter((x) => x.error))
    console.error(`${r.label}\n${r.error}`)
  process.exit(1)
}
