
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
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
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
    function createEventDispatcher() {
        const component = current_component;
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
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
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
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
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
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Modal.svelte generated by Svelte v3.12.1 */

    const file = "src/Modal.svelte";

    function create_fragment(ctx) {
    	var div0, t0, div1, t1, br, t2, button, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");

    			if (default_slot) default_slot.c();
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Stäng";
    			attr_dev(div0, "class", "modal-background svelte-1k3utew");
    			add_location(div0, file, 35, 0, 544);

    			add_location(br, file, 41, 4, 702);
    			attr_dev(button, "class", "svelte-1k3utew");
    			add_location(button, file, 43, 1, 709);
    			attr_dev(div1, "class", "modal svelte-1k3utew");
    			add_location(div1, file, 37, 0, 619);

    			dispose = [
    				listen_dev(div0, "click", ctx.click_handler),
    				listen_dev(button, "click", ctx.click_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div1_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div1, t1);
    			append_dev(div1, br);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	let { $$slots = {}, $$scope } = $$props;

    	const click_handler = () => dispatch("close");

    	const click_handler_1 = () => dispatch("close");

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return {
    		dispatch,
    		click_handler,
    		click_handler_1,
    		$$slots,
    		$$scope
    	};
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Modal", options, id: create_fragment.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/App.svelte";

    // (621:0) {:else}
    function create_else_block(ctx) {
    	var div0, img, t0, div1, h1, t2, p;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Det är allt!";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Du är nu klar med övningen. Bra jobbat!";
    			attr_dev(img, "width", "700px");
    			attr_dev(img, "src", "bild-12.jpg");
    			attr_dev(img, "alt", "Slut");
    			add_location(img, file$1, 622, 4, 17372);
    			attr_dev(div0, "class", "canvas svelte-1di7duj");
    			add_location(div0, file$1, 621, 2, 17347);
    			add_location(h1, file$1, 625, 4, 17444);
    			add_location(p, file$1, 626, 4, 17470);
    			add_location(div1, file$1, 624, 2, 17434);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t0);
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(621:0) {:else}", ctx });
    	return block;
    }

    // (579:18) 
    function create_if_block_23(ctx) {
    	var div3, video, source, t0, t1, div0, p, t3, div1, form, input, t4, button, t6, current_block_type_index, if_block, t7, div2, current, dispose;

    	var if_block_creators = [
    		create_if_block_24,
    		create_if_block_25
    	];

    	var if_blocks = [];

    	function select_block_type_7(changed, ctx) {
    		if (ctx.showModal7Wrong) return 0;
    		if (ctx.showModal7Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_7(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			video = element("video");
    			source = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Nu är övningen slut, avsluta med koden för programslut";
    			t3 = space();
    			div1 = element("div");
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div2 = element("div");
    			attr_dev(source, "src", "clip-11.mp4");
    			attr_dev(source, "type", "video/mp4");
    			add_location(source, file$1, 581, 6, 16243);
    			video.autoplay = true;
    			video.loop = true;
    			attr_dev(video, "width", "700px");
    			add_location(video, file$1, 580, 4, 16201);
    			add_location(p, file$1, 585, 6, 16392);
    			add_location(div0, file$1, 584, 4, 16380);
    			input.autofocus = true;
    			set_style(input, "text-transform", "uppercase");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 590, 8, 16540);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 596, 8, 16715);
    			add_location(form, file$1, 589, 6, 16525);
    			add_location(div1, file$1, 587, 4, 16469);
    			add_location(div2, file$1, 618, 4, 17320);
    			attr_dev(div3, "class", "canvas svelte-1di7duj");
    			add_location(div3, file$1, 579, 2, 16176);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler_6),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.end), false, true),
    				listen_dev(button, "focus", deleteVideo)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, video);
    			append_dev(video, source);
    			append_dev(video, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, p);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.point6Value);

    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(div1, t6);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div1, null);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.point6Value && (input.value !== ctx.point6Value)) set_input_value(input, ctx.point6Value);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_7(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div3);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_23.name, type: "if", source: "(579:18) ", ctx });
    	return block;
    }

    // (564:19) 
    function create_if_block_22(ctx) {
    	var div2, video0, source0, t0, t1, div0, p, t3, div1, t4, video1, source1, t5;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			t4 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t5 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-10.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 566, 6, 15727);
    			video0.autoplay = true;
    			video0.loop = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 565, 4, 15685);
    			add_location(p, file$1, 570, 6, 15876);
    			add_location(div0, file$1, 569, 4, 15864);
    			add_location(div1, file$1, 572, 4, 15963);
    			attr_dev(div2, "class", "canvas svelte-1di7duj");
    			add_location(div2, file$1, 564, 2, 15660);
    			attr_dev(source1, "src", "clip-11.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 575, 6, 16022);
    			video1.autoplay = true;
    			video1.loop = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 574, 2, 15982);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t5);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    				detach_dev(t4);
    				detach_dev(video1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_22.name, type: "if", source: "(564:19) ", ctx });
    	return block;
    }

    // (524:16) 
    function create_if_block_19(ctx) {
    	var div3, video0, source0, t0, t1, div0, p, t3, div1, form, input, t4, button, t6, current_block_type_index, if_block, t7, div2, t8, video1, source1, t9, current, dispose;

    	var if_block_creators = [
    		create_if_block_20,
    		create_if_block_21
    	];

    	var if_blocks = [];

    	function select_block_type_6(changed, ctx) {
    		if (ctx.showModal6Wrong) return 0;
    		if (ctx.showModal6Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_6(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t9 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-9.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 526, 6, 14481);
    			video0.autoplay = true;
    			video0.loop = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 525, 4, 14439);
    			add_location(p, file$1, 530, 6, 14629);
    			add_location(div0, file$1, 529, 4, 14617);
    			input.autofocus = true;
    			set_style(input, "text-transform", "uppercase");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 535, 8, 14787);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 541, 8, 14962);
    			add_location(form, file$1, 534, 6, 14772);
    			add_location(div1, file$1, 532, 4, 14716);
    			add_location(div2, file$1, 557, 4, 15446);
    			attr_dev(div3, "class", "canvas svelte-1di7duj");
    			add_location(div3, file$1, 524, 2, 14414);
    			attr_dev(source1, "src", "clip-10.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 560, 6, 15505);
    			video1.autoplay = true;
    			video1.loop = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 559, 2, 15465);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler_5),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.point5), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, p);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.point5Value);

    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(div3, t6);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div3, null);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t9);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.point5Value && (input.value !== ctx.point5Value)) set_input_value(input, ctx.point5Value);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_6(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div3, t7);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div3);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(video1);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_19.name, type: "if", source: "(524:16) ", ctx });
    	return block;
    }

    // (509:16) 
    function create_if_block_18(ctx) {
    	var div2, video0, source0, t0, t1, div0, p, t3, div1, t4, video1, source1, t5;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			t4 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t5 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-8.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 511, 6, 13969);
    			video0.autoplay = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 510, 4, 13932);
    			add_location(p, file$1, 515, 6, 14117);
    			add_location(div0, file$1, 514, 4, 14105);
    			add_location(div1, file$1, 517, 4, 14204);
    			attr_dev(div2, "class", "canvas svelte-1di7duj");
    			add_location(div2, file$1, 509, 2, 13907);
    			attr_dev(source1, "src", "clip-9.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 520, 6, 14263);
    			video1.autoplay = true;
    			video1.loop = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 519, 2, 14223);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t5);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    				detach_dev(t4);
    				detach_dev(video1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_18.name, type: "if", source: "(509:16) ", ctx });
    	return block;
    }

    // (466:16) 
    function create_if_block_15(ctx) {
    	var div4, video0, source0, t0, t1, div2, div0, p, t3, div1, form, input, t4, button, t6, current_block_type_index, if_block, t7, div3, t8, video1, source1, t9, current, dispose;

    	var if_block_creators = [
    		create_if_block_16,
    		create_if_block_17
    	];

    	var if_blocks = [];

    	function select_block_type_5(changed, ctx) {
    		if (ctx.showModal5Wrong) return 0;
    		if (ctx.showModal5Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_5(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div3 = element("div");
    			t8 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t9 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-7.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 468, 6, 12650);
    			video0.autoplay = true;
    			video0.loop = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 467, 4, 12608);
    			add_location(p, file$1, 473, 8, 12812);
    			add_location(div0, file$1, 472, 6, 12798);
    			input.autofocus = true;
    			set_style(input, "text-transform", "uppercase");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 478, 10, 12980);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 484, 10, 13167);
    			add_location(form, file$1, 477, 8, 12963);
    			add_location(div1, file$1, 475, 6, 12903);
    			add_location(div2, file$1, 471, 4, 12786);
    			add_location(div3, file$1, 502, 4, 13702);
    			attr_dev(div4, "class", "canvas svelte-1di7duj");
    			add_location(div4, file$1, 466, 2, 12583);
    			attr_dev(source1, "src", "clip-8.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 505, 6, 13756);
    			video1.autoplay = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 504, 2, 13721);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler_4),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.point4), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.point4Value);

    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(div2, t6);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div2, null);
    			append_dev(div4, t7);
    			append_dev(div4, div3);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t9);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.point4Value && (input.value !== ctx.point4Value)) set_input_value(input, ctx.point4Value);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_5(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div4);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(video1);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_15.name, type: "if", source: "(466:16) ", ctx });
    	return block;
    }

    // (451:18) 
    function create_if_block_14(ctx) {
    	var div2, video0, source0, t0, t1, div0, p, t3, div1, t4, video1, source1, t5;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			t4 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t5 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-6.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 453, 6, 12138);
    			video0.autoplay = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 452, 4, 12101);
    			add_location(p, file$1, 457, 6, 12286);
    			add_location(div0, file$1, 456, 4, 12274);
    			add_location(div1, file$1, 459, 4, 12373);
    			attr_dev(div2, "class", "canvas svelte-1di7duj");
    			add_location(div2, file$1, 451, 2, 12076);
    			attr_dev(source1, "src", "clip-7.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 462, 6, 12432);
    			video1.autoplay = true;
    			video1.loop = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 461, 2, 12392);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t5);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    				detach_dev(t4);
    				detach_dev(video1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_14.name, type: "if", source: "(451:18) ", ctx });
    	return block;
    }

    // (408:16) 
    function create_if_block_11(ctx) {
    	var div4, video0, source0, t0, t1, div2, div0, p, t3, div1, form, input, t4, button, t6, current_block_type_index, if_block, t7, div3, t8, video1, source1, t9, current, dispose;

    	var if_block_creators = [
    		create_if_block_12,
    		create_if_block_13
    	];

    	var if_blocks = [];

    	function select_block_type_4(changed, ctx) {
    		if (ctx.showModal4Wrong) return 0;
    		if (ctx.showModal4Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_4(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div3 = element("div");
    			t8 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t9 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-5.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 410, 6, 10817);
    			video0.autoplay = true;
    			video0.loop = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 409, 4, 10775);
    			add_location(p, file$1, 415, 8, 10979);
    			add_location(div0, file$1, 414, 6, 10965);
    			input.autofocus = true;
    			set_style(input, "text-transform", "uppercase");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 420, 10, 11147);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 426, 10, 11334);
    			add_location(form, file$1, 419, 8, 11130);
    			add_location(div1, file$1, 417, 6, 11070);
    			add_location(div2, file$1, 413, 4, 10953);
    			add_location(div3, file$1, 444, 4, 11869);
    			attr_dev(div4, "class", "canvas svelte-1di7duj");
    			add_location(div4, file$1, 408, 2, 10750);
    			attr_dev(source1, "src", "clip-6.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 447, 6, 11923);
    			video1.autoplay = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 446, 2, 11888);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler_3),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.point3), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.point3Value);

    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(div2, t6);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div2, null);
    			append_dev(div4, t7);
    			append_dev(div4, div3);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t9);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.point3Value && (input.value !== ctx.point3Value)) set_input_value(input, ctx.point3Value);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_4(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div4);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(video1);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_11.name, type: "if", source: "(408:16) ", ctx });
    	return block;
    }

    // (397:15) 
    function create_if_block_10(ctx) {
    	var div2, video, source, t0, t1, div0, p, t3, div1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			video = element("video");
    			source = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			attr_dev(source, "src", "clip-4.mp4");
    			attr_dev(source, "type", "video/mp4");
    			add_location(source, file$1, 399, 6, 10479);
    			video.autoplay = true;
    			attr_dev(video, "width", "700px");
    			add_location(video, file$1, 398, 4, 10442);
    			add_location(p, file$1, 403, 6, 10627);
    			add_location(div0, file$1, 402, 4, 10615);
    			add_location(div1, file$1, 405, 4, 10714);
    			attr_dev(div2, "class", "canvas svelte-1di7duj");
    			add_location(div2, file$1, 397, 2, 10417);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video);
    			append_dev(video, source);
    			append_dev(video, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_10.name, type: "if", source: "(397:15) ", ctx });
    	return block;
    }

    // (355:17) 
    function create_if_block_7(ctx) {
    	var div3, video0, source0, t0, t1, div0, p, t3, div1, form, input, t4, button, t6, current_block_type_index, if_block, t7, div2, t8, video1, source1, t9, current, dispose;

    	var if_block_creators = [
    		create_if_block_8,
    		create_if_block_9
    	];

    	var if_blocks = [];

    	function select_block_type_3(changed, ctx) {
    		if (ctx.showModal3Wrong) return 0;
    		if (ctx.showModal3Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_3(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Följ den blå punkten runt konturen ange G-värde X-värde Z-värde.";
    			t3 = space();
    			div1 = element("div");
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div2 = element("div");
    			t8 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t9 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-3.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 357, 6, 9234);
    			video0.autoplay = true;
    			video0.loop = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 356, 4, 9192);
    			add_location(p, file$1, 361, 6, 9382);
    			add_location(div0, file$1, 360, 4, 9370);
    			input.autofocus = true;
    			set_style(input, "text-transform", "uppercase");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 368, 8, 9556);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 374, 8, 9731);
    			add_location(form, file$1, 367, 6, 9541);
    			add_location(div1, file$1, 365, 4, 9485);
    			add_location(div2, file$1, 390, 4, 10213);
    			attr_dev(div3, "class", "canvas svelte-1di7duj");
    			add_location(div3, file$1, 355, 2, 9167);
    			attr_dev(source1, "src", "clip-4.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 393, 6, 10267);
    			video1.autoplay = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 392, 2, 10232);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler_2),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.point2), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, p);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.point2Value);

    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(div3, t6);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div3, null);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t9);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.point2Value && (input.value !== ctx.point2Value)) set_input_value(input, ctx.point2Value);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_3(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div3, t7);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div3);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(video1);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_7.name, type: "if", source: "(355:17) ", ctx });
    	return block;
    }

    // (335:16) 
    function create_if_block_6(ctx) {
    	var div1, video0, source0, t0, t1, div0, p, t3, video1, source1, t4;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Programmera dig från punkt till punkt. Observera att både X & Z måste\n        anges för varje block. Grönt streck = G1, G2 eller G3. Rött streck = G0\n        Använd snabbmatning (G0) vid körning till konturen. Följ den blå punkten\n        runt konturen. Avsluta med kod för programslut. Varje ruta motsvarar\n        10mm och tänk på att X är diametral";
    			t3 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t4 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-2.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 337, 6, 8430);
    			video0.autoplay = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 336, 4, 8393);
    			add_location(p, file$1, 341, 6, 8578);
    			add_location(div0, file$1, 340, 4, 8566);
    			attr_dev(div1, "class", "canvas svelte-1di7duj");
    			add_location(div1, file$1, 335, 2, 8368);
    			attr_dev(source1, "src", "clip-3.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 351, 6, 9015);
    			video1.autoplay = true;
    			video1.loop = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 350, 2, 8975);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t4);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    				detach_dev(t3);
    				detach_dev(video1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_6.name, type: "if", source: "(335:16) ", ctx });
    	return block;
    }

    // (290:17) 
    function create_if_block_3(ctx) {
    	var div2, video0, source0, t0, t1, div1, div0, p, t3, form, input, t4, button, t6, current_block_type_index, if_block, t7, video1, source1, t8, current, dispose;

    	var if_block_creators = [
    		create_if_block_4,
    		create_if_block_5
    	];

    	var if_blocks = [];

    	function select_block_type_2(changed, ctx) {
    		if (ctx.showModal2Wrong) return 0;
    		if (ctx.showModal2Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_2(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			video0 = element("video");
    			source0 = element("source");
    			t0 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Programmera dig från punkt till punkt. Observera att både X & Z måste\n          anges för varje block. Grönt streck = G1, G2 eller G3. Rött streck =\n          G0 Använd snabbmatning (G0) vid körning till konturen. Följ den blå\n          punkten runt konturen. Avsluta med kod för programslut. Varje ruta\n          motsvarar 10mm och tänk på att X är diametral";
    			t3 = space();
    			form = element("form");
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t8 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(source0, "src", "clip-1.mp4");
    			attr_dev(source0, "type", "video/mp4");
    			add_location(source0, file$1, 292, 6, 6891);
    			video0.autoplay = true;
    			video0.loop = true;
    			attr_dev(video0, "width", "700px");
    			add_location(video0, file$1, 291, 4, 6849);
    			add_location(p, file$1, 297, 8, 7053);
    			add_location(div0, file$1, 296, 6, 7039);
    			input.autofocus = true;
    			set_style(input, "text-transform", "uppercase");
    			attr_dev(input, "type", "text");
    			add_location(input, file$1, 307, 8, 7518);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 313, 8, 7693);
    			add_location(form, file$1, 306, 6, 7503);
    			add_location(div1, file$1, 295, 4, 7027);
    			attr_dev(div2, "class", "canvas svelte-1di7duj");
    			add_location(div2, file$1, 290, 2, 6824);
    			attr_dev(source1, "src", "clip-2.mp4");
    			attr_dev(source1, "type", "video/mp4");
    			add_location(source1, file$1, 331, 6, 8217);
    			video1.autoplay = true;
    			attr_dev(video1, "width", "0px");
    			add_location(video1, file$1, 330, 2, 8182);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler_1),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.point1), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video0);
    			append_dev(video0, source0);
    			append_dev(video0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(div1, t3);
    			append_dev(div1, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.point1Value);

    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(div2, t6);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div2, null);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			append_dev(video1, t8);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.point1Value && (input.value !== ctx.point1Value)) set_input_value(input, ctx.point1Value);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div2);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();

    			if (detaching) {
    				detach_dev(t7);
    				detach_dev(video1);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(290:17) ", ctx });
    	return block;
    }

    // (248:0) {#if first}
    function create_if_block(ctx) {
    	var div3, div0, img, t0, div1, p, t2, div2, form, input, t3, button, t5, current_block_type_index, if_block, t6, video, source, t7, current, dispose;

    	var if_block_creators = [
    		create_if_block_1,
    		create_if_block_2
    	];

    	var if_blocks = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.showModal1Wrong) return 0;
    		if (ctx.showModal1Tip) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_1(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Starta Spindeln moturs på ett tusen varv i minuten, börja med m-koden.";
    			t2 = space();
    			div2 = element("div");
    			form = element("form");
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Kör";
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			video = element("video");
    			source = element("source");
    			t7 = text("\n      Du måste använda en annan webbläsare för att kunna spela upp video.");
    			attr_dev(img, "width", "100%");
    			attr_dev(img, "src", "bild-01.jpg");
    			attr_dev(img, "alt", "Bild 1");
    			add_location(img, file$1, 250, 6, 5653);
    			add_location(div0, file$1, 249, 4, 5641);
    			add_location(p, file$1, 253, 6, 5732);
    			add_location(div1, file$1, 252, 4, 5720);
    			input.autofocus = true;
    			attr_dev(input, "type", "text");
    			set_style(input, "text-transform", "uppercase");
    			add_location(input, file$1, 260, 8, 5912);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$1, 266, 8, 6094);
    			add_location(form, file$1, 259, 6, 5897);
    			add_location(div2, file$1, 257, 4, 5841);
    			attr_dev(div3, "class", "canvas svelte-1di7duj");
    			add_location(div3, file$1, 248, 2, 5616);
    			attr_dev(source, "src", "clip-1.mp4");
    			attr_dev(source, "type", "video/mp4");
    			add_location(source, file$1, 286, 6, 6672);
    			video.autoplay = true;
    			video.loop = true;
    			attr_dev(video, "width", "0px");
    			add_location(video, file$1, 285, 2, 6632);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler),
    				listen_dev(input, "input", make_uppercase),
    				listen_dev(button, "click", prevent_default(ctx.startRotation), false, true)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, img);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, p);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, form);
    			append_dev(form, input);

    			set_input_value(input, ctx.startRotationValue);

    			append_dev(form, t3);
    			append_dev(form, button);
    			append_dev(div3, t5);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(div3, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, video, anchor);
    			append_dev(video, source);
    			append_dev(video, t7);
    			current = true;
    			input.focus();
    		},

    		p: function update(changed, ctx) {
    			if (changed.startRotationValue && (input.value !== ctx.startRotationValue)) set_input_value(input, ctx.startRotationValue);

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(div3, null);
    				} else {
    					if_block = null;
    				}
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
    			if (detaching) {
    				detach_dev(div3);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();

    			if (detaching) {
    				detach_dev(t6);
    				detach_dev(video);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(248:0) {#if first}", ctx });
    	return block;
    }

    // (613:30) 
    function create_if_block_25(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_13] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_13);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_25.name, type: "if", source: "(613:30) ", ctx });
    	return block;
    }

    // (604:6) {#if showModal7Wrong}
    function create_if_block_24(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_12] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_12);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_24.name, type: "if", source: "(604:6) {#if showModal7Wrong}", ctx });
    	return block;
    }

    // (614:8) <Modal on:close={() => (showModal7Tip = false)}>
    function create_default_slot_13(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "För att avsluta ange M30";
    			add_location(p, file$1, 614, 10, 17244);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_13.name, type: "slot", source: "(614:8) <Modal on:close={() => (showModal7Tip = false)}>", ctx });
    	return block;
    }

    // (605:8) <Modal on:close={() => (showModal7Wrong = false)}>
    function create_default_slot_12(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på\n            ordningsföljden.";
    			add_location(p, file$1, 607, 10, 17016);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_12.name, type: "slot", source: "(605:8) <Modal on:close={() => (showModal7Wrong = false)}>", ctx });
    	return block;
    }

    // (553:28) 
    function create_if_block_21(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_11] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_11);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_21.name, type: "if", source: "(553:28) ", ctx });
    	return block;
    }

    // (545:4) {#if showModal6Wrong}
    function create_if_block_20(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_10] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_10);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_20.name, type: "if", source: "(545:4) {#if showModal6Wrong}", ctx });
    	return block;
    }

    // (554:6) <Modal on:close={() => (showModal6Tip = false)}>
    function create_default_slot_11(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "G1X80Z-50";
    			add_location(p, file$1, 554, 8, 15400);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_11.name, type: "slot", source: "(554:6) <Modal on:close={() => (showModal6Tip = false)}>", ctx });
    	return block;
    }

    // (546:6) <Modal on:close={() => (showModal6Wrong = false)}>
    function create_default_slot_10(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på ordningsföljden.";
    			add_location(p, file$1, 548, 8, 15196);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_10.name, type: "slot", source: "(546:6) <Modal on:close={() => (showModal6Wrong = false)}>", ctx });
    	return block;
    }

    // (497:30) 
    function create_if_block_17(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_9] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_9);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_17.name, type: "if", source: "(497:30) ", ctx });
    	return block;
    }

    // (488:6) {#if showModal5Wrong}
    function create_if_block_16(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_8);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_16.name, type: "if", source: "(488:6) {#if showModal5Wrong}", ctx });
    	return block;
    }

    // (498:8) <Modal on:close={() => (showModal5Tip = false)}>
    function create_default_slot_9(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "G1X60Z-50";
    			add_location(p, file$1, 498, 10, 13641);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_9.name, type: "slot", source: "(498:8) <Modal on:close={() => (showModal5Tip = false)}>", ctx });
    	return block;
    }

    // (489:8) <Modal on:close={() => (showModal5Wrong = false)}>
    function create_default_slot_8(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på\n            ordningsföljden.";
    			add_location(p, file$1, 491, 10, 13413);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_8.name, type: "slot", source: "(489:8) <Modal on:close={() => (showModal5Wrong = false)}>", ctx });
    	return block;
    }

    // (439:30) 
    function create_if_block_13(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_7);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_13.name, type: "if", source: "(439:30) ", ctx });
    	return block;
    }

    // (430:6) {#if showModal4Wrong}
    function create_if_block_12(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_6);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_12.name, type: "if", source: "(430:6) {#if showModal4Wrong}", ctx });
    	return block;
    }

    // (440:8) <Modal on:close={() => (showModal4Tip = false)}>
    function create_default_slot_7(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "G1X50Z-15";
    			add_location(p, file$1, 440, 10, 11808);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_7.name, type: "slot", source: "(440:8) <Modal on:close={() => (showModal4Tip = false)}>", ctx });
    	return block;
    }

    // (431:8) <Modal on:close={() => (showModal4Wrong = false)}>
    function create_default_slot_6(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på\n            ordningsföljden.";
    			add_location(p, file$1, 433, 10, 11580);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_6.name, type: "slot", source: "(431:8) <Modal on:close={() => (showModal4Wrong = false)}>", ctx });
    	return block;
    }

    // (386:28) 
    function create_if_block_9(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_5);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_9.name, type: "if", source: "(386:28) ", ctx });
    	return block;
    }

    // (378:4) {#if showModal3Wrong}
    function create_if_block_8(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_4);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_8.name, type: "if", source: "(378:4) {#if showModal3Wrong}", ctx });
    	return block;
    }

    // (387:6) <Modal on:close={() => (showModal3Tip = false)}>
    function create_default_slot_5(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "G1X40Z0";
    			add_location(p, file$1, 387, 8, 10169);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_5.name, type: "slot", source: "(387:6) <Modal on:close={() => (showModal3Tip = false)}>", ctx });
    	return block;
    }

    // (379:6) <Modal on:close={() => (showModal3Wrong = false)}>
    function create_default_slot_4(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på ordningsföljden.";
    			add_location(p, file$1, 381, 8, 9965);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4.name, type: "slot", source: "(379:6) <Modal on:close={() => (showModal3Wrong = false)}>", ctx });
    	return block;
    }

    // (325:28) 
    function create_if_block_5(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_3);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_5.name, type: "if", source: "(325:28) ", ctx });
    	return block;
    }

    // (317:4) {#if showModal2Wrong}
    function create_if_block_4(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_2);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4.name, type: "if", source: "(317:4) {#if showModal2Wrong}", ctx });
    	return block;
    }

    // (326:6) <Modal on:close={() => (showModal2Tip = false)}>
    function create_default_slot_3(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "G0X40Z5";
    			add_location(p, file$1, 326, 8, 8131);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(326:6) <Modal on:close={() => (showModal2Tip = false)}>", ctx });
    	return block;
    }

    // (318:6) <Modal on:close={() => (showModal2Wrong = false)}>
    function create_default_slot_2(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på ordningsföljden.";
    			add_location(p, file$1, 320, 8, 7927);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(318:6) <Modal on:close={() => (showModal2Wrong = false)}>", ctx });
    	return block;
    }

    // (280:28) 
    function create_if_block_2(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler_1);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(280:28) ", ctx });
    	return block;
    }

    // (272:4) {#if showModal1Wrong}
    function create_if_block_1(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("close", ctx.close_handler);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(272:4) {#if showModal1Wrong}", ctx });
    	return block;
    }

    // (281:6) <Modal on:close={() => (showModal1Tip = false)}>
    function create_default_slot_1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Skriv in M4S1000 tryck på Kör";
    			add_location(p, file$1, 281, 8, 6559);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(281:6) <Modal on:close={() => (showModal1Tip = false)}>", ctx });
    	return block;
    }

    // (273:6) <Modal on:close={() => (showModal1Wrong = false)}>
    function create_default_slot(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Tyvärr så var det inte rätt, försök igen och tänk på ordningsföljden.";
    			add_location(p, file$1, 275, 8, 6355);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(273:6) <Modal on:close={() => (showModal1Wrong = false)}>", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block,
    		create_if_block_3,
    		create_if_block_6,
    		create_if_block_7,
    		create_if_block_10,
    		create_if_block_11,
    		create_if_block_14,
    		create_if_block_15,
    		create_if_block_18,
    		create_if_block_19,
    		create_if_block_22,
    		create_if_block_23,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.first) return 0;
    		if (ctx.second) return 1;
    		if (ctx.third) return 2;
    		if (ctx.fourth) return 3;
    		if (ctx.fift) return 4;
    		if (ctx.sixth) return 5;
    		if (ctx.seventh) return 6;
    		if (ctx.eight) return 7;
    		if (ctx.ninth) return 8;
    		if (ctx.tenth) return 9;
    		if (ctx.eleventh) return 10;
    		if (ctx.twelfth) return 11;
    		return 12;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
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

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function deleteVideo() {
      caches.delete("video");
    }

    function fetchAndCache(videoFileUrls, cache) {
      // Check first if video is in the cache.
      return cache.match(videoFileUrls).then(cacheResponse => {
        // Let's return cached response if video is already in the cache.
        if (cacheResponse) {
          return cacheResponse;
        }
        // Otherwise, fetch the video from the network.
        return fetch(videoFileUrls).then(networkResponse => {
          // Add the response to the cache and return network response in parallel.
          cache.put(videoFileUrls, networkResponse.clone());
          return networkResponse;
        });
      });
    }

    function make_uppercase() {
      this.value = this.value.toLocaleUpperCase();
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const videoFileUrls = [
        "clip-1.mp4",
        "clip-2.mp4",
        "clip-3.mp4",
        "clip-4.mp4",
        "clip-5.mp4",
        "clip-6.mp4",
        "clip-7.mp4",
        "clip-8.mp4",
        "clip-9.mp4",
        "clip-10.mp4",
        "clip-11.mp4",
      ];

      window.caches
        .open("video")
        .then(cache =>
          Promise.all(
            videoFileUrls.map(videoFileUrl => fetchAndCache(videoFileUrl, cache))
          )
        );

      let showModal1Wrong = false;
      let showModal1Tip = false;
      let tip1 = 1;

      let showModal2Wrong = false;
      let showModal2Tip = false;
      let tip2 = 1;

      let showModal3Wrong = false;
      let showModal3Tip = false;
      let tip3 = 1;

      let showModal4Wrong = false;
      let showModal4Tip = false;
      let tip4 = 1;

      let showModal5Wrong = false;
      let showModal5Tip = false;
      let tip5 = 1;

      let showModal6Wrong = false;
      let showModal6Tip = false;
      let tip6 = 1;

      let showModal7Wrong = false;
      let showModal7Tip = false;
      let tip7 = 1;

      let first = true;
      let startRotationValue = "";
      let second = false;
      let point1Value = "";
      let third = false;
      let point2Value = "";
      let fourth = false;
      let point3Value = "";
      let fift = false;
      let point4Value = "";
      let sixth = false;
      let point5Value = "";
      let seventh = false;
      let point6Value = "";
      let eight = false;
      let ninth = false;
      let tenth = false;
      let eleventh = false;
      let twelfth = false;

      function startRotation() {
        if (
          startRotationValue.toLocaleUpperCase().replace(/\s/g, "") == "M4S1000" ||
          startRotationValue.toLocaleUpperCase().replace(/\s/g, "") == "M04S1000"
        ) {
          $$invalidate('second', second = true);
          $$invalidate('first', first = false);
        } else if (tip1 == 1) {
          $$invalidate('showModal1Wrong', showModal1Wrong = true);
          tip1 = 2;
        } else if (tip1 == 2) {
          $$invalidate('showModal1Wrong', showModal1Wrong = true);
          tip1 = 3;
        } else {
          $$invalidate('showModal1Tip', showModal1Tip = true);
        }
      }

      function point1() {
        if (
          point1Value.toLocaleUpperCase().replace(/\s/g, "") == "G0X40Z5" ||
          point1Value.toLocaleUpperCase().replace(/\s/g, "") == "G00X40Z5"
        ) {
          $$invalidate('second', second = false);
          $$invalidate('third', third = true);
          setTimeout(function() {
            $$invalidate('fourth', fourth = true);
            $$invalidate('third', third = false);
          }, 2000);
        } else if (tip2 == 1) {
          $$invalidate('showModal2Wrong', showModal2Wrong = true);
          tip2 = 2;
        } else if (tip2 == 2) {
          $$invalidate('showModal2Wrong', showModal2Wrong = true);
          tip2 = 3;
        } else {
          $$invalidate('showModal2Tip', showModal2Tip = true);
        }
      }

      function point2() {
        if (
          point2Value.toLocaleUpperCase().replace(/\s/g, "") == "G1X40Z0" ||
          point2Value.toLocaleUpperCase().replace(/\s/g, "") == "G01X40Z0"
        ) {
          $$invalidate('fourth', fourth = false);
          $$invalidate('fift', fift = true);
          setTimeout(function() {
            $$invalidate('sixth', sixth = true);
            $$invalidate('fift', fift = false);
          }, 1500);
        } else if (tip3 == 1) {
          $$invalidate('showModal3Wrong', showModal3Wrong = true);
          tip3 = 2;
        } else if (tip3 == 2) {
          $$invalidate('showModal3Wrong', showModal3Wrong = true);
          tip3 = 3;
        } else {
          $$invalidate('showModal3Tip', showModal3Tip = true);
        }
      }

      function point3() {
        if (
          point3Value.toLocaleUpperCase().replace(/\s/g, "") == "G1X50Z-15" ||
          point3Value.toLocaleUpperCase().replace(/\s/g, "") == "G01X50Z-15"
        ) {
          $$invalidate('sixth', sixth = false);
          $$invalidate('seventh', seventh = true);
          setTimeout(function() {
            $$invalidate('eight', eight = true);
            $$invalidate('seventh', seventh = false);
          }, 2000);
        } else if (tip4 == 1) {
          $$invalidate('showModal4Wrong', showModal4Wrong = true);
          tip4 = 2;
        } else if (tip4 == 2) {
          $$invalidate('showModal4Wrong', showModal4Wrong = true);
          tip4 = 3;
        } else {
          $$invalidate('showModal4Tip', showModal4Tip = true);
        }
      }

      function point4() {
        if (
          point4Value.toLocaleUpperCase().replace(/\s/g, "") == "G1X60Z-50" ||
          point4Value.toLocaleUpperCase().replace(/\s/g, "") == "G01X60Z-50"
        ) {
          $$invalidate('eight', eight = false);
          $$invalidate('ninth', ninth = true);
          setTimeout(function() {
            $$invalidate('tenth', tenth = true);
            $$invalidate('ninth', ninth = false);
          }, 2000);
        } else if (tip5 == 1) {
          $$invalidate('showModal5Wrong', showModal5Wrong = true);
          tip5 = 2;
        } else if (tip5 == 2) {
          $$invalidate('showModal5Wrong', showModal5Wrong = true);
          tip5 = 3;
        } else {
          $$invalidate('showModal5Tip', showModal5Tip = true);
        }
      }

      function point5() {
        if (
          point5Value.toLocaleUpperCase().replace(/\s/g, "") == "G1X80Z-50" ||
          point5Value.toLocaleUpperCase().replace(/\s/g, "") == "G01X80Z-50"
        ) {
          $$invalidate('tenth', tenth = false);
          $$invalidate('eleventh', eleventh = true);
          setTimeout(function() {
            $$invalidate('twelfth', twelfth = true);
            $$invalidate('eleventh', eleventh = false);
          }, 2000);
        } else if (tip6 == 1) {
          $$invalidate('showModal6Wrong', showModal6Wrong = true);
          tip6 = 2;
        } else if (tip6 == 2) {
          $$invalidate('showModal6Wrong', showModal6Wrong = true);
          tip6 = 3;
        } else {
          $$invalidate('showModal6Tip', showModal6Tip = true);
        }
      }

      function end() {
        if (point6Value.toLocaleUpperCase().replace(/\s/g, "") == "M30") {
          $$invalidate('twelfth', twelfth = false);
        } else if (tip7 == 1) {
          $$invalidate('showModal7Wrong', showModal7Wrong = true);
          tip7 = 2;
        } else if (tip7 == 2) {
          $$invalidate('showModal6Wrong', showModal6Wrong = true);
          tip7 = 3;
        } else {
          $$invalidate('showModal7Tip', showModal7Tip = true);
        }
      }

    	function input_input_handler() {
    		startRotationValue = this.value;
    		$$invalidate('startRotationValue', startRotationValue);
    	}

    	const close_handler = () => ($$invalidate('showModal1Wrong', showModal1Wrong = false));

    	const close_handler_1 = () => ($$invalidate('showModal1Tip', showModal1Tip = false));

    	function input_input_handler_1() {
    		point1Value = this.value;
    		$$invalidate('point1Value', point1Value);
    	}

    	const close_handler_2 = () => ($$invalidate('showModal2Wrong', showModal2Wrong = false));

    	const close_handler_3 = () => ($$invalidate('showModal2Tip', showModal2Tip = false));

    	function input_input_handler_2() {
    		point2Value = this.value;
    		$$invalidate('point2Value', point2Value);
    	}

    	const close_handler_4 = () => ($$invalidate('showModal3Wrong', showModal3Wrong = false));

    	const close_handler_5 = () => ($$invalidate('showModal3Tip', showModal3Tip = false));

    	function input_input_handler_3() {
    		point3Value = this.value;
    		$$invalidate('point3Value', point3Value);
    	}

    	const close_handler_6 = () => ($$invalidate('showModal4Wrong', showModal4Wrong = false));

    	const close_handler_7 = () => ($$invalidate('showModal4Tip', showModal4Tip = false));

    	function input_input_handler_4() {
    		point4Value = this.value;
    		$$invalidate('point4Value', point4Value);
    	}

    	const close_handler_8 = () => ($$invalidate('showModal5Wrong', showModal5Wrong = false));

    	const close_handler_9 = () => ($$invalidate('showModal5Tip', showModal5Tip = false));

    	function input_input_handler_5() {
    		point5Value = this.value;
    		$$invalidate('point5Value', point5Value);
    	}

    	const close_handler_10 = () => ($$invalidate('showModal6Wrong', showModal6Wrong = false));

    	const close_handler_11 = () => ($$invalidate('showModal6Tip', showModal6Tip = false));

    	function input_input_handler_6() {
    		point6Value = this.value;
    		$$invalidate('point6Value', point6Value);
    	}

    	const close_handler_12 = () => ($$invalidate('showModal7Wrong', showModal7Wrong = false));

    	const close_handler_13 = () => ($$invalidate('showModal7Tip', showModal7Tip = false));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('showModal1Wrong' in $$props) $$invalidate('showModal1Wrong', showModal1Wrong = $$props.showModal1Wrong);
    		if ('showModal1Tip' in $$props) $$invalidate('showModal1Tip', showModal1Tip = $$props.showModal1Tip);
    		if ('tip1' in $$props) tip1 = $$props.tip1;
    		if ('showModal2Wrong' in $$props) $$invalidate('showModal2Wrong', showModal2Wrong = $$props.showModal2Wrong);
    		if ('showModal2Tip' in $$props) $$invalidate('showModal2Tip', showModal2Tip = $$props.showModal2Tip);
    		if ('tip2' in $$props) tip2 = $$props.tip2;
    		if ('showModal3Wrong' in $$props) $$invalidate('showModal3Wrong', showModal3Wrong = $$props.showModal3Wrong);
    		if ('showModal3Tip' in $$props) $$invalidate('showModal3Tip', showModal3Tip = $$props.showModal3Tip);
    		if ('tip3' in $$props) tip3 = $$props.tip3;
    		if ('showModal4Wrong' in $$props) $$invalidate('showModal4Wrong', showModal4Wrong = $$props.showModal4Wrong);
    		if ('showModal4Tip' in $$props) $$invalidate('showModal4Tip', showModal4Tip = $$props.showModal4Tip);
    		if ('tip4' in $$props) tip4 = $$props.tip4;
    		if ('showModal5Wrong' in $$props) $$invalidate('showModal5Wrong', showModal5Wrong = $$props.showModal5Wrong);
    		if ('showModal5Tip' in $$props) $$invalidate('showModal5Tip', showModal5Tip = $$props.showModal5Tip);
    		if ('tip5' in $$props) tip5 = $$props.tip5;
    		if ('showModal6Wrong' in $$props) $$invalidate('showModal6Wrong', showModal6Wrong = $$props.showModal6Wrong);
    		if ('showModal6Tip' in $$props) $$invalidate('showModal6Tip', showModal6Tip = $$props.showModal6Tip);
    		if ('tip6' in $$props) tip6 = $$props.tip6;
    		if ('showModal7Wrong' in $$props) $$invalidate('showModal7Wrong', showModal7Wrong = $$props.showModal7Wrong);
    		if ('showModal7Tip' in $$props) $$invalidate('showModal7Tip', showModal7Tip = $$props.showModal7Tip);
    		if ('tip7' in $$props) tip7 = $$props.tip7;
    		if ('first' in $$props) $$invalidate('first', first = $$props.first);
    		if ('startRotationValue' in $$props) $$invalidate('startRotationValue', startRotationValue = $$props.startRotationValue);
    		if ('second' in $$props) $$invalidate('second', second = $$props.second);
    		if ('point1Value' in $$props) $$invalidate('point1Value', point1Value = $$props.point1Value);
    		if ('third' in $$props) $$invalidate('third', third = $$props.third);
    		if ('point2Value' in $$props) $$invalidate('point2Value', point2Value = $$props.point2Value);
    		if ('fourth' in $$props) $$invalidate('fourth', fourth = $$props.fourth);
    		if ('point3Value' in $$props) $$invalidate('point3Value', point3Value = $$props.point3Value);
    		if ('fift' in $$props) $$invalidate('fift', fift = $$props.fift);
    		if ('point4Value' in $$props) $$invalidate('point4Value', point4Value = $$props.point4Value);
    		if ('sixth' in $$props) $$invalidate('sixth', sixth = $$props.sixth);
    		if ('point5Value' in $$props) $$invalidate('point5Value', point5Value = $$props.point5Value);
    		if ('seventh' in $$props) $$invalidate('seventh', seventh = $$props.seventh);
    		if ('point6Value' in $$props) $$invalidate('point6Value', point6Value = $$props.point6Value);
    		if ('eight' in $$props) $$invalidate('eight', eight = $$props.eight);
    		if ('ninth' in $$props) $$invalidate('ninth', ninth = $$props.ninth);
    		if ('tenth' in $$props) $$invalidate('tenth', tenth = $$props.tenth);
    		if ('eleventh' in $$props) $$invalidate('eleventh', eleventh = $$props.eleventh);
    		if ('twelfth' in $$props) $$invalidate('twelfth', twelfth = $$props.twelfth);
    	};

    	return {
    		showModal1Wrong,
    		showModal1Tip,
    		showModal2Wrong,
    		showModal2Tip,
    		showModal3Wrong,
    		showModal3Tip,
    		showModal4Wrong,
    		showModal4Tip,
    		showModal5Wrong,
    		showModal5Tip,
    		showModal6Wrong,
    		showModal6Tip,
    		showModal7Wrong,
    		showModal7Tip,
    		first,
    		startRotationValue,
    		second,
    		point1Value,
    		third,
    		point2Value,
    		fourth,
    		point3Value,
    		fift,
    		point4Value,
    		sixth,
    		point5Value,
    		seventh,
    		point6Value,
    		eight,
    		ninth,
    		tenth,
    		eleventh,
    		twelfth,
    		startRotation,
    		point1,
    		point2,
    		point3,
    		point4,
    		point5,
    		end,
    		input_input_handler,
    		close_handler,
    		close_handler_1,
    		input_input_handler_1,
    		close_handler_2,
    		close_handler_3,
    		input_input_handler_2,
    		close_handler_4,
    		close_handler_5,
    		input_input_handler_3,
    		close_handler_6,
    		close_handler_7,
    		input_input_handler_4,
    		close_handler_8,
    		close_handler_9,
    		input_input_handler_5,
    		close_handler_10,
    		close_handler_11,
    		input_input_handler_6,
    		close_handler_12,
    		close_handler_13
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$1.name });
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
