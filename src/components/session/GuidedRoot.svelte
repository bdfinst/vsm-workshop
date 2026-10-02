<script>
  import { onMount } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { createGuidedLifecycle } from '../../stores/v2/guidedLifecycle.js'
  import NoticeRegion from './NoticeRegion.svelte'
  import UnreadableScreen from './UnreadableScreen.svelte'
  import SessionShell from './SessionShell.svelte'
  import HomeScreen from '../home/HomeScreen.svelte'

  const lifecycle = createGuidedLifecycle({ store: workspaceStore })

  // The launch also creates the first stream, so nothing but the loading
  // placeholder shows until it has finished: HomeScreen never flashes up on a
  // first launch.
  let launched = $state(false)

  onMount(async () => {
    await lifecycle.start()
    launched = true
  })
</script>

<NoticeRegion />
{#if !launched}
  <p class="p-4 text-gray-600" role="status" data-testid="guided-loading">
    Loading your workspace
  </p>
{:else if workspaceStore.status === 'unreadable'}
  <UnreadableScreen {lifecycle} />
{:else if workspaceStore.status === 'ready'}
  {#if workspaceStore.screen === 'home'}
    <HomeScreen />
  {:else}
    <SessionShell />
  {/if}
{:else}
  <p class="p-4 text-gray-600" role="status" data-testid="guided-loading">
    Loading your workspace
  </p>
{/if}
