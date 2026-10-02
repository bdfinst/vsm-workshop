<script>
  let { name, onnext = null } = $props()
</script>

<section data-testid="placeholder-stage">
  <h2 class="text-lg font-semibold" tabindex="-1" data-testid="stage-heading">
    {name}
  </h2>
  <p class="mt-2 text-gray-600">This stage is not built yet</p>
  {#if onnext}
    <button
      type="button"
      class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      data-testid="next-button"
      onclick={onnext}
    >
      Next
    </button>
  {/if}
</section>
