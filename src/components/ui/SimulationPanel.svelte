<script>
  import SimulationResults from '../simulation/SimulationResults.svelte'
  import ScenarioComparison from '../simulation/ScenarioComparison.svelte'
  import { simDataStore } from '../../stores/simulationDataStore.svelte.js'
  import { scenarioStore } from '../../stores/scenarioStore.svelte.js'

  let simulationResults = $derived(simDataStore.results)
  let simulationScenarios = $derived(scenarioStore.scenarios)
  let comparisonResults = $derived(scenarioStore.comparisonResults)
</script>

<div class="max-h-[40vh] overflow-y-auto" data-testid="simulation-panel">
  {#if simulationResults}
    <SimulationResults />
  {/if}

  {#if simulationScenarios.length > 0 || comparisonResults}
    <ScenarioComparison />
  {/if}
</div>
