
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.30.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.30.1 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (209:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (202:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(202:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap$1(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		window.history.replaceState(undefined, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, hrefVar) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, hrefVar || node.getAttribute("href"));

    	return {
    		update(updated) {
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, href) {
    	// Destination must start with '/'
    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	// Add # to the href attribute
    	node.setAttribute("href", "#" + href);

    	node.addEventListener("click", scrollstateHistoryHandler);
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {HTMLElementEventMap} event - an onclick event attached to an anchor tag
     */
    function scrollstateHistoryHandler(event) {
    	// Prevent default anchor onclick behaviour
    	event.preventDefault();

    	const href = event.currentTarget.getAttribute("href");

    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix) {
    				if (typeof prefix == "string" && path.startsWith(prefix)) {
    					path = path.substr(prefix.length) || "/";
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	if (restoreScrollState) {
    		window.addEventListener("popstate", event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		});

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.scrollX, previousScrollState.scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		tick,
    		_wrap: wrap,
    		wrap: wrap$1,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		scrollstateHistoryHandler,
    		createEventDispatcher,
    		afterUpdate,
    		regexparam,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		lastLoc,
    		componentObj
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			 history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/routes/Home.svelte generated by Svelte v3.30.1 */

    const file = "src/routes/Home.svelte";

    function create_fragment$1(ctx) {
    	let div0;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let hr;
    	let t4;
    	let div12;
    	let div11;
    	let div10;
    	let div9;
    	let ol;
    	let li0;
    	let t5;
    	let li1;
    	let t6;
    	let li2;
    	let t7;
    	let li3;
    	let t8;
    	let li4;
    	let t9;
    	let li5;
    	let t10;
    	let li6;
    	let t11;
    	let div8;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t12;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t13;
    	let div3;
    	let img2;
    	let img2_src_value;
    	let t14;
    	let div4;
    	let img3;
    	let img3_src_value;
    	let t15;
    	let div5;
    	let img4;
    	let img4_src_value;
    	let t16;
    	let div6;
    	let img5;
    	let img5_src_value;
    	let t17;
    	let div7;
    	let img6;
    	let img6_src_value;
    	let t18;
    	let a0;
    	let span0;
    	let t19;
    	let span1;
    	let t21;
    	let a1;
    	let span2;
    	let t22;
    	let span3;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Enova Enterprises";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Connecting Africa";
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			ol = element("ol");
    			li0 = element("li");
    			t5 = space();
    			li1 = element("li");
    			t6 = space();
    			li2 = element("li");
    			t7 = space();
    			li3 = element("li");
    			t8 = space();
    			li4 = element("li");
    			t9 = space();
    			li5 = element("li");
    			t10 = space();
    			li6 = element("li");
    			t11 = space();
    			div8 = element("div");
    			div1 = element("div");
    			img0 = element("img");
    			t12 = space();
    			div2 = element("div");
    			img1 = element("img");
    			t13 = space();
    			div3 = element("div");
    			img2 = element("img");
    			t14 = space();
    			div4 = element("div");
    			img3 = element("img");
    			t15 = space();
    			div5 = element("div");
    			img4 = element("img");
    			t16 = space();
    			div6 = element("div");
    			img5 = element("img");
    			t17 = space();
    			div7 = element("div");
    			img6 = element("img");
    			t18 = space();
    			a0 = element("a");
    			span0 = element("span");
    			t19 = space();
    			span1 = element("span");
    			span1.textContent = "Previous";
    			t21 = space();
    			a1 = element("a");
    			span2 = element("span");
    			t22 = space();
    			span3 = element("span");
    			span3.textContent = "Next";
    			attr_dev(h1, "class", "display-3");
    			add_location(h1, file, 1, 4, 28);
    			attr_dev(p, "class", "lead");
    			add_location(p, file, 2, 4, 77);
    			attr_dev(hr, "class", "my-4");
    			add_location(hr, file, 3, 4, 119);
    			attr_dev(div0, "class", "jumbotron");
    			add_location(div0, file, 0, 0, 0);
    			attr_dev(li0, "data-target", "#slide");
    			attr_dev(li0, "data-slide-to", "0");
    			attr_dev(li0, "class", "active");
    			add_location(li0, file, 11, 16, 425);
    			attr_dev(li1, "data-target", "#slide");
    			attr_dev(li1, "data-slide-to", "1");
    			add_location(li1, file, 12, 16, 505);
    			attr_dev(li2, "data-target", "#slide");
    			attr_dev(li2, "data-slide-to", "2");
    			add_location(li2, file, 13, 16, 570);
    			attr_dev(li3, "data-target", "#slide");
    			attr_dev(li3, "data-slide-to", "3");
    			add_location(li3, file, 14, 16, 635);
    			attr_dev(li4, "data-target", "#slide");
    			attr_dev(li4, "data-slide-to", "4");
    			add_location(li4, file, 15, 16, 700);
    			attr_dev(li5, "data-target", "#slide");
    			attr_dev(li5, "data-slide-to", "5");
    			add_location(li5, file, 16, 16, 765);
    			attr_dev(li6, "data-target", "#slide");
    			attr_dev(li6, "data-slide-to", "6");
    			add_location(li6, file, 17, 16, 830);
    			attr_dev(ol, "class", "carousel-indicators");
    			add_location(ol, file, 10, 16, 376);
    			attr_dev(img0, "class", "d-block w-100 img-fluid");
    			if (img0.src !== (img0_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_facemask_example2.original.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "First slide");
    			add_location(img0, file, 22, 20, 1062);
    			attr_dev(div1, "class", "carousel-item active");
    			add_location(div1, file, 21, 16, 1007);
    			attr_dev(img1, "class", "d-block w-100 img-fluid");
    			if (img1.src !== (img1_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_facemask_example.original.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Second slide");
    			add_location(img1, file, 26, 20, 1345);
    			attr_dev(div2, "class", "carousel-item");
    			add_location(div2, file, 25, 16, 1297);
    			attr_dev(img2, "class", "d-block w-100 img-fluid");
    			if (img2.src !== (img2_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_facemask_example3.original.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Third slide");
    			add_location(img2, file, 30, 20, 1628);
    			attr_dev(div3, "class", "carousel-item");
    			add_location(div3, file, 29, 16, 1580);
    			attr_dev(img3, "class", "d-block w-100 img-fluid");
    			if (img3.src !== (img3_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_facemask_example4.original.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Fourth slide");
    			add_location(img3, file, 34, 20, 1911);
    			attr_dev(div4, "class", "carousel-item");
    			add_location(div4, file, 33, 16, 1863);
    			attr_dev(img4, "class", "d-block w-100 img-fluid");
    			if (img4.src !== (img4_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_hats.original.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Fifth slide");
    			add_location(img4, file, 38, 20, 2195);
    			attr_dev(div5, "class", "carousel-item");
    			add_location(div5, file, 37, 16, 2147);
    			attr_dev(img5, "class", "d-block w-100 img-fluid");
    			if (img5.src !== (img5_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_single_hat.original.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "Sixth slide");
    			add_location(img5, file, 42, 20, 2465);
    			attr_dev(div6, "class", "carousel-item");
    			add_location(div6, file, 41, 16, 2417);
    			attr_dev(img6, "class", "d-block w-100 img-fluid");
    			if (img6.src !== (img6_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_hats_example.original.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "Seventh");
    			add_location(img6, file, 46, 20, 2741);
    			attr_dev(div7, "class", "carousel-item");
    			add_location(div7, file, 45, 16, 2693);
    			attr_dev(div8, "class", "carousel-inner");
    			attr_dev(div8, "role", "listbox");
    			add_location(div8, file, 20, 16, 947);
    			attr_dev(span0, "class", "carousel-control-prev-icon");
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file, 52, 16, 3118);
    			attr_dev(span1, "class", "sr-only");
    			add_location(span1, file, 53, 16, 3202);
    			attr_dev(a0, "class", "carousel-control-prev");
    			attr_dev(a0, "href", "#slide");
    			attr_dev(a0, "role", "button");
    			attr_dev(a0, "data-slide", "prev");
    			add_location(a0, file, 51, 16, 3022);
    			attr_dev(span2, "class", "carousel-control-next-icon");
    			attr_dev(span2, "aria-hidden", "true");
    			add_location(span2, file, 56, 16, 3373);
    			attr_dev(span3, "class", "sr-only");
    			add_location(span3, file, 57, 16, 3457);
    			attr_dev(a1, "class", "carousel-control-next");
    			attr_dev(a1, "href", "#slide");
    			attr_dev(a1, "role", "button");
    			attr_dev(a1, "data-slide", "next");
    			add_location(a1, file, 55, 16, 3277);
    			attr_dev(div9, "id", "slide");
    			attr_dev(div9, "class", "carousel slide carousel-fade");
    			attr_dev(div9, "data-ride", "carousel");
    			add_location(div9, file, 8, 12, 251);
    			attr_dev(div10, "class", "col-6 offset-3");
    			add_location(div10, file, 7, 8, 210);
    			attr_dev(div11, "class", "row");
    			add_location(div11, file, 6, 4, 184);
    			attr_dev(div12, "class", "container-fluid p-5");
    			add_location(div12, file, 5, 0, 146);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div0, t3);
    			append_dev(div0, hr);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, ol);
    			append_dev(ol, li0);
    			append_dev(ol, t5);
    			append_dev(ol, li1);
    			append_dev(ol, t6);
    			append_dev(ol, li2);
    			append_dev(ol, t7);
    			append_dev(ol, li3);
    			append_dev(ol, t8);
    			append_dev(ol, li4);
    			append_dev(ol, t9);
    			append_dev(ol, li5);
    			append_dev(ol, t10);
    			append_dev(ol, li6);
    			append_dev(div9, t11);
    			append_dev(div9, div8);
    			append_dev(div8, div1);
    			append_dev(div1, img0);
    			append_dev(div8, t12);
    			append_dev(div8, div2);
    			append_dev(div2, img1);
    			append_dev(div8, t13);
    			append_dev(div8, div3);
    			append_dev(div3, img2);
    			append_dev(div8, t14);
    			append_dev(div8, div4);
    			append_dev(div4, img3);
    			append_dev(div8, t15);
    			append_dev(div8, div5);
    			append_dev(div5, img4);
    			append_dev(div8, t16);
    			append_dev(div8, div6);
    			append_dev(div6, img5);
    			append_dev(div8, t17);
    			append_dev(div8, div7);
    			append_dev(div7, img6);
    			append_dev(div9, t18);
    			append_dev(div9, a0);
    			append_dev(a0, span0);
    			append_dev(a0, t19);
    			append_dev(a0, span1);
    			append_dev(div9, t21);
    			append_dev(div9, a1);
    			append_dev(a1, span2);
    			append_dev(a1, t22);
    			append_dev(a1, span3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div12);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/routes/About.svelte generated by Svelte v3.30.1 */

    const file$1 = "src/routes/About.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h10;
    	let t1;
    	let p0;
    	let t2;
    	let br0;
    	let t3;
    	let br1;
    	let t4;
    	let br2;
    	let t5;
    	let br3;
    	let t6;
    	let t7;
    	let br4;
    	let t8;
    	let h11;
    	let t10;
    	let p1;
    	let t11;
    	let br5;
    	let t12;
    	let br6;
    	let t13;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h10 = element("h1");
    			h10.textContent = "about us";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Enova Enterprises is a multidisciplinary company that offers a wide variety of products and services within South Africa as well as the Southern Africa region. We use our extensive expertise and skills in creating streamlined, tailor-made services that meet the needs of our clients as well as ensure that they affordable and efficient. ");
    			br0 = element("br");
    			t3 = space();
    			br1 = element("br");
    			t4 = text(" Our founding directors have a variety of expertise, ranging from management, facilitation, liaison as well as procurement and logistics. Their extensive knowledge of the different markets, key market players as well as their respective demands enable us to holistically cater for our client’s needs and desires. ");
    			br2 = element("br");
    			t5 = space();
    			br3 = element("br");
    			t6 = text(" \n        We are a BEE certified company with strong principles and values that guide us in creating products and services that are nothing short of excellence.");
    			t7 = space();
    			br4 = element("br");
    			t8 = space();
    			h11 = element("h1");
    			h11.textContent = "vision & mission";
    			t10 = space();
    			p1 = element("p");
    			t11 = text("As Enova Enterprises, we strive to create successful, long-term partnerships with all our clients. We do this by tailoring our products and services around the client’s needs, as well as their long-term goals and objective. ");
    			br5 = element("br");
    			t12 = space();
    			br6 = element("br");
    			t13 = text(" \n        As a company, we use dynamic approaches in innovating our product and service delivery, by continuously researching new methods and techniques to increase productivity, as well as exceed international standards.");
    			attr_dev(h10, "class", "pb-3");
    			add_location(h10, file$1, 5, 4, 64);
    			add_location(br0, file$1, 7, 345, 448);
    			add_location(br1, file$1, 8, 8, 461);
    			add_location(br2, file$1, 8, 325, 778);
    			add_location(br3, file$1, 9, 8, 793);
    			add_location(p0, file$1, 6, 4, 99);
    			add_location(br4, file$1, 12, 4, 971);
    			add_location(h11, file$1, 13, 4, 980);
    			add_location(br5, file$1, 15, 232, 1246);
    			add_location(br6, file$1, 16, 8, 1259);
    			add_location(p1, file$1, 14, 4, 1010);
    			attr_dev(div, "class", "container pl-5 pr-5 mt-5");
    			add_location(div, file$1, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h10);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(p0, t2);
    			append_dev(p0, br0);
    			append_dev(p0, t3);
    			append_dev(p0, br1);
    			append_dev(p0, t4);
    			append_dev(p0, br2);
    			append_dev(p0, t5);
    			append_dev(p0, br3);
    			append_dev(p0, t6);
    			append_dev(div, t7);
    			append_dev(div, br4);
    			append_dev(div, t8);
    			append_dev(div, h11);
    			append_dev(div, t10);
    			append_dev(div, p1);
    			append_dev(p1, t11);
    			append_dev(p1, br5);
    			append_dev(p1, t12);
    			append_dev(p1, br6);
    			append_dev(p1, t13);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/routes/Contact.svelte generated by Svelte v3.30.1 */

    const file$2 = "src/routes/Contact.svelte";

    function create_fragment$3(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let h1;
    	let t1;
    	let div2;
    	let div1;
    	let div0;
    	let p;
    	let t2;
    	let form;
    	let ul;
    	let t3;
    	let button;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "contact us";
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t2 = space();
    			form = element("form");
    			ul = element("ul");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Submit Form";
    			add_location(h1, file$2, 3, 12, 106);
    			add_location(p, file$2, 7, 24, 263);
    			attr_dev(div0, "class", "offset-4");
    			add_location(div0, file$2, 6, 20, 216);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$2, 5, 16, 178);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$2, 4, 12, 138);
    			attr_dev(ul, "class", "contact-form");
    			add_location(ul, file$2, 13, 16, 394);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-success");
    			add_location(button, file$2, 15, 16, 458);
    			attr_dev(form, "method", "POST");
    			add_location(form, file$2, 12, 12, 357);
    			attr_dev(div3, "class", "col");
    			add_location(div3, file$2, 2, 8, 76);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$2, 1, 4, 50);
    			attr_dev(div5, "class", "container mt-5 mb-5 text-center");
    			add_location(div5, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(div3, t2);
    			append_dev(div3, form);
    			append_dev(form, ul);
    			append_dev(form, t3);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Contact", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/routes/Products.svelte generated by Svelte v3.30.1 */

    const file$3 = "src/routes/Products.svelte";

    function create_fragment$4(ctx) {
    	let div11;
    	let h10;
    	let t1;
    	let div4;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let h40;
    	let t4;
    	let ul0;
    	let li0;
    	let t6;
    	let li1;
    	let t8;
    	let li2;
    	let t10;
    	let li3;
    	let t12;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t13;
    	let h41;
    	let t15;
    	let ul1;
    	let li4;
    	let t17;
    	let li5;
    	let t19;
    	let li6;
    	let t21;
    	let li7;
    	let t23;
    	let li8;
    	let t25;
    	let div2;
    	let img2;
    	let img2_src_value;
    	let t26;
    	let h42;
    	let t28;
    	let ul2;
    	let li9;
    	let t30;
    	let li10;
    	let t32;
    	let li11;
    	let t34;
    	let li12;
    	let t36;
    	let li13;
    	let t38;
    	let div3;
    	let img3;
    	let img3_src_value;
    	let t39;
    	let h43;
    	let t41;
    	let ul3;
    	let li14;
    	let t43;
    	let li15;
    	let t45;
    	let li16;
    	let t47;
    	let li17;
    	let t49;
    	let li18;
    	let t51;
    	let div9;
    	let div5;
    	let img4;
    	let img4_src_value;
    	let t52;
    	let h44;
    	let t54;
    	let ul4;
    	let li19;
    	let t56;
    	let li20;
    	let t58;
    	let li21;
    	let t60;
    	let div6;
    	let img5;
    	let img5_src_value;
    	let t61;
    	let h45;
    	let t63;
    	let ul5;
    	let li22;
    	let t65;
    	let li23;
    	let t67;
    	let li24;
    	let t69;
    	let li25;
    	let t71;
    	let div7;
    	let img6;
    	let img6_src_value;
    	let t72;
    	let h46;
    	let t74;
    	let ul6;
    	let li26;
    	let t76;
    	let li27;
    	let t78;
    	let li28;
    	let t80;
    	let li29;
    	let t82;
    	let li30;
    	let t84;
    	let div8;
    	let img7;
    	let img7_src_value;
    	let t85;
    	let h47;
    	let t87;
    	let ul7;
    	let li31;
    	let t89;
    	let li32;
    	let t91;
    	let li33;
    	let t93;
    	let li34;
    	let t95;
    	let div10;
    	let h11;
    	let t97;
    	let h5;
    	let t99;
    	let h60;
    	let t101;
    	let ul8;
    	let li35;
    	let t103;
    	let li36;
    	let t105;
    	let li37;
    	let t107;
    	let h61;
    	let t109;
    	let ul9;
    	let li38;

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			h10 = element("h1");
    			h10.textContent = "FEATURED PRODUCTS & SERVICES";
    			t1 = space();
    			div4 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t2 = space();
    			h40 = element("h4");
    			h40.textContent = "General supplies";
    			t4 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Cleaning chemicals & products";
    			t6 = space();
    			li1 = element("li");
    			li1.textContent = "Cleaning consumables & equipment";
    			t8 = space();
    			li2 = element("li");
    			li2.textContent = "Office consumables (snacks, beverages, etc)";
    			t10 = space();
    			li3 = element("li");
    			li3.textContent = "Office furniture";
    			t12 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t13 = space();
    			h41 = element("h4");
    			h41.textContent = "MERCHANDISING";
    			t15 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			li4.textContent = "Online demonstrations";
    			t17 = space();
    			li5 = element("li");
    			li5.textContent = "In-store demonstrations";
    			t19 = space();
    			li6 = element("li");
    			li6.textContent = "Merchandise advertising";
    			t21 = space();
    			li7 = element("li");
    			li7.textContent = "Customer engagements";
    			t23 = space();
    			li8 = element("li");
    			li8.textContent = "Samples & giveaways";
    			t25 = space();
    			div2 = element("div");
    			img2 = element("img");
    			t26 = space();
    			h42 = element("h4");
    			h42.textContent = "PERSONALIZED SHOPPING";
    			t28 = space();
    			ul2 = element("ul");
    			li9 = element("li");
    			li9.textContent = "Grocery";
    			t30 = space();
    			li10 = element("li");
    			li10.textContent = "Clothing";
    			t32 = space();
    			li11 = element("li");
    			li11.textContent = "Furniture";
    			t34 = space();
    			li12 = element("li");
    			li12.textContent = "Appliances";
    			t36 = space();
    			li13 = element("li");
    			li13.textContent = "Errands";
    			t38 = space();
    			div3 = element("div");
    			img3 = element("img");
    			t39 = space();
    			h43 = element("h4");
    			h43.textContent = "STATIONARY SUPPLIES";
    			t41 = space();
    			ul3 = element("ul");
    			li14 = element("li");
    			li14.textContent = "Printing";
    			t43 = space();
    			li15 = element("li");
    			li15.textContent = "Writing & Drawing";
    			t45 = space();
    			li16 = element("li");
    			li16.textContent = "Arts & Crafts";
    			t47 = space();
    			li17 = element("li");
    			li17.textContent = "Electronics";
    			t49 = space();
    			li18 = element("li");
    			li18.textContent = "Gifting";
    			t51 = space();
    			div9 = element("div");
    			div5 = element("div");
    			img4 = element("img");
    			t52 = space();
    			h44 = element("h4");
    			h44.textContent = "CONSTRUCTION";
    			t54 = space();
    			ul4 = element("ul");
    			li19 = element("li");
    			li19.textContent = "Tools";
    			t56 = space();
    			li20 = element("li");
    			li20.textContent = "Materials";
    			t58 = space();
    			li21 = element("li");
    			li21.textContent = "Equipment";
    			t60 = space();
    			div6 = element("div");
    			img5 = element("img");
    			t61 = space();
    			h45 = element("h4");
    			h45.textContent = "LOGISTICS & PROCUREMENT";
    			t63 = space();
    			ul5 = element("ul");
    			li22 = element("li");
    			li22.textContent = "Procurement of goods";
    			t65 = space();
    			li23 = element("li");
    			li23.textContent = "Organization";
    			t67 = space();
    			li24 = element("li");
    			li24.textContent = "Transportation";
    			t69 = space();
    			li25 = element("li");
    			li25.textContent = "Storage";
    			t71 = space();
    			div7 = element("div");
    			img6 = element("img");
    			t72 = space();
    			h46 = element("h4");
    			h46.textContent = "CLOTHING SUPPLIES";
    			t74 = space();
    			ul6 = element("ul");
    			li26 = element("li");
    			li26.textContent = "School uniforms";
    			t76 = space();
    			li27 = element("li");
    			li27.textContent = "Sports uniforms / kits";
    			t78 = space();
    			li28 = element("li");
    			li28.textContent = "Personal protective equipment";
    			t80 = space();
    			li29 = element("li");
    			li29.textContent = "Bulk ordering";
    			t82 = space();
    			li30 = element("li");
    			li30.textContent = "Corporate clothing";
    			t84 = space();
    			div8 = element("div");
    			img7 = element("img");
    			t85 = space();
    			h47 = element("h4");
    			h47.textContent = "DIGITAL PRINTING";
    			t87 = space();
    			ul7 = element("ul");
    			li31 = element("li");
    			li31.textContent = "Print on demand";
    			t89 = space();
    			li32 = element("li");
    			li32.textContent = "Advertising";
    			t91 = space();
    			li33 = element("li");
    			li33.textContent = "Commercial";
    			t93 = space();
    			li34 = element("li");
    			li34.textContent = "Desktop publishing";
    			t95 = space();
    			div10 = element("div");
    			h11 = element("h1");
    			h11.textContent = "SERVICE HISTORY";
    			t97 = space();
    			h5 = element("h5");
    			h5.textContent = "our past projects-";
    			t99 = space();
    			h60 = element("h6");
    			h60.textContent = "Kaziya Musonda";
    			t101 = space();
    			ul8 = element("ul");
    			li35 = element("li");
    			li35.textContent = "Procurement and export of building materials to Lusaka, Zambia.";
    			t103 = space();
    			li36 = element("li");
    			li36.textContent = "Procurement and export of heavy building machinery.";
    			t105 = space();
    			li37 = element("li");
    			li37.textContent = "Procurement and export of landscaping tools and machinery.";
    			t107 = space();
    			h61 = element("h6");
    			h61.textContent = "St John’s College";
    			t109 = space();
    			ul9 = element("ul");
    			li38 = element("li");
    			li38.textContent = "Manufacture and digital printing ofbucket hats for Pi-day.";
    			attr_dev(h10, "class", "pb-3");
    			add_location(h10, file$3, 1, 4, 55);
    			attr_dev(img0, "class", "img-fluid");
    			if (img0.src !== (img0_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/wrench.original.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$3, 4, 12, 168);
    			attr_dev(h40, "class", "pt-3 text-center");
    			add_location(h40, file$3, 5, 12, 309);
    			add_location(li0, file$3, 7, 16, 393);
    			add_location(li1, file$3, 8, 16, 448);
    			add_location(li2, file$3, 9, 16, 506);
    			add_location(li3, file$3, 10, 16, 575);
    			attr_dev(ul0, "class", "svelte-15n6a00");
    			add_location(ul0, file$3, 6, 12, 372);
    			attr_dev(div0, "class", "col-3");
    			add_location(div0, file$3, 3, 8, 136);
    			attr_dev(img1, "class", "img-fluid");
    			if (img1.src !== (img1_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/photograph.original.png")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$3, 14, 12, 674);
    			attr_dev(h41, "class", "pt-3");
    			add_location(h41, file$3, 15, 12, 819);
    			add_location(li4, file$3, 17, 16, 888);
    			add_location(li5, file$3, 18, 16, 935);
    			add_location(li6, file$3, 19, 16, 984);
    			add_location(li7, file$3, 20, 16, 1033);
    			add_location(li8, file$3, 21, 16, 1079);
    			attr_dev(ul1, "class", "svelte-15n6a00");
    			add_location(ul1, file$3, 16, 12, 867);
    			attr_dev(div1, "class", "col-3");
    			add_location(div1, file$3, 13, 8, 642);
    			attr_dev(img2, "class", "img-fluid");
    			if (img2.src !== (img2_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/user.original.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$3, 25, 12, 1181);
    			attr_dev(h42, "class", "pt-3");
    			add_location(h42, file$3, 26, 12, 1320);
    			add_location(li9, file$3, 28, 16, 1397);
    			add_location(li10, file$3, 29, 16, 1430);
    			add_location(li11, file$3, 30, 16, 1464);
    			add_location(li12, file$3, 31, 16, 1499);
    			add_location(li13, file$3, 32, 16, 1535);
    			attr_dev(ul2, "class", "svelte-15n6a00");
    			add_location(ul2, file$3, 27, 12, 1376);
    			attr_dev(div2, "class", "col-3");
    			add_location(div2, file$3, 24, 8, 1149);
    			attr_dev(img3, "class", "img-fluid");
    			if (img3.src !== (img3_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/tools-and-utensils.original.png")) attr_dev(img3, "src", img3_src_value);
    			add_location(img3, file$3, 36, 12, 1625);
    			attr_dev(h43, "class", "pt-3");
    			add_location(h43, file$3, 37, 12, 1778);
    			add_location(li14, file$3, 39, 16, 1853);
    			add_location(li15, file$3, 40, 16, 1887);
    			add_location(li16, file$3, 41, 16, 1930);
    			add_location(li17, file$3, 42, 16, 1969);
    			add_location(li18, file$3, 43, 16, 2006);
    			attr_dev(ul3, "class", "svelte-15n6a00");
    			add_location(ul3, file$3, 38, 12, 1832);
    			attr_dev(div3, "class", "col-3");
    			add_location(div3, file$3, 35, 8, 1593);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file$3, 2, 4, 110);
    			attr_dev(img4, "class", "img-fluid");
    			if (img4.src !== (img4_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/factory.original.png")) attr_dev(img4, "src", img4_src_value);
    			add_location(img4, file$3, 49, 12, 2129);
    			attr_dev(h44, "class", "pt-3");
    			add_location(h44, file$3, 50, 12, 2271);
    			add_location(li19, file$3, 52, 16, 2339);
    			add_location(li20, file$3, 53, 16, 2370);
    			add_location(li21, file$3, 54, 16, 2405);
    			attr_dev(ul4, "class", "svelte-15n6a00");
    			add_location(ul4, file$3, 51, 12, 2318);
    			attr_dev(div5, "class", "col-3");
    			add_location(div5, file$3, 48, 8, 2097);
    			attr_dev(img5, "class", "img-fluid");
    			if (img5.src !== (img5_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/time.original.png")) attr_dev(img5, "src", img5_src_value);
    			add_location(img5, file$3, 58, 12, 2497);
    			attr_dev(h45, "class", "pt-3");
    			add_location(h45, file$3, 59, 12, 2636);
    			add_location(li22, file$3, 61, 16, 2715);
    			add_location(li23, file$3, 62, 16, 2761);
    			add_location(li24, file$3, 63, 16, 2799);
    			add_location(li25, file$3, 64, 16, 2839);
    			attr_dev(ul5, "class", "svelte-15n6a00");
    			add_location(ul5, file$3, 60, 12, 2694);
    			attr_dev(div6, "class", "col-3");
    			add_location(div6, file$3, 57, 8, 2465);
    			attr_dev(img6, "class", "img-fluid");
    			if (img6.src !== (img6_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/cool.original.png")) attr_dev(img6, "src", img6_src_value);
    			add_location(img6, file$3, 68, 12, 2929);
    			attr_dev(h46, "class", "pt-3");
    			add_location(h46, file$3, 69, 12, 3068);
    			add_location(li26, file$3, 71, 16, 3141);
    			add_location(li27, file$3, 72, 16, 3182);
    			add_location(li28, file$3, 73, 16, 3230);
    			add_location(li29, file$3, 74, 16, 3285);
    			add_location(li30, file$3, 75, 16, 3324);
    			attr_dev(ul6, "class", "svelte-15n6a00");
    			add_location(ul6, file$3, 70, 12, 3120);
    			attr_dev(div7, "class", "col-3");
    			add_location(div7, file$3, 67, 8, 2897);
    			attr_dev(img7, "class", "img-fluid");
    			if (img7.src !== (img7_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/print.original.png")) attr_dev(img7, "src", img7_src_value);
    			add_location(img7, file$3, 79, 12, 3436);
    			attr_dev(h47, "class", "pt-3");
    			add_location(h47, file$3, 80, 12, 3576);
    			add_location(li31, file$3, 82, 16, 3648);
    			add_location(li32, file$3, 83, 16, 3689);
    			add_location(li33, file$3, 84, 16, 3726);
    			add_location(li34, file$3, 85, 16, 3762);
    			attr_dev(ul7, "class", "svelte-15n6a00");
    			add_location(ul7, file$3, 81, 12, 3627);
    			attr_dev(div8, "class", "col-3");
    			add_location(div8, file$3, 78, 8, 3404);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$3, 47, 4, 2071);
    			add_location(h11, file$3, 90, 8, 3869);
    			add_location(h5, file$3, 91, 8, 3902);
    			attr_dev(h60, "class", "svelte-15n6a00");
    			add_location(h60, file$3, 92, 8, 3938);
    			add_location(li35, file$3, 94, 12, 3987);
    			add_location(li36, file$3, 95, 12, 4072);
    			add_location(li37, file$3, 96, 12, 4145);
    			attr_dev(ul8, "class", "svelte-15n6a00");
    			add_location(ul8, file$3, 93, 8, 3970);
    			attr_dev(h61, "class", "svelte-15n6a00");
    			add_location(h61, file$3, 98, 8, 4235);
    			add_location(li38, file$3, 100, 12, 4287);
    			attr_dev(ul9, "class", "svelte-15n6a00");
    			add_location(ul9, file$3, 99, 8, 4270);
    			attr_dev(div10, "class", "row mt-5");
    			add_location(div10, file$3, 89, 4, 3838);
    			attr_dev(div11, "class", "container text-center mt-5 pl-4 pr-4");
    			add_location(div11, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, h10);
    			append_dev(div11, t1);
    			append_dev(div11, div4);
    			append_dev(div4, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t2);
    			append_dev(div0, h40);
    			append_dev(div0, t4);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t6);
    			append_dev(ul0, li1);
    			append_dev(ul0, t8);
    			append_dev(ul0, li2);
    			append_dev(ul0, t10);
    			append_dev(ul0, li3);
    			append_dev(div4, t12);
    			append_dev(div4, div1);
    			append_dev(div1, img1);
    			append_dev(div1, t13);
    			append_dev(div1, h41);
    			append_dev(div1, t15);
    			append_dev(div1, ul1);
    			append_dev(ul1, li4);
    			append_dev(ul1, t17);
    			append_dev(ul1, li5);
    			append_dev(ul1, t19);
    			append_dev(ul1, li6);
    			append_dev(ul1, t21);
    			append_dev(ul1, li7);
    			append_dev(ul1, t23);
    			append_dev(ul1, li8);
    			append_dev(div4, t25);
    			append_dev(div4, div2);
    			append_dev(div2, img2);
    			append_dev(div2, t26);
    			append_dev(div2, h42);
    			append_dev(div2, t28);
    			append_dev(div2, ul2);
    			append_dev(ul2, li9);
    			append_dev(ul2, t30);
    			append_dev(ul2, li10);
    			append_dev(ul2, t32);
    			append_dev(ul2, li11);
    			append_dev(ul2, t34);
    			append_dev(ul2, li12);
    			append_dev(ul2, t36);
    			append_dev(ul2, li13);
    			append_dev(div4, t38);
    			append_dev(div4, div3);
    			append_dev(div3, img3);
    			append_dev(div3, t39);
    			append_dev(div3, h43);
    			append_dev(div3, t41);
    			append_dev(div3, ul3);
    			append_dev(ul3, li14);
    			append_dev(ul3, t43);
    			append_dev(ul3, li15);
    			append_dev(ul3, t45);
    			append_dev(ul3, li16);
    			append_dev(ul3, t47);
    			append_dev(ul3, li17);
    			append_dev(ul3, t49);
    			append_dev(ul3, li18);
    			append_dev(div11, t51);
    			append_dev(div11, div9);
    			append_dev(div9, div5);
    			append_dev(div5, img4);
    			append_dev(div5, t52);
    			append_dev(div5, h44);
    			append_dev(div5, t54);
    			append_dev(div5, ul4);
    			append_dev(ul4, li19);
    			append_dev(ul4, t56);
    			append_dev(ul4, li20);
    			append_dev(ul4, t58);
    			append_dev(ul4, li21);
    			append_dev(div9, t60);
    			append_dev(div9, div6);
    			append_dev(div6, img5);
    			append_dev(div6, t61);
    			append_dev(div6, h45);
    			append_dev(div6, t63);
    			append_dev(div6, ul5);
    			append_dev(ul5, li22);
    			append_dev(ul5, t65);
    			append_dev(ul5, li23);
    			append_dev(ul5, t67);
    			append_dev(ul5, li24);
    			append_dev(ul5, t69);
    			append_dev(ul5, li25);
    			append_dev(div9, t71);
    			append_dev(div9, div7);
    			append_dev(div7, img6);
    			append_dev(div7, t72);
    			append_dev(div7, h46);
    			append_dev(div7, t74);
    			append_dev(div7, ul6);
    			append_dev(ul6, li26);
    			append_dev(ul6, t76);
    			append_dev(ul6, li27);
    			append_dev(ul6, t78);
    			append_dev(ul6, li28);
    			append_dev(ul6, t80);
    			append_dev(ul6, li29);
    			append_dev(ul6, t82);
    			append_dev(ul6, li30);
    			append_dev(div9, t84);
    			append_dev(div9, div8);
    			append_dev(div8, img7);
    			append_dev(div8, t85);
    			append_dev(div8, h47);
    			append_dev(div8, t87);
    			append_dev(div8, ul7);
    			append_dev(ul7, li31);
    			append_dev(ul7, t89);
    			append_dev(ul7, li32);
    			append_dev(ul7, t91);
    			append_dev(ul7, li33);
    			append_dev(ul7, t93);
    			append_dev(ul7, li34);
    			append_dev(div11, t95);
    			append_dev(div11, div10);
    			append_dev(div10, h11);
    			append_dev(div10, t97);
    			append_dev(div10, h5);
    			append_dev(div10, t99);
    			append_dev(div10, h60);
    			append_dev(div10, t101);
    			append_dev(div10, ul8);
    			append_dev(ul8, li35);
    			append_dev(ul8, t103);
    			append_dev(ul8, li36);
    			append_dev(ul8, t105);
    			append_dev(ul8, li37);
    			append_dev(div10, t107);
    			append_dev(div10, h61);
    			append_dev(div10, t109);
    			append_dev(div10, ul9);
    			append_dev(ul9, li38);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Products", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Products> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Products extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Products",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/routes/Partners.svelte generated by Svelte v3.30.1 */

    const file$4 = "src/routes/Partners.svelte";

    function create_fragment$5(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let div0;
    	let p1;
    	let t5;
    	let ul;
    	let li0;
    	let t7;
    	let li1;
    	let t9;
    	let li2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "ASSOCIATES & PARTNERS";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "As a newly established company, we have taken initiative to partner with experienced suppliers and manufacturers to ensure the sourcing of high-quality products.";
    			t3 = space();
    			div0 = element("div");
    			p1 = element("p");
    			p1.textContent = "We have teamed-up with the following companies to ensure steady supply of products for our clients:";
    			t5 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Oryx Group";
    			t7 = space();
    			li1 = element("li");
    			li1.textContent = "Coaches on The Move";
    			t9 = space();
    			li2 = element("li");
    			li2.textContent = "Shoe Sheen Salon";
    			attr_dev(h1, "class", "pb-3");
    			add_location(h1, file$4, 1, 4, 32);
    			add_location(p0, file$4, 2, 4, 80);
    			add_location(p1, file$4, 4, 8, 284);
    			attr_dev(li0, "class", "svelte-1y7l6h5");
    			add_location(li0, file$4, 6, 12, 416);
    			attr_dev(li1, "class", "svelte-1y7l6h5");
    			add_location(li1, file$4, 7, 12, 448);
    			attr_dev(li2, "class", "svelte-1y7l6h5");
    			add_location(li2, file$4, 8, 12, 489);
    			attr_dev(ul, "class", "svelte-1y7l6h5");
    			add_location(ul, file$4, 5, 8, 399);
    			attr_dev(div0, "class", "row pt-5");
    			add_location(div0, file$4, 3, 4, 253);
    			attr_dev(div1, "class", "container p-5");
    			add_location(div1, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, p0);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, p1);
    			append_dev(div0, t5);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			append_dev(ul, t9);
    			append_dev(ul, li2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Partners", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Partners> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Partners extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Partners",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/routes/NotFound.svelte generated by Svelte v3.30.1 */

    const file$5 = "src/routes/NotFound.svelte";

    function create_fragment$6(ctx) {
    	let h1;
    	let t1;
    	let p;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Not Found";
    			t1 = space();
    			p = element("p");
    			p.textContent = "This route doesn't exist.";
    			attr_dev(h1, "class", "svelte-r5e5ng");
    			add_location(h1, file$5, 0, 0, 0);
    			add_location(p, file$5, 1, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/routes/Clients.svelte generated by Svelte v3.30.1 */

    const file$6 = "src/routes/Clients.svelte";

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let h5;
    	let t3;
    	let h20;
    	let t5;
    	let p0;
    	let t6;
    	let br0;
    	let t7;
    	let br1;
    	let t8;
    	let br2;
    	let t9;
    	let br3;
    	let t10;
    	let h21;
    	let t12;
    	let p1;
    	let t13;
    	let br4;
    	let t14;
    	let br5;
    	let t15;
    	let br6;
    	let t16;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "CLIENTS";
    			t1 = space();
    			h5 = element("h5");
    			h5.textContent = "OUR CLIENTS";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "ST JOHN’S COLLEGE";
    			t5 = space();
    			p0 = element("p");
    			t6 = text("Education institution ");
    			br0 = element("br");
    			t7 = text("\n            Houghton Estate ");
    			br1 = element("br");
    			t8 = text("\n            Johannesburg ");
    			br2 = element("br");
    			t9 = text("\n            sproule@stjohnscollege.co.za / (+27)10 492 0196 ");
    			br3 = element("br");
    			t10 = space();
    			h21 = element("h2");
    			h21.textContent = "KAZIYA MUMBI MUSONDA";
    			t12 = space();
    			p1 = element("p");
    			t13 = text("Construction contractor ");
    			br4 = element("br");
    			t14 = text("\n            Lusaka ");
    			br5 = element("br");
    			t15 = text("\n            Zambia ");
    			br6 = element("br");
    			t16 = text("\n            (+260)97 749 5426");
    			add_location(h1, file$6, 2, 8, 81);
    			add_location(h5, file$6, 3, 8, 106);
    			attr_dev(h20, "class", "mb-3 mt-4");
    			add_location(h20, file$6, 4, 8, 135);
    			add_location(br0, file$6, 6, 34, 226);
    			add_location(br1, file$6, 7, 28, 259);
    			add_location(br2, file$6, 8, 25, 289);
    			add_location(br3, file$6, 9, 60, 354);
    			attr_dev(p0, "class", "svelte-o1sw40");
    			add_location(p0, file$6, 5, 8, 188);
    			attr_dev(h21, "class", "mb-3 mt-4");
    			add_location(h21, file$6, 11, 8, 380);
    			add_location(br4, file$6, 13, 36, 476);
    			add_location(br5, file$6, 14, 19, 500);
    			add_location(br6, file$6, 15, 19, 524);
    			attr_dev(p1, "class", "svelte-o1sw40");
    			add_location(p1, file$6, 12, 8, 436);
    			attr_dev(div0, "class", "text-center");
    			add_location(div0, file$6, 1, 5, 47);
    			attr_dev(div1, "class", "container mt-5 text-center");
    			add_location(div1, file$6, 0, 1, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, h5);
    			append_dev(div0, t3);
    			append_dev(div0, h20);
    			append_dev(div0, t5);
    			append_dev(div0, p0);
    			append_dev(p0, t6);
    			append_dev(p0, br0);
    			append_dev(p0, t7);
    			append_dev(p0, br1);
    			append_dev(p0, t8);
    			append_dev(p0, br2);
    			append_dev(p0, t9);
    			append_dev(p0, br3);
    			append_dev(div0, t10);
    			append_dev(div0, h21);
    			append_dev(div0, t12);
    			append_dev(div0, p1);
    			append_dev(p1, t13);
    			append_dev(p1, br4);
    			append_dev(p1, t14);
    			append_dev(p1, br5);
    			append_dev(p1, t15);
    			append_dev(p1, br6);
    			append_dev(p1, t16);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Clients", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Clients> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Clients extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clients",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    var routes = {
        '/': Home,
        '/about': About,
        '/products_and_services': Products,
        '/associates_and_partners': Partners,
        '/contact': Contact,
        '/clients': Clients,
        // The catch-all route must always be last
        '*': NotFound
    };

    /* src/components/Nav.svelte generated by Svelte v3.30.1 */

    const file$7 = "src/components/Nav.svelte";

    function create_fragment$8(ctx) {
    	let nav;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let button;
    	let span0;
    	let t1;
    	let div;
    	let ul;
    	let li0;
    	let a1;
    	let t2;
    	let span1;
    	let t4;
    	let li1;
    	let a2;
    	let t6;
    	let li2;
    	let a3;
    	let t8;
    	let li3;
    	let a4;
    	let t10;
    	let li4;
    	let a5;
    	let t12;
    	let li5;
    	let a6;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			button = element("button");
    			span0 = element("span");
    			t1 = space();
    			div = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			t2 = text("Home ");
    			span1 = element("span");
    			span1.textContent = "(current)";
    			t4 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "About";
    			t6 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "Products & Services";
    			t8 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "Associates & Partners";
    			t10 = space();
    			li4 = element("li");
    			a5 = element("a");
    			a5.textContent = "Clients";
    			t12 = space();
    			li5 = element("li");
    			a6 = element("a");
    			a6.textContent = "Contact";
    			if (img.src !== (img_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_enova_logo.original.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "80");
    			attr_dev(img, "height", "80");
    			attr_dev(img, "alt", "");
    			add_location(img, file$7, 3, 8, 120);
    			attr_dev(a0, "class", "navbar-brand");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$7, 2, 4, 78);
    			attr_dev(span0, "class", "navbar-toggler-icon");
    			add_location(span0, file$7, 6, 8, 471);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-toggle", "collapse");
    			attr_dev(button, "data-target", "#navbarColor01");
    			attr_dev(button, "aria-controls", "navbarColor01");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file$7, 5, 4, 282);
    			attr_dev(span1, "class", "sr-only");
    			add_location(span1, file$7, 12, 46, 710);
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "href", "/");
    			add_location(a1, file$7, 12, 12, 676);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$7, 11, 12, 642);
    			attr_dev(a2, "class", "nav-link");
    			attr_dev(a2, "href", "#/about");
    			add_location(a2, file$7, 15, 12, 817);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$7, 14, 12, 783);
    			attr_dev(a3, "class", "nav-link");
    			attr_dev(a3, "href", "#/products_and_services");
    			add_location(a3, file$7, 18, 12, 926);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$7, 17, 12, 892);
    			attr_dev(a4, "class", "nav-link");
    			attr_dev(a4, "href", "#/associates_and_partners");
    			add_location(a4, file$7, 21, 12, 1065);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$7, 20, 12, 1031);
    			attr_dev(a5, "class", "nav-link");
    			attr_dev(a5, "href", "#/clients");
    			add_location(a5, file$7, 24, 12, 1208);
    			attr_dev(li4, "class", "nav-item");
    			add_location(li4, file$7, 23, 12, 1174);
    			attr_dev(a6, "class", "nav-link");
    			attr_dev(a6, "href", "#/contact");
    			add_location(a6, file$7, 27, 12, 1321);
    			attr_dev(li5, "class", "nav-item");
    			add_location(li5, file$7, 26, 12, 1287);
    			attr_dev(ul, "class", "navbar-nav mr-auto");
    			add_location(ul, file$7, 10, 8, 598);
    			attr_dev(div, "class", "collapse navbar-collapse");
    			attr_dev(div, "id", "navbarColor01");
    			add_location(div, file$7, 9, 4, 532);
    			attr_dev(nav, "class", "navbar navbar-expand-lg navbar-light bg-light");
    			add_location(nav, file$7, 1, 0, 14);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a0);
    			append_dev(a0, img);
    			append_dev(nav, t0);
    			append_dev(nav, button);
    			append_dev(button, span0);
    			append_dev(nav, t1);
    			append_dev(nav, div);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(a1, t2);
    			append_dev(a1, span1);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(li3, a4);
    			append_dev(ul, t10);
    			append_dev(ul, li4);
    			append_dev(li4, a5);
    			append_dev(ul, t12);
    			append_dev(ul, li5);
    			append_dev(li5, a6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Nav", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.30.1 */

    const file$8 = "src/components/Footer.svelte";

    function create_fragment$9(ctx) {
    	let footer;
    	let div7;
    	let div6;
    	let div0;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h30;
    	let t2;
    	let ul;
    	let li0;
    	let a1;
    	let t4;
    	let li1;
    	let a2;
    	let t6;
    	let li2;
    	let a3;
    	let t8;
    	let div4;
    	let h31;
    	let t10;
    	let div2;
    	let a4;
    	let i0;
    	let t11;
    	let a5;
    	let i1;
    	let t12;
    	let div3;
    	let a6;
    	let i2;
    	let t13;
    	let a7;
    	let i3;
    	let t14;
    	let div5;
    	let h5;
    	let t16;
    	let p;
    	let t18;
    	let a8;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Useful Links";
    			t2 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "About";
    			t4 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "Products & Services";
    			t6 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "Contact Us";
    			t8 = space();
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Follow Us";
    			t10 = space();
    			div2 = element("div");
    			a4 = element("a");
    			i0 = element("i");
    			t11 = space();
    			a5 = element("a");
    			i1 = element("i");
    			t12 = space();
    			div3 = element("div");
    			a6 = element("a");
    			i2 = element("i");
    			t13 = space();
    			a7 = element("a");
    			i3 = element("i");
    			t14 = space();
    			div5 = element("div");
    			h5 = element("h5");
    			h5.textContent = "© Enova Enterprises, 2020";
    			t16 = space();
    			p = element("p");
    			p.textContent = "-All rights reserved";
    			t18 = space();
    			a8 = element("a");
    			a8.textContent = "Designed by Splyce";
    			if (img.src !== (img_src_value = "https://enova-live-d3cdd1395c1f403893f5d4071b0e-436698d.divio-media.org/images/rsz_enova_logo.original.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "logo");
    			attr_dev(img, "class", "img-fluid");
    			add_location(img, file$8, 5, 61, 245);
    			attr_dev(a0, "href", "https://enovaenterprises.co.za/en/");
    			add_location(a0, file$8, 5, 16, 200);
    			attr_dev(div0, "class", "col-md-3 col-sm-6 col-xs-12 segment-one");
    			add_location(div0, file$8, 4, 12, 130);
    			attr_dev(h30, "class", "svelte-udm9lv");
    			add_location(h30, file$8, 8, 16, 498);
    			attr_dev(a1, "href", "/about");
    			attr_dev(a1, "class", "svelte-udm9lv");
    			add_location(a1, file$8, 10, 24, 565);
    			attr_dev(li0, "class", "svelte-udm9lv");
    			add_location(li0, file$8, 10, 20, 561);
    			attr_dev(a2, "href", "/products_and_services");
    			attr_dev(a2, "class", "svelte-udm9lv");
    			add_location(a2, file$8, 11, 24, 621);
    			attr_dev(li1, "class", "svelte-udm9lv");
    			add_location(li1, file$8, 11, 20, 617);
    			attr_dev(a3, "href", "/contact");
    			attr_dev(a3, "class", "svelte-udm9lv");
    			add_location(a3, file$8, 12, 24, 707);
    			attr_dev(li2, "class", "svelte-udm9lv");
    			add_location(li2, file$8, 12, 20, 703);
    			attr_dev(ul, "class", "svelte-udm9lv");
    			add_location(ul, file$8, 9, 16, 536);
    			attr_dev(div1, "class", "col-md-3 col-sm-6 col-xs-12 segment-two svelte-udm9lv");
    			add_location(div1, file$8, 7, 12, 428);
    			attr_dev(h31, "class", "svelte-udm9lv");
    			add_location(h31, file$8, 16, 16, 903);
    			attr_dev(i0, "class", "fa fa-facebook fa-3x");
    			add_location(i0, file$8, 18, 101, 1057);
    			attr_dev(a4, "href", "https://www.facebook.com/Enova-Enterprises-109175657449740");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "class", "svelte-udm9lv");
    			add_location(a4, file$8, 18, 16, 972);
    			attr_dev(i1, "class", "far fa-envelope fa-3x");
    			add_location(i1, file$8, 19, 78, 1176);
    			attr_dev(a5, "href", "mailto:admin@enovaenterprises.co.za");
    			attr_dev(a5, "target", "_blank");
    			attr_dev(a5, "class", "svelte-udm9lv");
    			add_location(a5, file$8, 19, 16, 1114);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$8, 17, 16, 938);
    			attr_dev(i2, "class", "fab fa-instagram fa-3x");
    			add_location(i2, file$8, 22, 78, 1353);
    			attr_dev(a6, "href", "https://www.instagram.com/enovaent/");
    			attr_dev(a6, "target", "_blank");
    			attr_dev(a6, "class", "svelte-udm9lv");
    			add_location(a6, file$8, 22, 16, 1291);
    			attr_dev(i3, "class", "fab fa-twitter fa-3x");
    			add_location(i3, file$8, 23, 78, 1474);
    			attr_dev(a7, "href", "https://twitter.com/EnovaEnterprise");
    			attr_dev(a7, "target", "_blank");
    			attr_dev(a7, "class", "svelte-udm9lv");
    			add_location(a7, file$8, 23, 16, 1412);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$8, 21, 16, 1257);
    			attr_dev(div4, "class", "col-md-3 col-sm-6 col-xs-12 pl-5 segment-three svelte-udm9lv");
    			add_location(div4, file$8, 15, 12, 826);
    			attr_dev(h5, "class", "svelte-udm9lv");
    			add_location(h5, file$8, 27, 16, 1640);
    			attr_dev(p, "id", "darker");
    			add_location(p, file$8, 28, 16, 1691);
    			attr_dev(a8, "href", "https://splyce.dev");
    			attr_dev(a8, "target", "_blank");
    			add_location(a8, file$8, 29, 16, 1747);
    			attr_dev(div5, "class", "col-md-3 col-sm-6 col-xs-12 segment-four svelte-udm9lv");
    			add_location(div5, file$8, 26, 12, 1569);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$8, 3, 8, 100);
    			attr_dev(div7, "class", "container-fluid");
    			add_location(div7, file$8, 2, 4, 62);
    			attr_dev(footer, "class", "footer footer_look mt-5 svelte-udm9lv");
    			add_location(footer, file$8, 1, 0, 17);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img);
    			append_dev(div6, t0);
    			append_dev(div6, div1);
    			append_dev(div1, h30);
    			append_dev(div1, t2);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(div6, t8);
    			append_dev(div6, div4);
    			append_dev(div4, h31);
    			append_dev(div4, t10);
    			append_dev(div4, div2);
    			append_dev(div2, a4);
    			append_dev(a4, i0);
    			append_dev(div2, t11);
    			append_dev(div2, a5);
    			append_dev(a5, i1);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			append_dev(div3, a6);
    			append_dev(a6, i2);
    			append_dev(div3, t13);
    			append_dev(div3, a7);
    			append_dev(a7, i3);
    			append_dev(div6, t14);
    			append_dev(div6, div5);
    			append_dev(div5, h5);
    			append_dev(div5, t16);
    			append_dev(div5, p);
    			append_dev(div5, t18);
    			append_dev(div5, a8);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.30.1 */
    const file$9 = "src/App.svelte";

    function create_fragment$a(ctx) {
    	let nav;
    	let t0;
    	let main;
    	let router;
    	let t1;
    	let footer;
    	let current;
    	nav = new Nav({ $$inline: true });
    	router = new Router({ props: { routes }, $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(nav.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(router.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(main, "class", "svelte-1x4qrzh");
    			add_location(main, file$9, 9, 0, 206);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(router, main, null);
    			insert_dev(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    			if (detaching) detach_dev(t1);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router, routes, Nav, Footer });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
