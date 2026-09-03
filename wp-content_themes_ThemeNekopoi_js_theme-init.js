/**
 * Theme initialization scripts.
 * All custom - no 3rd party dependencies (only jQuery from WordPress).
 */
(function($) {

  // ── Custom Ticker (replaces easyTicker) ──
  // Scrolls list items vertically, one at a time
  $(function() {
    $('.nk-ticker').each(function() {
      var $container = $(this);
      var $list = $container.children(':first-child');
      var timer = null;
      var interval = 3200;
      var speed = 400;

      if (!$list.children().length) return;

      $container.css({ position: 'relative', overflow: 'hidden' });
      $list.css({ position: 'absolute', top: 0, left: 0, right: 0, margin: 0 });
      $list.children().css('margin', 0);

      // Set container height to first item
      var firstH = $list.children(':first').outerHeight();
      $container.css('height', firstH);

      function tick() {
        var $first = $list.children(':first');
        var h = $first.outerHeight();
        $list.animate({ top: -h }, speed, function() {
          $first.appendTo($list);
          $list.css('top', 0);
          // Adjust height for next visible item
          var newH = $list.children(':first').outerHeight();
          $container.css('height', newH);
        });
      }

      function start() {
        if (!timer) timer = setInterval(tick, interval);
      }

      function stop() {
        clearInterval(timer);
        timer = null;
      }

      start();

      $container.on('mouseenter', stop).on('mouseleave', start);
    });
  });

  // ── Custom Tooltip (replaces tipsy) ──
  // Shows HTML tooltip from original-title attribute on hover
  $(function() {
    var $popup = $('<div id="nk-tooltip-popup"></div>').appendTo('body').hide();
    var hideTimer = null;

    function showTooltip($el) {
      clearTimeout(hideTimer);
      var html = $el.attr('original-title');
      if (!html) return;

      $popup.html(html).css({ top: -9999, left: -9999 }).show();

      // Calculate position
      var offset = $el.offset();
      var elH = $el.outerHeight();
      var scrollLeft = $(window).scrollLeft();
      var scrollTop = $(window).scrollTop();
      var viewW = document.documentElement.clientWidth;
      var viewH = $(window).height();

      // Constrain popup width to viewport
      var maxW = viewW - 20;
      $popup.css('max-width', maxW);

      var popW = $popup.outerWidth();
      var popH = $popup.outerHeight();

      var top = offset.top + elH + 8;
      var left = offset.left;

      // If tooltip goes below viewport, show above
      if (top + popH > scrollTop + viewH) {
        top = offset.top - popH - 8;
        $popup.addClass('nk-tooltip-above');
      } else {
        $popup.removeClass('nk-tooltip-above');
      }

      // Keep within horizontal bounds
      if (left + popW > scrollLeft + viewW) {
        left = scrollLeft + viewW - popW - 10;
      }
      if (left < scrollLeft) {
        left = scrollLeft + 10;
      }

      $popup.css({ top: top, left: left }).stop(true).fadeTo(150, 1);
    }

    function scheduleHide() {
      hideTimer = setTimeout(function() {
        $popup.stop(true).fadeOut(100);
      }, 150);
    }

    $(document).on('mouseenter', '.nk-tooltip', function() {
      showTooltip($(this));
    }).on('mouseleave', '.nk-tooltip', function() {
      scheduleHide();
    });

    // Allow hovering over the tooltip itself
    $popup.on('mouseenter', function() {
      clearTimeout(hideTimer);
    }).on('mouseleave', function() {
      scheduleHide();
    });
  });

  // ── Tab switching (streaming player tabs) ──
  $(document).ready(function() {
    $('div#nk-player-tabs').each(function() {
      var $active, $content, $links = $(this).find('a');
      var targetHash = location.hash;
      $active = $links.filter(function() { return this.hash === targetHash; }).first();
      if (!$active.length) $active = $links.first();
      $active.addClass('active');
      $content = $(document.getElementById($active[0].hash.substring(1)));
      $links.not($active).each(function() {
        $(document.getElementById(this.hash.substring(1))).hide();
      });
      $(this).on('click', 'a', function(e) {
        $active.removeClass('active');
        $content.hide();
        $active = $(this);
        $content = $(document.getElementById(this.hash.substring(1)));
        $active.addClass('active');
        $content.show();
        e.preventDefault();
      });
    });
  });

  // ── Lights toggle (cinema mode overlay) ──
  $(document).ready(function() {
    $("#nk-overlay").css("height", $(document).height()).hide();
    $(".nk-lights-toggle").on("click", function() {
      $("#nk-overlay").toggle();
      var $btn = $(this);
      var $nav = $("#nk-main-nav, #nk-mobile-nav");
      if ($("#nk-overlay").is(":hidden")) {
        $btn.find("span").text("Matikan Lampu");
        $btn.removeClass("nk-lights-off");
        $nav.css("z-index", "");
      } else {
        $btn.find("span").text("Nyalakan Lampu");
        $btn.addClass("nk-lights-off");
        $nav.css("z-index", 10000);
      }
    });

    // ── Fullscreen toggle ──
    $(".nk-fullscreen-toggle").on("click", function() {
      var wrapper = document.getElementById("nk-player");
      if (!wrapper) return;
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(function() {});
      } else {
        document.exitFullscreen();
      }
    });
  });

  // ── "More" overflow menu ──
  // Measures which nav items fit; moves the rest into a "More ▾" dropdown
  $(function() {
    var $nav = $('#nk-main-nav');
    if (!$nav.length) return;

    var $container = $nav.find('.nk-container');
    var $ul = $container.children('ul').first();
    if (!$ul.length) return;

    var $actions = $container.find('.nk-nav-actions');
    var scrollState = 'top';
    var logoSpace = 110; // px reserved when logo is visible

    // Create the "More" <li> with dropdown
    var $more = $('<li class="menu-item nk-nav-more nk-nav-more--hidden">' +
      '<a>Lainnya <span class="dashicons dashicons-arrow-down-alt2"></span></a>' +
      '<ul></ul></li>');
    $ul.append($more);
    var $moreUl = $more.children('ul');

    // Store original items (excluding the "More" item itself)
    var $items = $ul.children('li').not($more);
    // Cache natural widths
    var itemWidths = [];
    $items.each(function() {
      itemWidths.push($(this).outerWidth(true));
    });
    var moreWidth = 0; // measured after first show

    function getMoreWidth() {
      if (moreWidth > 0) return moreWidth;
      // Temporarily show to measure
      $more.removeClass('nk-nav-more--hidden');
      moreWidth = $more.outerWidth(true) || 100;
      $more.addClass('nk-nav-more--hidden');
      return moreWidth;
    }

    function reflow() {
      // Return all items to the main <ul> first
      $moreUl.children('li').each(function() {
        $more.before($(this));
      });

      // Recollect items
      $items = $ul.children('li').not($more);

      var containerW = $container.width();
      var actionsW = $actions.outerWidth(true) || 0;
      var logoW = (scrollState === 'scrolled') ? logoSpace : 0;
      var budget = containerW - actionsW - logoW - 4; // 4px safety

      var usedW = 0;
      var breakIdx = -1;
      var mw = getMoreWidth();

      $items.each(function(i) {
        var w = $(this).outerWidth(true);
        var remaining = budget - usedW;

        // If this is not the last item, we need room for "More" too
        if (i < $items.length - 1) {
          if (usedW + w + mw > budget) {
            breakIdx = i;
            return false; // break
          }
        } else {
          // Last item: just needs to fit
          if (usedW + w > budget) {
            breakIdx = i;
            return false;
          }
        }
        usedW += w;
      });

      if (breakIdx >= 0) {
        // Move overflowing items into "More"
        $items.each(function(i) {
          if (i >= breakIdx) {
            $moreUl.append($(this));
          }
        });
        $more.removeClass('nk-nav-more--hidden');
      } else {
        $more.addClass('nk-nav-more--hidden');
      }
    }

    // ── Scroll logo animation (integrated with reflow) ──
    $(window).on('scroll', function() {
      var scrolled = $(document).scrollTop() > 70;
      if (scrolled && scrollState === 'top') {
        scrollState = 'scrolled';
        reflow(); // Move items to "More" BEFORE animation starts
        $ul.stop().animate({ paddingLeft: logoSpace + 'px' }, 500);
        $('.nk-nav-logo-scroll').fadeIn(400);
      } else if (!scrolled && scrollState === 'scrolled') {
        scrollState = 'top';
        $('.nk-nav-logo-scroll').fadeOut(300);
        $ul.stop().animate({ paddingLeft: '0px' }, 500, reflow); // Restore items after animation
      }
    });

    // Reflow on resize (debounced)
    var resizeTimer;
    $(window).on('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reflow, 150);
    });

    // Initial reflow
    reflow();
  });

  // ── Dark/Light mode toggle ──
  $(document).ready(function() {
    var savedTheme = localStorage.getItem('nk-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    $(document).on('click', '.nk-theme-switch', function() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = (current === 'dark') ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('nk-theme', next);
    });
  });

})(jQuery);
