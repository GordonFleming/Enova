<script>
    import Router from 'svelte-spa-router';
    import routes from './routes';
    import Nav from './components/Nav.svelte'
    import Footer from './components/Footer.svelte'
</script>

<Nav />

<main>
	<Router {routes} />
</main>

<Footer />

<style>
main {
    flex: 1 0 auto;

    text-align: center;
}
</style>
