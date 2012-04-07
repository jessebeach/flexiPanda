/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */
 
/*global jQuery: true debug: true window: true */

/**
 * FlexiPanda - a jQuery plugin.
 *
 * Create simple, elegant dropdown menus.
 *
 * Author: Jesse Beach
 * Author URI: http://qemist.us
 * Author Twitter: @jessebeach
 * Author Github: https://github.com/jessebeach
 */

(function (window, undefined) {
	if (window.jQuery === undefined) {
		return null;
	}
	// Replace 'pluginName' with the name of your plugin.
	var plugin = 'pluginName',
	// A private reference to this $plugin object.
	$plugin,
	// Local copy of jQuery.
	$ = window.jQuery,
	// Local copies of context globals.
	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,
	navigator = window.navigator,
	location = window.location,
	// Local copy of jQuery.
	$ = window.jQuery,
	// Private variables
	html = document.documentElement,
	textDirection = (html.dir) ? html.dir : 'ltr';

	// Private function definitions
	/**
	 * Clear all the timers on an element.
	 */
	function clearDelay(event) {
		var $this = $(this);
		var timers = $this.data().flexiPanda.timers;
		while (timers.length > 0) {
			clearTimeout(timers.pop());
		}
	}
	/**
	 * Create a delay to call a function on an element.
	 */
	function setDelay(context, fn, options, $timerBin) {
		// Bind the function designated in event.data.toTrigger
		// to $(this) and pass it to the setTimeout.
		// The bind is necessary so that trigger is called on the correct
		// pulldown element, rendering 'this' to the correct context.
		var func = $.proxy(fn, context, (options.toTrigger) ? options.toTrigger : ''),
		timeout = setTimeout(func, options.delay),
		timers = $timerBin.data().flexiPanda.timers;
		timers.push(timeout);
		context.trigger('debug');
	}
	function buildDelay (event) {
		setDelay($(event.target), $.fn.trigger, {delay: event.data.delay, toTrigger: event.data.toTrigger}, $(event.delegateTarget));
	}
	/**
	 * Clean the interaction classes from the element and its children.
	 */
	function doClean(event) {
		event.stopPropagation();
		var $this = $(this);
		$this
		.find('.fp-hovered').andSelf()
		.removeClass('fp-trail fp-hovered fp-clicked')
		.trigger('reset')
		.trigger('debug');
	}
	/**
	 * Set interaction classes on the hovered element and it's ancestors.
	 */
	function establishPath(event) {
		event.stopPropagation();
		$(this)
		.trigger('reset')
		.siblings('li')
		.trigger('activated')
		.end()
		.parentsUntil('.fp-root')
		.filter('li')
		.siblings('li')
		.trigger('activated');
	}
	/**
	 * Handles the hover event of li elements.
	 */
	function itemHover(event) {
		event.stopPropagation();
		$(this)
		.closest('.fp-root')
		.trigger('reset')
		.end()
		.closest('ul')
		.trigger('rebounded')
		.end()
		.trigger('pathSelected')
		.addClass('fp-trail fp-hovered')
		.closest('ul')
		.trigger('debug');
	}
	/**
	 * Hangles the click event of li elements.
	 */
	function itemClick(event) {
		event.preventDefault();
		event.stopPropagation();
		$(this)
		.trigger('pathSelected')
		.addClass('fp-trail fp-clicked')
		.closest('ul')
		.trigger('debug');
	}
	/**
	 * Adds an fp-level class to each list based on its depth in the menu.
	 */
	function markListLevels($elements, level) {
		$elements
		.addClass('fp-level-' + level)
		.each(function (index, element) {
			$(this).data().flexiPanda.level = level;
		});
		var $lists = $elements.children('li').children('ul');
		if ($lists.length > 0) {
			markListLevels($lists, (level + 1));
		}
	}
	/**
	 * Determines if the dimenions are outside the bounds of the viewport.
	 */
	function checkBounds(dimensions) {
		return {
			left: (dimensions.left === undefined) ? undefined : (dimensions.left >= 0),
			top: (dimensions.top === undefined) ? undefined : (dimensions.top >= 0),
			right: (dimensions.right === undefined) ? undefined : (dimensions.right >= 0),
			bottom: (dimensions.bottom === undefined) ? undefined : (dimensions.bottom >= 0)
		};
	}
	/**
	 *
	 */
	function checkDataFreshness(data) {
		// If the item hasn't been processed, just return.
		if (data.processed === false || data.processed === undefined) {
			return null;
		}
		data.dimensions = data.dimensions || {};
		// If the item knows nothing about the client yet,
		// then the data is stale.
		if (data.dimensions.client === undefined) {
			data.processed = false;
			return null;
		}
		// Get the current client dimensions.
		var client = {
			left: document.documentElement.clientLeft,
			top: document.documentElement.clientTop,
			height: document.documentElement.clientHeight,
			width: document.documentElement.clientWidth
		}, 
		edge = '';
		for (edge in client) {
			if (client.hasOwnProperty(edge)) {
				if (client[edge] !== data.dimensions.client[edge]) {
					data.processed = false;
					return null;
				}
			}
		}
	}
	/**
	 * Moves elements around the page based on a vector object.
	 *
	 * param vectors {object}
	 */
	function move(vectors) {
		var $this = $(this),
		elem = $this.get(0),
		offset = $this.offset(),
		coords = {};
		if (vectors.right && textDirection === 'ltr') {
			coords.left = (offset.left + vectors.right);
		}
		if (vectors.left && textDirection === 'rtl') {
			coords.left = (offset.left - vectors.left);
		}
		if (vectors.bottom) {
			coords.top = (offset.top + vectors.bottom);
		}
		if (vectors.top) {
			coords.top = (offset.top - vectors.top);
		}
		// Move the item.
		$this.offset(coords);
	}
	/**
	 * Shifts the item lists with margins.
	 */
	function shiftPosition(data, options) {
		var $this = $(this),
		vectors = {top: {dir: 'top', sign: ''}, bottom: {dir: 'top', sign: '-'}},
		vector = '',
		tolerance = options.tolerance,
		buffer = options.buffer,
		delta = 0,
		occlusionFix = {},
		fixes = 0;
		// LRT and RTL languages are dealt with separately.
		if (textDirection === 'rtl') {
			vectors.left = {dir: 'left', sign: ''};
		}
		else {
			vectors.right = {dir: 'left', sign: '-'};
		}
		var dimensions = data.dimensions.item,
		parentListDimensions = data.dimensions.parentList;
		for (vector in vectors) {
			if (vectors.hasOwnProperty(vector)) {
				var index = 'margin-' + vectors[vector].dir;
				// If the list is closer to the viewport than tolerance, shift it with margins
				// to the tolerance value.
				if (dimensions[vector] < tolerance) {
					delta = tolerance - dimensions[vector];
					var obj = {};
					obj[index] = vectors[vector].sign + delta + 'px';
					$this.css(obj);
				}
				// If the list occludes its parent lists, shift it with margins.
				if (parentListDimensions) {
					var diff = Math.abs((dimensions[vector] + delta) - parentListDimensions[vector]);
					if (diff < tolerance) {
						delta = buffer - diff;
						occlusionFix[index] = vectors[vector].sign + buffer + 'px';
						fixes += 1;
						if (fixes > 1) {
							$this.css(occlusionFix);
						}
					}
				}
			}
		}
	}
	/**
	 * Responds to the rebounded event.
	 */
	function reposition(event) {
		event.stopPropagation();
		var $this = $(this);
		// Remove any margins from position shifting.
		$this.css({margin: 0});    
		var data = $this.trigger('refresh').data().flexiPanda,
		dimensions = data.dimensions,
		// Check if the item falls within the bounds of the viewport within the
		// configured tolerance.
		bounds = checkBounds(dimensions.item),    
		// idealBounds is the placement of the item if the viewport had no limits.
		idealBounds = checkBounds(dimensions.ideal),
		edge = '',
		vectors = {};
		// Move the item if it is out of bounds
		for (edge in bounds) {
			if (bounds.hasOwnProperty(edge)) {
				// If the idealBound is true and the ideal bound is closer to the client
				// edge than the current item edge, move it the difference of the distance
				// between the two positions.
				if (idealBounds[edge] === true && (dimensions.ideal[edge] > 0) && (dimensions.ideal[edge] < dimensions.item[edge])) {
					vectors[edge] = dimensions.item[edge] - dimensions.ideal[edge];
				}
				// If the idealBound is false and the current item edge is farther from the
				// client edge than the tolerance, reposition it.
				if (idealBounds[edge] === false && (dimensions.item[edge] > 0)) {
					vectors[edge] = dimensions.item[edge];
				}
				// If the item is outside the edge of the screen, reposition it.
				if (bounds[edge] === false) {
					vectors[edge] = dimensions.item[edge];
				}
				idealBounds[edge] = bounds[edge] = true;
			}
		}
		// Move the item. 
		// move() will deal with conflicting vectors
		if (!$.isEmptyObject(vectors)) {
			move.call(this, vectors);
			data = $this.trigger({type: 'refresh', cache: false}).data().flexiPanda;
		}
		// Shift the lists by adjusting margins to correct lists against the edge 
		// of the screen and lists occluding other lists.
		shiftPosition.call(this, data, event.data.edge);
		
		// Trigger refresh on the child lists. Parent lists have to be repositioned
		// before child lists.
		$this.find('.fp-level-' + (data.level + 1)).trigger('rebounded');
	}
	/**
	 * Saves the dimensions of each item in its data() object.
	 */
	function setItemData(event) {
		event.stopPropagation();
		var $this = $(this),
		cache = (event.cache !== undefined) ? event.cache : true,
		data = $this.data().flexiPanda;
		checkDataFreshness.call(this, data);
		// Only process the item's data if cache is false (meaning the
		// cache is intentionally busted) or if the item has not been
		// processed yet. This function gets called a lot and it 
		// interacts heavily with the DOM, so it should be run without cause.
		if (!cache || !data.processed) {
			var $parentItem = $this.flexiPanda('parentItem'),
			$parentList = $this.flexiPanda('parentList'),
			offset = NaN,
			width = NaN,
			height = NaN,
			client = {
				left: document.documentElement.clientLeft,
				top: document.documentElement.clientTop,
				height: document.documentElement.clientHeight,
				width: document.documentElement.clientWidth
			};
			data.parentItem = $parentItem;
			data.parentList = $parentList;
			data.dimensions = {};
			data.dimensions.client = client;
			// Get the dimensions of the parent list
			if ($parentList.length > 0) {
				offset = $parentList.offset();
				width = $parentList.width();
				height = $parentList.height();
				data.dimensions.parentList = {
					width: width,
					height: height,
					left: offset.left,
					right: client.width - (offset.left + width),
					top: offset.top,
					bottom: client.height - (offset.top + height)
				};
			}
			 // Get the dimensions of the parent item
			if ($parentItem.length > 0) {
				offset = $parentItem.offset();
				width = $parentItem.width();
				height = $parentItem.height();
				data.dimensions.parentItem = {
					width: width,
					height: height,
					top: offset.top,
					bottom: client.height - (offset.top + height)
				};
			}
			offset = $this.offset();
			height = $this.outerHeight(false);
			width = $this.outerWidth(false);
			// These dimensions are calculated as distance from the respective
			// edge of the viewport, not as distance from the left/top origin.
			// This allows us to know if an item is out of bounds if the
			// distance is negative.
			data.dimensions.item = {
				width: width,
				height: height,
				left: offset.left,
				top: offset.top,
				right: (client.width - (offset.left + width)),
				bottom: (client.height - (offset.top + height))
			};
			// The placement of the element if the viewport had no limits.
			data.dimensions.ideal = {};
			if (data.dimensions.parentItem) {
				data.dimensions.ideal.top = data.dimensions.parentItem.top;
				data.dimensions.ideal.bottom = client.height - (data.dimensions.ideal.top + data.dimensions.item.height);
			}
			if (data.dimensions.parentList) {
				/* LTR text */
				if (textDirection === 'ltr' || textDirection === 'undefined') {
					data.dimensions.ideal.left = data.dimensions.parentList.left + data.dimensions.parentList.width;
					data.dimensions.ideal.right = client.width - (data.dimensions.ideal.left + data.dimensions.item.width);
				}
				/* RTL text */
				if (textDirection === 'rtl') {
					data.dimensions.ideal.left = data.dimensions.parentList.left - data.dimensions.parentList.width;
					data.dimensions.ideal.right = client.width - (data.dimensions.ideal.left - data.dimensions.item.width);
				}
			}
			// Mark this item as processed.
			data.processed = true;
		}
	}
	/**
	 * Returns a <ul> list from a javascript object.
	 */
	function listMaker(data) {
		var $list = $('<div>');
		for (var datum in data) {
			if (data.hasOwnProperty(datum)) {
				var $item = $('<div>');
				$item.append($('<span>', {
					text: datum + ': '
				}));
				 // Deal with objects.
				if (typeof(data[datum]) === 'object') {
					// jQuery objects are large and will stall the browse
					// if we try to print them. Just state that this is
					// a jQuery object.
					if (data[datum].jquery) {
						$item.append($('<b>', {
							text: '[jQuery] jQuery object'
						}));
					}
					// Otherwise recurse the function.
					else {
						$item.append(listMaker(data[datum]));
					}
				}
				else {
					$item.append($('<b>', {
						text: '[' + typeof(data[datum]) + '] ' + data[datum]
					}));
				}
				$item.appendTo($list);
			}
		}
		return ($list.children().length > 0) ? $list : $('<span>', {
			text: 'null'
		});
	}
	/**
	 * Returns a renderable list of item data for debugging.
	 */
	function renderItemData() {
		var $this = $(this),
		data = $this.data().flexiPanda,
		$list = listMaker(data).addClass('fp-data');
		return ($list.children().length > 0) ? $list : $();
	}
	// private function for debugging
	function getDebugger($element) {
		var $debugger = $element.children('.fp-debug').detach();
		// Make a new debugger or detach the existing one.
		return (!$debugger.length > 0) ? $('<div>').addClass('fp-debug') : $debugger;
	}
	/**
	 * Appends a debugger to elements listening to debug events.
	 */
	function debug(event) {
		event.stopPropagation();
		var $this = $(this);
		
		var $debugger = getDebugger($this),
				items = $.proxy(renderItemData, this)();
		
		if (items.length > 0) {
			$debugger
			.html(items)
			.css({
				left: 50,
				position: 'absolute'
			})
			.appendTo($this);
		}
	}
	/**
	 * Public methods of the flexiPanda plugin.
	 */
	var methods = {
		init : function (options) {
			// Add the dir attribute to the HTML element if it does not exist.
			// This is part of RTL language support.
			if ($('html').attr('dir') === undefined) {
				$('html').attr('dir', textDirection);
			}
			// Build main options before element iteration.
			options = $.extend({}, $.fn.flexiPanda.defaults, options);
			// Iterate over matched elements.
			return this.each(function () {
			  // Wrap the list in a div to provide an anchor.
				var $root = $(this).wrap($('<div>')			  
  				.css({
  					height: '100%',
  					position: 'relative'
  				})
  				.addClass('fp-root fp-list')
				).parent();				
				// Get lists and items.
				var $ul = $root.find('ul');
				var $li = $root.find('li');
				// Basic setup
				$ul
				.addClass('fp-list')
				.each(function (index, element) {
					$(this).data('flexiPanda', {
						timers: [],
						processed: false,
						type: 'list',
						level: NaN
					});
				});
				
				$li
				.addClass('fp-item')
				.each(function (index, element) {
					$(this).data('flexiPanda', {
						timers: [],
						processed: false,
						type: 'item'
					});
				});
				
				$root
				.each(function (index, element) {
					$(this).data('flexiPanda', {
						timers: [],
						processed: false,
						type: 'root',
						level: 0
					});
				});
				// Indicate the level of each menu.
				markListLevels($root.children('ul'), 0);
				// Bind event handlers.
				$root
				.on('reset.flexiPanda', 'li', clearDelay)
				.on('clean.flexiPanda', 'li', doClean)
				.on('refresh.flexiPanda', 'ul, li', setItemData)
				.on('rebounded.flexiPanda', 'ul', {edge: options.edge}, reposition)
				.on('debug.flexiPanda', 'ul, li', (options.debug) ? debug : false)
				.on('activated.flexiPanda', 'li', {delay: options.delays.items, toTrigger: 'clean'}, buildDelay)
				.on('pathSelected.flexiPanda', 'li', establishPath)
				// Establish item data.
				.trigger('refresh')
				// Move sub menus that might be positioned outside the viewport.
				.trigger('rebounded')
				// Trigger debugging.
				.trigger('debug', {enable: options.debug});
				
				// Set up the behavior mode
				switch (options.mode) {
				case 'click' :
				// Click mode$li
					$li
					.bind('click.flexiPanda.clickMode', itemClick);
					break;
				case 'hover' :
					// Hover mode
					$root
					.on('mouseleave.flexiPanda.hoverMode', {delay: options.delays.menu, toTrigger: 'clean'}, buildDelay)
					.on('mouseenter.flexiPanda.hoverMode', 'li', itemHover);
					break;
				}
			});
		},
		destroy : function () {
			return this.each(function () {
				$(window).unbind('.flexiPanda');
			});
		},
		// Custom traversal functions
		parentItem : function () {
			var data = this.data().flexiPanda,
			parent = $();
			if (data.type === 'item') {
				parent = this.closest('.fp-list').closest('.fp-item');
			}
			if (data.type === 'list') {
				parent = this.closest('.fp-item');
			}
			return this.pushStack(parent.get());
		},
		parentList : function () {
			var data = this.data().flexiPanda,
			parent = $();
			if (data.type === 'item') {
				parent = this.closest('.fp-list').closest('.fp-item').closest('.fp-list');
			}
			if (data.type === 'list') {
				parent = this.closest('.fp-item').closest('.fp-list');
			}
			return this.pushStack(parent.get());
		}
	};

	// Add the plugin to the jQuery fn object.
	$.fn.flexiPanda = function (method) {
		// Method calling logic
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || ! method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' +  method + ' does not exist on jQuery.flexiPanda');
		}
	};
		
	// FlexiPanda plugin defaults.
	$.fn.flexiPanda.defaults = {
		dev: false,
		delays: {
			menu: 1000,
			items: 200
		},
		mode: 'hover',
		debug: false,
		dataIndex: 'flexiPanda',
		edge: {
			tolerance: 10,
			buffer: 14
		}
	};
}(window));