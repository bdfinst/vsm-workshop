<script>
  import { onMount } from 'svelte'
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import { createGuidedLifecycle } from '../../stores/v2/guidedLifecycle.js'
  import NoticeRegion from './NoticeRegion.svelte'
  import UnreadableScreen from './UnreadableScreen.svelte'
  import SessionShell from './SessionShell.svelte'
  import HomeScreen from '../home/HomeScreen.svelte'

  const lifecycle = createGuidedLifecycle({ store: workspaceStore })

  onMount(() => {
    lifecycle.start()
  })
</script>

<NoticeRegion />
{#if workspaceStore.status === 'unreadable'}
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
