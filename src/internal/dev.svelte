
<script>
  import router from 'page'

  import _about from '../pages/about.svelte'
	import _index from '../pages/index.svelte'

  import Layout from '../pages/_layout.svelte'

  let page

  router('/about', () => (page = _about))
	router('/', () => (page = _index))

  router.start()
</script>

<Layout>
  <svelte:component this={page} />
</Layout>
  