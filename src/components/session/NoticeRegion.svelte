<script>
  import { workspaceStore } from '../../stores/v2/workspaceStore.svelte.js'
  import UpgradeNotice from './UpgradeNotice.svelte'
</script>

<!-- Notices sit above the screen, in a fixed order: upgrade (5.4), reconnect (11.3), storage (16.1). -->
<div data-testid="notice-region">
  {#if workspaceStore.changes.length > 0}
    <!-- A new list is a new upgrade, so the notice starts over, not dismissed. -->
    {#key workspaceStore.changes}
      <UpgradeNotice changes={workspaceStore.changes} />
    {/key}
  {/if}
</div>
