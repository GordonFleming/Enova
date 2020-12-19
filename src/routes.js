import Home from './routes/Home.svelte';
import About from './routes/About.svelte';
import Contact from './routes/Contact.svelte';
import Products from './routes/Products.svelte';
import Partners from './routes/Partners.svelte';
import NotFound from './routes/NotFound.svelte';
import Clients from './routes/Clients.svelte';

export default {
    '/': Home,
    '/about': About,
    '/products_and_services': Products,
    '/associates_and_partners': Partners,
    '/contact': Contact,
    '/clients': Clients,
    // The catch-all route must always be last
    '*': NotFound
};
