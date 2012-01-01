/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */
 
/*global jQuery: true debug: true window: true */

/**
 * FlexiPanda - a jQuery plugin.
 *
 * Create simple, elegant dropdwn menus.
 *
 * Author: Jesse Beach
 * Author URI: http://qemist.us
 * Author Twitter: @jessebeach
 * Author Github: https://github.com/jessebeach
 */

(function ($) {		
	// Private function definitions
	function clearDelay(event) {
		event.stopPropagation();
		var $this = $(this);
		var timers = $this.data().flexiPanda.timers;
		while (timers.length > 0) {
			clearTimeout(timers.pop());
		}
	}
	function setDelay(event) {
		event.stopPropagation();
		// Bind the function designated in event.data.toTrigger
		// to $(this) and pass it to the setTimeout.
		// The bind is necessary so that trigger is called on the correct
		// pulldown element, rendering 'this' to the correct context.
		var $this = $(this);
		if (event.data.toTrigger) {
			var func = $.proxy($.fn.trigger, $this, event.data.toTrigger),
			timeout = setTimeout(func, event.data.delay),
			timers = $this.data().flexiPanda.timers;
			timers.push(timeout);
		}
		$this.trigger('debug');
	}
	function doClean(event) {
		event.stopPropagation();
		var $this = $(this);
		$this
		.find('.fp-hovered').andSelf()
		.removeClass('fp-trail fp-hovered fp-clicked')
		.trigger('reset')
		.trigger('debug');
	}
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
	function itemClick(event) {
		event.preventDefault();
		event.stopPropagation();
		$(this)
		.trigger('pathSelected')
		.addClass('fp-trail fp-clicked')
		.closest('ul')
		.trigger('debug');
	}
	
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
	 * 
	 */
	function checkBounds(dimensions, tolerance) {
		return {
			left: (dimensions.left === undefined) ? undefined : (dimensions.left >= 0),
			top: (dimensions.top === undefined) ? undefined : (dimensions.top >= 0),
			right: (dimensions.right === undefined) ? undefined : (dimensions.right >= 0),
			bottom: (dimensions.bottom === undefined) ? undefined : (dimensions.bottom >= 0)
		};
	}
	/**
	 * @todo This needs to be updated for RTL language support.
	 *
	 * param vectors {object}
	 */
	function move(vectors) {
		var $this = $(this),
		offset = $this.offset(),
		coords = {};
		if (vectors['right']) {
			coords.left = (offset.left + vectors['right']);
		}
		if (vectors['top']) {
			coords.top = (offset.top + vectors['top']);
		}
		// Move the item.
		$this.offset(coords);
	}
	function reposition(event) {
		event.stopPropagation();
		var $this = $(this),
		data = $this.trigger('refresh').data().flexiPanda,
		dimensions = data.dimensions,
		// Check if the item falls within the bounds of the viewport within the
		// configured tolerance.
		bounds = checkBounds(dimensions.item, event.data.edge.tolerance),		
		// idealBounds is the placement of the item if the viewport had no limits.
		idealBounds = checkBounds(dimensions.ideal, event.data.edge.tolerance),
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
		// Move the item. move() will deal with conflicting vectors
		if (!$.isEmptyObject(vectors)) {
			move.call(this, vectors);
		}
		// Trigger refresh on the child lists. Parent lists have to be repositioned
		// before child lists.
		$this.find('.fp-level-' + (data.level + 1)).trigger('rebounded');
	}
	function setItemData(event) {
		event.stopPropagation();
		var $this = $(this),
		data = $this.data().flexiPanda,
		$parentItem = $this.flexiPanda('parentItem'),
		$parentList = $this.flexiPanda('parentList'),
		offset = NaN,
		client = {
			left: document.documentElement.clientLeft,
			top: document.documentElement.clientTop,
			height: document.documentElement.clientHeight,
			width: document.documentElement.clientWidth
		};
		data.dimensions = {}
		// Get the dimensions of the parent list
		if ($parentList.length > 0) {
			offset = $parentList.offset(),
			width = $parentList.width(),
			height = $parentList.height();
			data.dimensions.parentList = {
				width: width,
				height: height,
				left: offset.left,
				right: client.width - (offset.left + width)
			};
		}
 		// Get the dimensions of the parent item
		if ($parentItem.length > 0) {
			offset = $parentItem.offset(),
			width = $parentItem.width(),
			height = $parentItem.height();
			data.dimensions.parentItem = {
				width: width,
				height: height,
				top: offset.top,
				bottom: client.height - (offset.top + height)
			};
		}
		offset = $this.offset(),
		height = $this.outerHeight(false),
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
			data.dimensions.ideal.left = data.dimensions.parentList.left + data.dimensions.parentList.width;
			data.dimensions.ideal.right = (client.width > (data.dimensions.parentList.left + data.dimensions.parentList.width + 10)) ? (client.width - (data.dimensions.ideal.left + data.dimensions.item.width)) : 0;
			if (client.width < (data.dimensions.parentList.left + data.dimensions.parentList.width + 10))
				var hello = data.dimensions.ideal.right;
		}
	}
	function listMaker(data) {
		var $list = $('<div>');
		for (var datum in data) {
			if (data.hasOwnProperty(datum)) {
				var $item = $('<div>');
				$item.append($('<span>', {
					text: datum + ': '
				}));
				 // If this is an object, recurse the function
				if (typeof(data[datum]) === 'object') {
					$item.append(listMaker(data[datum]));
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
	var methods = {
		init : function (options) {
			// build main options before element iteration
			var opts = $.extend({}, $.fn.flexiPanda.defaults, options);
			// iterate over matched elements
			return this.each(function () {
				var $root = $(this);
				// Build element specific options. Uses the Metadata plugin if available
				// @see http://docs.jquery.com/Plugins/Metadata/metadata
				var o = $.meta ? $.extend({}, opts, $root.data()) : opts;
				
				// Get lists and items.
				var $ul = $root.find('ul');
				var $li = $root.find('li');
				// Basic setup
				$root
				.addClass('fp-root fp-list')
				.each(function (index, element) {
					$(this).data('flexiPanda', {
						timers: [],
						debug: o.debug,
						processed: 0,
						type: 'root',
						level: 0
					});
				})
				.bind('reset.flexiPanda', clearDelay)
				.bind('clean.flexiPanda', doClean)
				.bind('refresh.flexiPanda', setItemData)
				.bind('rebounded.flexiPanda', {edge: opts.edge}, reposition)
				.bind('debug.flexiPanda', (opts.debug) ? debug : false)
				.trigger('refresh');
				
				$ul
				.addClass('fp-list')
				.each(function (index, element) {
					$(this).data('flexiPanda', {
						timers: [],
						processed: 0,
						type: 'list',
						level: NaN
					});
				})
				.bind('refresh.flexiPanda', setItemData)
				.bind('rebounded.flexiPanda', {edge: opts.edge}, reposition)
				.bind('debug.flexiPanda', (opts.debug) ? debug : false);
				
				$li
				.addClass('fp-item')
				.each(function (index, element) {
					$(this).data('flexiPanda', {
						timers: [],
						processed: 0,
						type: 'item'
					});
				})
				.bind('reset.flexiPanda', clearDelay)
				.bind('refresh.flexiPanda', {edge: opts.edge}, setItemData)
				.bind('activated.flexiPanda', {delay: o.delays.items, toTrigger: 'clean'}, setDelay)
				.bind('pathSelected.flexiPanda', establishPath)
				.bind('clean.flexiPanda', doClean)
				/*.bind('debug.flexiPanda', (opts.debug) ? debug : false)*/
				.trigger('refresh');
				
				// Indicate the level of each menu.
				markListLevels($root, 0);
				
				// Trigger the rebounded event on the root element to move sub menus
				// that might be positioned outside the viewport.
				$root
				.trigger('rebounded');
				
				if (opts.debug) {
					$root.trigger('debug');
					$ul.trigger('debug');
					$li.trigger('debug');
				}
				
				
				// Set up the behavior mode
				switch (o.mode) {
				case 'click' :
				// Click mode$li
					$li
					.bind('click.flexiPanda.clickMode', itemClick);
					break;
				case 'hover' :
					// Hover mode
					$root
					.bind('mouseleave.flexiPanda.hoverMode', {delay: o.delays.menu, toTrigger: 'clean'}, setDelay);
				
					$li
					.bind('mouseenter.flexiPanda.hoverMode', itemHover);
					break;
				}
				// Set html. This may be unnecessary.
				$('html')
				.css({
					height: '100%',
					position: 'relative'
				});
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

	// Instantiation.
	$.fn.flexiPanda = function (method) {
		// Method calling logic
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || ! method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' +	method + ' does not exist on jQuery.flexiPanda');
		}
	};
		
	// plugin defaults
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
			tolerance: 10
		}
	};
}
// Pass jQuery as the param to the preceding anonymous function
(jQuery));