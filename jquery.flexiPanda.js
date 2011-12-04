/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true devel: false */
 
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
 *
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
    .addClass('fp-trail fp-hovered');
  }
  function itemClick(event) {
    event.preventDefault();
    event.stopPropagation();
    $(this)
    .trigger('pathSelected')
    .addClass('fp-trail fp-clicked');
  }
  function setItemData() {
    var $this = $(this);
    $this.data('fp-dimensions', {
      width: $this.width(),
      height: $this.height(),
      left: $this.css('left'),
      right: $this.css('right')
    });
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
  function debug(event) {
    event.stopPropagation();
    var $this = $(this);
    
    $this.trigger('refresh');
    
    var $debugger = $this.children('.fp-debug').detach(),
        items = $.proxy(renderItemData, this)();
    // Make a new debugger or detach the existing one.
    $debugger = (!$debugger.length > 0) ? $('<div>').addClass('fp-debug') : $debugger;
    
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
        .bind('debug', (opts.debug) ? debug : false)
        .addClass('fp-root')
        .trigger('debug');
        
        $ul
        .bind('debug', (opts.debug) ? debug : false)
        .addClass('fp-list');
        
        $li
        .bind('reset.flexiPanda', clearClean)
        .bind('refresh.flexiPanda', setItemData)
        .bind('activated.flexiPanda', {delay: o.delays.items}, prepareClean)
        .bind('pathSelected.flexiPanda', establishPath)
        .bind('clean.flexiPanda', doClean)
        .bind('debug', (opts.debug) ? debug : false)
        .addClass('fp-item')
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
        
        // Create event bindings
        $(window).bind('resize.flexiPanda', methods.refresh);
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
    dataIndex: 'flexiPanda'
  };
}
// Pass jQuery as the param to the preceding anonymous function
(jQuery));