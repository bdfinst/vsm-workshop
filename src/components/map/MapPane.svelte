<script>
  import LadderMap from './LadderMap.svelte'
  import ViewSwitch from './ViewSwitch.svelte'

  // MapPane props: ladderModel (`store.ladderModel`, handed on to the map).
  // The band under the stage content: the view switch and the view it chooses.
  let { ladderModel } = $props()
</script>

<section class="px-4 pb-4" aria-label="Map" data-testid="map-pane">
  <div class="bg-map-bg rounded-lg shadow-md p-4">
    <ViewSwitch panelId="map-view-panel" />
    <div
      id="map-view-panel"
      role="tabpanel"
      aria-labelledby="view-tab-map"
      class="mt-3"
    >
      <LadderMap {ladderModel} />
    </div>
  </div>
</section>
