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
  function clearClean(event) {
    event.stopPropagation();
    var $this = $(this),
        timers = $this.data('fp-timers') || [];
    while (timers.length > 0) {
      clearTimeout(timers.pop());
    }
    $this.data({
      'fp-timers': []
    });
  }
  function prepareClean(event) {
    event.stopPropagation();
    // Bind the clean event trigger to $(this) and pass it to the setTimeout.
    // The bind is neccessary so that trigger is called the on the correct
    // pulldown element, rendering this to the correct context.
    var $this = $(this),
        func = $.proxy($.fn.trigger, $(this), 'clean'),
        timeout = setTimeout(func, event.data.delay),
        timers = $this.data('fp-timers') || [];
    timers.push(timeout);
    $this.data({
      'fp-timers': timers
    });
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
  function checkOutOfBounds(dimensions, tolerance) {
    tolerance = (tolerance) ? tolerance : 0;
    return {
      left: (dimensions.left >= tolerance),
      top: (dimensions.top >= tolerance),
      right: (dimensions.right >= tolerance),
      bottom: (dimensions.bottom >= tolerance)
    };
  }
  /**
   * Return a vector for a move based on the edge and the distance outside the edge.
   */
  function getVector(edge, outside, collision) {
    var tolerance = (collision.tolerance) ? collision.tolerance : 0,
        buffer = (collision.buffer) ? collision.buffer : 0;
    
    var vectors = {
      horizontal: null,
      vertical: null
    };
    // Moves are made from the top/left origin. So the direction is up or left.
    switch (edge) {
    case 'left' :
      vectors.horizontal = (Math.abs(outside) + buffer);
      break;
    case 'right' :
      vectors.horizontal = (outside - buffer);
      break;
    case 'top' :
      vectors.vertical = (Math.abs(outside) + buffer);
      break;
    case 'bottom' :
      vectors.vertical = (outside - buffer);
      break;
    default :
      break;
    }
    return vectors;
  }
  /**
   * param vectors {object}
   */
  function move(vectors) {
    var $this = $(this),
        offset = $this.offset(),
        coords = {};
    if (vectors.horizontal) {
      coords.left = (offset.left + vectors.horizontal);
    }
    if (vectors.vertical) {
      coords.top = (offset.top + vectors.vertical);
    }
    // Move the item.
    $this.offset(coords);
  }
  function reposition(event) {
    var $this = $(this),
    offset = $this.offset(),
    width = $this.outerWidth(false),
    height = $this.outerHeight(false),
    client = {
      left: document.documentElement.clientLeft,
      top: document.documentElement.clientTop,
      height: document.documentElement.clientHeight,
      width: document.documentElement.clientWidth
    },
    props = {
      height: height,
      width: width,
      // These dimensions are calculated as distance from the respective
      // edge of the viewport, not as distance from the left/top origin.
      // This allows us to know if an item is out of bounds if the
      // distance is negative.
      left: (client.left + offset.left),
      top: (client.top + offset.top),
      right: (client.width - (offset.left + width)),
      bottom: (client.height - (offset.top + height))
    };
    // Check if the item falls within the bounds of the viewport within the
    // configured tolerance.
    props.bounds = checkOutOfBounds(props, event.data.edge.tolerance);
    // Move the item if it is out of bounds
    var edge = '';
    for (edge in props.bounds) {
      if (props.bounds.hasOwnProperty(edge)) {
        if (!props.bounds[edge]) {
          if (props[edge] < 0) {
            move.call(this, getVector(edge, props[edge], event.data.edge));
          }
        }
      }
    }
  }
  function setItemData(event) {
    var $this = $(this),
    offset = $this.offset(),
    height = $this.outerHeight(false),
    width = $this.outerWidth(false),
    client = {
      height: document.documentElement.clientHeight,
      width: document.documentElement.clientWidth
    };
    $this.data('fp-dimensions', {
      width: width,
      height: height,
      left: offset.left,
      top: offset.top,
      right: (client.width - (offset.left + width)),
      bottom: (client.height - (offset.top + height))
    });
    $this.trigger('updated');
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
        data = $this.data(),
        $list = listMaker(data).addClass('fp-data');
    return ($list.children().length > 0) ? $list : $();
  }
  // private function for debugging
  function getDebugger($element) {
    var $debugger = $element.children('.fp-debug').detach();
    // Make a new debugger or detach the existing one.
    return (!$debugger.length > 0) ? $('<div>').addClass('fp-debug') : $debugger;
  }
  function setWindowInfo() {
    var $debugger = getDebugger($('body')),
    data = {
      height: document.documentElement.clientHeight,
      width: document.documentElement.clientWidth
    };
    var content = $.proxy(listMaker, this, data);
    
    $debugger
    .html(content())
    .css({
      bottom: 60,
      position: 'absolute',
      right: 20
    })
    .appendTo('body');
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
        // implementations
        var data = $root.data(o.dataIndex);
        // If the plugin hasn't been initialized yet
        if (!data) {
          /* Set up the data. */
          $root.data(o.dataIndex, {
            timers: [],
            debug: o.debug
          }); 
        }
        var $ul = $root.find('ul');
        var $li = $root.find('li');
        // Basic setup
        $root
        .bind('reset.flexiPanda', clearClean)
        .bind('clean.flexiPanda', doClean)
        .bind('debug.flexiPanda', (opts.debug) ? debug : false)
        .addClass('fp-root')
        .trigger('debug');
        
        $ul
        .bind('refresh.flexiPanda', setItemData)
        .bind('updated.flexiPanda', {edge: opts.edge}, reposition)
        .bind('debug.flexiPanda', (opts.debug) ? debug : false)
        .addClass('fp-list')
        .trigger('refresh')
        .trigger('debug');
        
        $li
        .bind('reset.flexiPanda', clearClean)
        .bind('refresh.flexiPanda', {edge: opts.edge}, setItemData)
        .bind('activated.flexiPanda', {delay: o.delays.items}, prepareClean)
        .bind('pathSelected.flexiPanda', establishPath)
        .bind('clean.flexiPanda', doClean)
        /*.bind('debug.flexiPanda', (opts.debug) ? debug : false)*/
        .addClass('fp-item')
        .trigger('refresh')
        .trigger('debug');
        
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
          .bind('mouseenter.flexiPanda.hoverMode', clearClean)
          .bind('mouseleave.flexiPanda.hoverMode', {delay: o.delays.menu}, prepareClean);
        
          $li
          .bind('mouseenter.flexiPanda.hoverMode', itemHover);
          break;
        }
        
        // Create window bindings
        $(window)
        .bind('resize.flexiPanda', setWindowInfo)
        .trigger('resize');
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
      $.error('Method ' +  method + ' does not exist on jQuery.flexiPanda');
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
      tolerance: 10,
      buffer: 10
    }
  };
}
// Pass jQuery as the param to the preceding anonymous function
(jQuery));