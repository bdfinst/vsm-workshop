<script>
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import UpgradeNotice from './UpgradeNotice.svelte'
</script>

<!-- Notices sit above the screen, in a fixed order: upgrade (5.4), reconnect (11.3), storage (16.1). -->
<div data-testid="notice-region">
  {#if workspaceStore.changes.length > 0}
    <UpgradeNotice changes={workspaceStore.changes} />
  {/if}
</div>
