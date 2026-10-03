<script>
  import {
    VIEW_MODE,
    sessionUIStore,
  } from '../../stores/v2/sessionUIStore.svelte.js'
  import LadderMap from './LadderMap.svelte'
  import ViewSwitch from './ViewSwitch.svelte'

  // MapPane props: ladderModel (`store.ladderModel`, handed on to the map).
  // The band under the stage content: the view switch and the view the
  // session's `viewMode` names. The Map is the only view until Slice 13; a
  // mode the pane does not offer yet shows the Map.
  let { ladderModel } = $props()

  const VIEWS = [{ id: VIEW_MODE.MAP, label: 'Map' }]

  let view = $derived(
    VIEWS.find(({ id }) => id === sessionUIStore.viewMode) ?? VIEWS[0]
  )
</script>

<section class="px-4 pb-4" aria-label="Map" data-testid="map-pane">
  <div class="bg-map-bg rounded-lg shadow-md p-4">
    <ViewSwitch
      views={VIEWS}
      current={view.id}
      onselect={sessionUIStore.setViewMode}
      panelId="map-view-panel"
    />
    <div
      id="map-view-panel"
      role="tabpanel"
      aria-labelledby="view-tab-{view.id}"
      class="mt-3"
    >
      <LadderMap {ladderModel} />
    </div>
  </div>
</section>
