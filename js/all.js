window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function Folded(el, invert, max_flow, max_lines, commence_selector, scroll_rate, lazyload) {
        this.el = el;
        this.flow = el.hasClass('flow');
        this.invert = invert;
        this.max_flow = max_flow;
        this.max_lines = max_lines;
        this.commence_selector = commence_selector;
        this.scroll_rate = scroll_rate || 1;
        this.init(lazyload);
    }
    Folded.prototype = {
        init: function(lazyload) {
            var that = this;
            var children = this.el.children('p');
            var blank = '<p>&nbsp;</p>';
            children.each(function(i) {
                var me = $(this);
                var replacement = $('<div class=\'line\'></div>');
                replacement.append(children.clone());
                var paragraphs = replacement.children();
                var blanks = blank;
                if (that.invert) {
                    for (var j = children.length - 1; j > i; j--) {
                        paragraphs.eq(j).remove();
                        blanks += blank;
                    }
                    replacement.prepend($(blanks));
                } else {
                    for (var j = 0; j < i; j++) {
                        paragraphs.eq(j).remove();
                        blanks += blank;
                    }
                    replacement.append($(blanks));
                }
                me.replaceWith(replacement);
            });
            if (this.max_flow || this.max_lines) {
                var lines = this.el.find('.line');
                if (this.max_flow < 0) {
                    this.max_flow = lines.length + this.max_flow;
                }
                if (this.max_lines < 0) {
                    this.max_lines = lines.length + this.max_lines;
                }
                var that = this;
                if (this.invert) {
                    var remove_under = lines.length - that.max_flow;
                    lines.each(function(i) {
                        if (that.max_lines && i >= that.max_lines) {
                            $(this).remove();
                        } else if (remove_under) {
                            $(this).find('p:lt(' + remove_under + ')').remove();
                        }
                    });
                } else {
                    var remove_above = that.max_flow;
                    lines.each(function(i) {
                        if (that.max_lines && i >= that.max_lines) {
                            $(this).remove();
                        } else if (remove_above) {
                            $(this).find('p:gt(' + remove_above + ')').remove();
                        }
                    });
                }
            }
            this.children = this.el.children('.line');
            if (this.flow && !this.commence_selector) {
                var marker = $('<aside class=\'marker\'></aside>');
                this.el.append(marker)
            }
            this.resize_handler = $.proxy(function(window_width, window_height) {
                var left = this.children.get(0).getBoundingClientRect().left;
                var right = this.children.last().get(0).getBoundingClientRect().right;
                var top = this.children.get(0).getBoundingClientRect().top;
                var bottom = this.children.last().get(0).getBoundingClientRect().bottom;
                var extra_width = right - left - this.el.width();
                var extra_height = bottom - top - this.el.height();
                var padding_left = parseInt(this.el.css('font-size'), 10) * 0.4;
                this.el.css('padding-left', padding_left + 'px');
                this.el.css('padding-right', extra_width - padding_left + 'px');
                this.el.css('padding-top', extra_height / 2.1 + 'px');
                this.el.css('padding-bottom', extra_height / 1.9 + 'px');
                if (this.flow && window_width > NS.phone_max) {
                    this.active = true;
                } else {
                    this.active = false;
                }
            }, this);
            window.utilities.onDebounced('resize.folded', this.resize_handler, true);
            this.scroll_handler = $.proxy(function(scroll_top, scroll_left) {
                if (this.commence_selector) {
                    this.commence_at = $(this.commence_selector).offset().top;
                } else {
                    this.commence_at = this.el.find('.marker').offset().top;
                }
                if (this.active && scroll_top > this.commence_at) {
                    this.children.scrollTop((scroll_top - this.commence_at) * this.scroll_rate);
                } else {
                    this.children.scrollTop(0);
                }
            }, this);
            if (this.flow) {
                window.utilities.onDebounced('scroll.folded', this.scroll_handler, true);
            }
            this.el.addClass('processed');
        },
        dispose: function() {
            if (this.flow) {
                window.utilities.offDebounced('scroll.folded', this.scroll_handler);
            }
            window.utilities.offDebounced('resize.folded', this.resize_handler);
        }
    }
    function Folder(selector, invert) {
        this.selector = selector;
        this.invert = invert;
        this.folded_els = [];
        this.init();
    }
    Folder.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                for (var i = 0; i < this.folded_els.length; i++) {
                    var folded = this.folded_els[i];
                    $.proxy(folded.dispose, folded)();
                }
            }
            if (!els.length) {
                return;
            }
            var that = this;
            var len = els.length;
            els.each(function() {
                var me = $(this);
                that.folded_els.push(new Folded(me,that.invert,me.data('max_flow'),me.data('max_lines'),me.data('commence_selector'),me.data('scroll_rate'),lazyload));
                len--;
                if (len == 0) {
                    $('body').addClass('folded_done');
                }
            });
        }
    }
    NS.Folder = Folder;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function CarouselManager(selector) {
        this.selector = selector;
        this.init();
    }
    CarouselManager.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {}
            if (!els.length) {
                return;
            }
            var that = this;
            els.each(function() {
                var working = false;
                var me = $(this);
                var bullets = me.find('.bullets li');
                bullets.find('a').off('click.bullet').on('click.bullet', function(e) {
                    e.preventDefault();
                    if (!working) {
                        working = true;
                        var items = me.find('.items').children();
                        var current = items.filter('.current');
                        current = items.index(current);
                        var bullet = $(this).closest('li').index();
                        if (current == bullet) {
                            return;
                        }
                        $.proxy(that.go_to, that)(items, current, bullet, bullet > current, function() {
                            working = false;
                        });
                        bullets.eq(bullet).addClass('current');
                        bullets.eq(current).removeClass('current');
                        me.find('.num').text(bullet + 1);
                    }
                });
                me.off('click.prev', '.prev').on('click.prev', '.prev', function(e) {
                    e.preventDefault();
                    if (!working) {
                        working = true;
                        var items = me.find('.items').children();
                        var current = items.filter('.current');
                        current = items.index(current);
                        if (current > 0) {
                            var prev = current - 1;
                        } else {
                            var prev = items.length - 1;
                        }
                        $.proxy(that.back, that)(items, current, prev, function() {
                            working = false;
                        });
                        bullets.eq(prev).addClass('current');
                        bullets.eq(current).removeClass('current');
                        me.find('.num').text(prev + 1);
                    }
                });
                me.off('click.next', '.next').on('click.next', '.next', function(e) {
                    e.preventDefault();
                    if (!working) {
                        working = true;
                        var items = me.find('.items').children();
                        var current = items.filter('.current');
                        current = items.index(current);
                        if (current < items.length - 1) {
                            var next = current + 1;
                        } else {
                            var next = 0;
                        }
                        $.proxy(that.forward, that)(items, current, next, function() {
                            working = false;
                        });
                        bullets.eq(next).addClass('current');
                        bullets.eq(current).removeClass('current');
                        me.find('.num').text(next + 1);
                    }
                });
            });
        },
        forward: function(items, current, target, callback) {
            this.go_to(items, current, target, true, callback)
        },
        back: function(items, current, target, callback) {
            this.go_to(items, current, target, false, callback)
        },
        go_to: function(items, current, target, forward, callback) {
            if (forward) {
                var prefix = 'next_'
            } else {
                var prefix = 'prev_'
            }
            if (Modernizr.csstransitions) {
                items.eq(current).one(window.utilities.transitionend, function() {
                    $(this).removeClass(prefix + 'outwards_end');
                    callback && callback();
                }).from_transition_to('current', prefix + 'outwards_end');
                items.eq(target).addClass(prefix + 'inwards_start').from_transition_to(prefix + 'inwards_start', 'current');
            } else {
                items.eq(current).removeClass('current');
                items.eq(target).addClass('current');
                callback && callback();
            }
        }
    }
    NS.CarouselManager = CarouselManager;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function AnchorManager(selector) {
        this.selector = selector;
        this.init();
    }
    AnchorManager.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {}
            if (!els.length) {
                return;
            }
            this.assign_hover_classes(els);
            this.assign_current_page(els);
        },
        assign_hover_classes: function(els) {
            var that = this;
            els.off('touchstart.hover').on('touchstart.hover', function() {
                $(this).addClass('touched');
            }).off('mouseenter.hover').on('mouseenter.hover', function() {
                var me = $(this);
                if (!me.hasClass('touched') && me.attr('href') != window.location.pathname + window.location.search) {
                    me.parents('nav, ul, ol').find('a, .faux_a').not(me).addClass('related_hovered');
                    me.addClass('hover');
                }
            }).off('mouseleave.hover').on('mouseleave.hover', function() {
                $(this).removeClass('hover').parents('nav, ul, ol').find('a, .faux_a').removeClass('related_hovered');
            });
        },
        assign_current_page: function(els) {
            els.each(function() {
                var me = $(this);
                if (me.attr('href') && me.attr('href').split('#')[0] == window.location.pathname + window.location.search) {
                    me.addClass('current_page');
                } else {
                    me.removeClass('current_page');
                }
            });
        }
    }
    NS.AnchorManager = AnchorManager;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function Tabs(container_selector, tab_selector, toggle_selector) {
        this.container_selector = container_selector;
        this.tab_selector = tab_selector;
        this.toggle_selector = toggle_selector;
        this.init();
    }
    Tabs.prototype = {
        init: function(els, lazyload) {
            if (els && this.container_selector) {
                els = els.find(this.container_selector).addBack(this.container_selector);
            } else if (this.container_selector) {
                els = $(this.container_selector);
            }
            if (!lazyload) {}
            if (!els.length) {
                return;
            }
            this.assign_click_handlers(els);
        },
        assign_click_handlers: function(els) {
            var that = this;
            els.find(this.toggle_selector).each(function() {
                var me = $(this);
                me.off('click.toggle').on('click.toggle', function() {
                    var toggles = me.siblings('.toggle');
                    var tabs = me.closest(that.container_selector).find(that.tab_selector);
                    var tab = tabs.filter(me.data('tab'));
                    tab.toggleClass('open');
                    tabs.not(tab).removeClass('open');
                    me.toggleClass('current_tab');
                    toggles.not(me).removeClass('current_tab');
                    $(window).trigger('resize');
                });
            });
        }
    }
    NS.Tabs = Tabs;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function InfiniteScroller(selector, threshold) {
        this.selector = selector;
        this.threshold = threshold || 4;
        this.init();
    }
    InfiniteScroller.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                window.utilities.offDebounced('scroll.lazyload', this.scroll_handler);
            }
            if (!els.length) {
                return;
            }
            this.nav = els.find('#pagination');
            var win = $(window);
            this.scroll_handler = $.proxy(function(scroll_top, scroll_left) {
                if (this.loading || !this.nav.length)
                    return;
                if (scroll_top > this.nav.offset().top - win.height() * this.threshold) {
                    var next = this.nav.find('.next')
                    if (next.length) {
                        this.loading = true;
                        this.fetch_next(next.attr('href'), els);
                    } else {
                        this.nav.remove();
                    }
                }
            }, this);
            window.utilities.onDebounced('scroll.folded', this.scroll_handler, true);
        },
        fetch_next: function(url, container) {
            var that = this;
            $.ajax({
                url: url,
                global: false
            }).done(function(html) {
                var new_content = that.process_html(html);
                var new_els = new_content.find(that.selector).addBack(that.selector).children();
                new_els.addClass('transparent');
                that.nav.remove();
                container.children().last().after(new_els);
                that.nav = new_els.filter('#pagination');
                for (var i = 0; i < NS.init_methods.length; i++) {
                    NS.init_methods[i](new_els, true);
                }
                new_els.removeClass('transparent');
                that.loading = false;
            });
        },
        process_html: function(html) {
            var body = $('<div' + window.utilities.get_match(html, /<body([^>]*>[\S\s]*)<\/body>/, 1) + '</div>');
            return body.find('#content');
        }
    }
    NS.InfiniteScroller = InfiniteScroller;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function Header(selector) {
        this.selector = selector;
        this.init();
    }
    Header.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                window.utilities.offDebounced('scroll.header');
                window.utilities.offDebounced('resize.header');
            }
            if (!els.length || !Modernizr.csstransforms || $('body').hasClass('p404')) {
                return;
            }
            this.active = false;
            this.header = els;
            this.blurb = els.find('.blurb');
            this.top_nav = els.find('nav.top');
            this.splash = els.find('.splash');
            this.h1 = this.splash.find('h1');
            this.lines = this.h1.find('.line');
            this.line = this.lines.first();
            this.content = $('#content');
            this.content_children = this.content.children();
            this.blurb_fixed = this.blurb.find('.structural');
            this.top_nav_fixed = this.top_nav.find('.structural');
            this.splash_fixed = this.splash.find('.structural');
            this.bg_end = [80, 47, 30];
            window.utilities.onDebounced('resize.header', $.proxy(this.resize_handler, this), true);
            window.utilities.onDebounced('scroll.header', $.proxy(this.scroll_handler, this), true);
        },
        resize_handler: function(window_width, window_height) {
            this.window_height = window_height;
            this.header.css({
                backgroundColor: ''
            });
            this.bg_start = this.get_color_array(this.header.css('background-color'));
            if ((!Modernizr.touchevents && window_width > NS.phone_max) || window_width > NS.tablet_max) {
                this.eligible_device = true;
                var top = 0;
                var height = this.blurb_fixed.outerHeight(true);
                this.blurb.height(height);
                this.blurb_fixed.css({
                    position: 'fixed',
                    top: top
                });
                top += height;
                height = this.top_nav_fixed.outerHeight(true);
                this.top_nav.height(height);
                this.top_nav_fixed.css({
                    position: 'fixed',
                    top: top
                });
                top += height;
                height = this.splash_fixed.outerHeight(true);
                this.splash.height(height);
                this.splash_fixed.css({
                    position: 'fixed',
                    top: top
                });
                this.start = 0;
                var flow_time = this.line[0].scrollHeight / this.line.children().length * (this.line.children().length - 1);
                var flyoff_time = this.blurb_fixed.outerHeight(true) + this.top_nav_fixed.outerHeight(true) + parseInt(this.h1.css('padding-top'), 10) + parseInt(this.h1.css('margin-top'), 10);
                this.pre_flow_scroll_end = flyoff_time - flow_time;
                if (this.pre_flow_scroll_end < 0) {
                    this.pre_scroll_flow_end = this.pre_flow_scroll_end * -1;
                    this.pre_flow_scroll_end = this.pre_scroll_flow_end;
                } else {
                    this.pre_scroll_flow_end = 0;
                }
                this.flow_and_scroll_end = flow_time + this.pre_flow_scroll_end - this.pre_scroll_flow_end;
                this.flyoff_end = this.flow_and_scroll_end + this.h1.outerHeight(true) - parseInt(this.h1.css('padding-top'), 10) - parseInt(this.h1.css('margin-top'), 10);
                this.background_start = 0;
                this.background_end = this.flow_and_scroll_end;
                this.background_mid = (this.background_start + this.background_end) * 3 / 4;
                this.header.css({
                    paddingBottom: this.flyoff_end - (this.blurb.height() + this.top_nav.height() + this.splash.height()),
                    minHeight: this.flyoff_end + window_height
                });
                this.min_scroll = this.flyoff_end;
                if ($('body').has_classes('project index')) {
                    this.min_scroll += $('nav.main').outerHeight(true);
                    this.min_scroll += $('nav.projects').outerHeight(true);
                }
            } else {
                this.eligible_device = false;
                this.blurb.css('height', '');
                this.blurb_fixed.css({
                    position: '',
                    top: '',
                    transform: ''
                });
                this.top_nav.css('height', '');
                this.top_nav_fixed.css({
                    position: '',
                    top: '',
                    transform: ''
                });
                this.splash.css('height', '');
                this.splash_fixed.css({
                    position: '',
                    top: '',
                    transform: ''
                });
                this.blurb.css({
                    backgroundColor: ''
                });
                this.top_nav.css({
                    backgroundColor: ''
                });
                this.splash.css({
                    backgroundColor: '',
                    height: ''
                });
                this.header.css({
                    paddingBottom: '',
                    minHeight: ''
                });
                this.unfix_content();
                this.lines.scrollTop(0);
                if (this.header.is(':visible')) {
                    this.min_scroll = this.header.outerHeight(true);
                } else {
                    this.min_scroll = 0;
                }
                var main_nav = $('nav.main');
                if ($('body').has_classes('project detail')) {
                    if (window_width <= NS.phone_max) {
                        if (main_nav.is(':visible')) {
                            this.min_scroll += main_nav.outerHeight(true);
                        }
                        this.min_scroll += $('nav.projects').outerHeight(true);
                    }
                } else {
                    if (main_nav.is(':visible')) {
                        this.min_scroll += main_nav.outerHeight(true);
                    }
                }
                if ($('body').has_classes('project index') && window_width > NS.phone_max) {
                    this.min_scroll += $('nav.projects').outerHeight(true);
                }
            }
            var body = $('body');
            if (!body.hasClass('header_done')) {
                if (!body.hasClass('home') && $(window).scrollTop() < this.min_scroll) {
                    $(window).scrollTop(this.min_scroll);
                }
                body.addClass('header_done');
            }
        },
        scroll_handler: function(scroll_top, scroll_left) {
            if (this.eligible_device) {
                if (scroll_top < this.start) {
                    this.blurb_fixed.css({
                        transform: ''
                    });
                    this.top_nav_fixed.css({
                        transform: ''
                    });
                    this.splash_fixed.css({
                        transform: ''
                    });
                    this.fix_content();
                    this.lines.scrollTop(0);
                    this.header.css('min-height', this.flyoff_end + this.window_height);
                } else if (scroll_top >= this.start && scroll_top < this.pre_scroll_flow_end) {
                    this.blurb_fixed.css({
                        transform: ''
                    });
                    this.top_nav_fixed.css({
                        transform: ''
                    });
                    this.splash_fixed.css({
                        transform: ''
                    });
                    this.fix_content();
                    var percent = (scroll_top - this.start) / (this.flow_and_scroll_end - this.start);
                    this.lines.scrollTop((this.flow_and_scroll_end - this.start) * percent);
                    this.header.css('min-height', this.flyoff_end + this.window_height);
                } else if (scroll_top >= this.pre_scroll_flow_end && scroll_top < this.pre_flow_scroll_end) {
                    var translate = this.pre_scroll_flow_end - scroll_top;
                    this.blurb_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.top_nav_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.splash_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.fix_content();
                    this.lines.scrollTop(0);
                    this.header.css('min-height', this.flyoff_end + this.window_height);
                } else if (scroll_top >= this.pre_scroll_flow_end && scroll_top < this.flow_and_scroll_end) {
                    var translate = this.pre_scroll_flow_end - scroll_top;
                    this.blurb_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.top_nav_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.splash_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.fix_content();
                    if (this.pre_scroll_flow_end > 0) {
                        var percent = (scroll_top - this.start) / (this.flow_and_scroll_end - this.start);
                        this.lines.scrollTop((this.flow_and_scroll_end - this.start) * percent);
                    } else {
                        var percent = (scroll_top - this.pre_flow_scroll_end) / (this.flow_and_scroll_end - this.pre_flow_scroll_end);
                        this.lines.scrollTop((this.flow_and_scroll_end - this.pre_flow_scroll_end) * percent);
                    }
                    this.header.css('min-height', this.flyoff_end + this.window_height);
                } else if (scroll_top >= this.flow_and_scroll_end && scroll_top < this.flyoff_end) {
                    var translate = this.pre_scroll_flow_end - scroll_top;
                    this.blurb_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.top_nav_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.splash_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.fix_content();
                    this.header.css('min-height', this.flyoff_end + this.window_height);
                    if (this.pre_scroll_flow_end > 0) {
                        this.lines.scrollTop(this.flow_and_scroll_end - this.start);
                    } else {
                        this.lines.scrollTop(this.flow_and_scroll_end - this.pre_flow_scroll_end);
                    }
                } else {
                    var translate = this.pre_scroll_flow_end - this.flyoff_end;
                    this.blurb_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.top_nav_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.splash_fixed.css({
                        transform: 'translateY(' + translate + 'px)'
                    });
                    this.header.css({
                        minHeight: ''
                    });
                    this.unfix_content();
                    if (this.pre_scroll_flow_end > 0) {
                        this.lines.scrollTop(this.flow_and_scroll_end - this.start);
                    } else {
                        this.lines.scrollTop(this.flow_and_scroll_end - this.pre_flow_scroll_end);
                    }
                }
                if (scroll_top < this.background_start) {
                    var color = this.get_color_string(this.bg_start);
                    this.header.css({
                        backgroundColor: color,
                        pointerEvents: 'auto'
                    });
                } else if (scroll_top >= this.background_start && scroll_top < this.background_mid) {
                    var percent = (scroll_top - this.background_start) / (this.background_mid - this.background_start);
                    var bg_r = this.bg_start[0] + ((this.bg_end[0] - this.bg_start[0]) * percent);
                    var bg_g = this.bg_start[1] + ((this.bg_end[1] - this.bg_start[1]) * percent);
                    var bg_b = this.bg_start[2] + ((this.bg_end[2] - this.bg_start[2]) * percent);
                    var color = this.get_color_string([bg_r, bg_g, bg_b]);
                    this.header.css({
                        backgroundColor: color,
                        pointerEvents: 'auto'
                    });
                } else if (scroll_top >= this.background_mid && scroll_top < this.background_end) {
                    var percent = (scroll_top - this.background_mid) / (this.background_end - this.background_mid);
                    var alpha = 1 + (0 - 1) * percent;
                    var color = this.get_color_string([this.bg_end[0], this.bg_end[1], this.bg_end[2], alpha]);
                    this.header.css({
                        backgroundColor: color,
                        pointerEvents: 'none'
                    });
                } else {
                    var color = this.get_color_string([this.bg_end[0], this.bg_end[1], this.bg_end[2], 0]);
                    this.header.css({
                        backgroundColor: color,
                        pointerEvents: 'none'
                    });
                }
            }
        },
        get_color_array: function(color) {
            var result;
            var colors = {
                aqua: [0, 255, 255],
                azure: [240, 255, 255],
                beige: [245, 245, 220],
                black: [0, 0, 0],
                blue: [0, 0, 255],
                brown: [165, 42, 42],
                cyan: [0, 255, 255],
                darkblue: [0, 0, 139],
                darkcyan: [0, 139, 139],
                darkgrey: [169, 169, 169],
                darkgreen: [0, 100, 0],
                darkkhaki: [189, 183, 107],
                darkmagenta: [139, 0, 139],
                darkolivegreen: [85, 107, 47],
                darkorange: [255, 140, 0],
                darkorchid: [153, 50, 204],
                darkred: [139, 0, 0],
                darksalmon: [233, 150, 122],
                darkviolet: [148, 0, 211],
                fuchsia: [255, 0, 255],
                gold: [255, 215, 0],
                green: [0, 128, 0],
                indigo: [75, 0, 130],
                khaki: [240, 230, 140],
                lightblue: [173, 216, 230],
                lightcyan: [224, 255, 255],
                lightgreen: [144, 238, 144],
                lightgrey: [211, 211, 211],
                lightpink: [255, 182, 193],
                lightyellow: [255, 255, 224],
                lime: [0, 255, 0],
                magenta: [255, 0, 255],
                maroon: [128, 0, 0],
                navy: [0, 0, 128],
                olive: [128, 128, 0],
                orange: [255, 165, 0],
                pink: [255, 192, 203],
                purple: [128, 0, 128],
                violet: [128, 0, 128],
                red: [255, 0, 0],
                silver: [192, 192, 192],
                white: [255, 255, 255],
                yellow: [255, 255, 0],
                transparent: [255, 255, 255]
            };
            if (color && color.constructor === Array && color.length === 3)
                return color;
            if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color))
                return [parseInt(result[1], 10), parseInt(result[2], 10), parseInt(result[3], 10)];
            if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color))
                return [parseFloat(result[1]) * 2.55, parseFloat(result[2]) * 2.55, parseFloat(result[3]) * 2.55];
            if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color))
                return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
            if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color))
                return [parseInt(result[1] + result[1], 16), parseInt(result[2] + result[2], 16), parseInt(result[3] + result[3], 16)];
            if (result = /rgba\(0, 0, 0, 0\)/.exec(color))
                return colors["transparent"];
            return colors[$.trim(color).toLowerCase()];
        },
        get_color_string: function(color) {
            if (color.length == 3) {
                return 'rgb(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ')';
            } else {
                return 'rgba(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ',' + color[3] + ')';
            }
        },
        fix_content: function() {
            var height;
            var total_height = 0;
            this.content_children.each(function() {
                var me = $(this);
                if (me.css('display') != 'none') {
                    height = me.outerHeight(true);
                    me.css({
                        position: 'fixed',
                        top: total_height,
                    });
                    total_height += height;
                }
            });
            this.content.height(total_height);
        },
        unfix_content: function() {
            this.content.css('height', '');
            this.content_children.css({
                position: '',
                top: '',
                transform: ''
            });
        }
    }
    NS.Header = Header;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function Footer(selector) {
        this.selector = selector;
        this.init();
    }
    Footer.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                window.utilities.offDebounced('scroll.footer');
                window.utilities.offDebounced('resize.footer');
            }
            if (!els.length || !Modernizr.csstransforms) {
                return;
            }
            this.footer = els;
            this.translate_els = els.find('.structural');
            window.utilities.onDebounced('resize.footer', $.proxy(this.resize_handler, this), true);
            window.utilities.onDebounced('scroll.footer', $.proxy(this.scroll_handler, this), true);
        },
        resize_handler: function(window_width, window_height) {
            this.window_height = window_height;
            if (window_width > NS.tablet_max || !Modernizr.touchevents && window_width > NS.phone_max) {
                this.active = true;
            } else {
                this.active = false;
            }
        },
        scroll_handler: function(scroll_top, scroll_left) {
            this.start_at = this.footer.offset().top - this.window_height;
            this.end_at = this.start_at + this.translate_els.outerHeight(true);
            if (this.active) {
                if (scroll_top < this.start_at) {
                    this.translate_els.css({
                        transform: 'translateY(' + (this.end_at - this.start_at) + 'px)'
                    });
                } else if (scroll_top >= this.start_at && scroll_top < this.end_at) {
                    this.translate_els.css({
                        transform: 'translateY(' + ((this.end_at - this.start_at) - (scroll_top - this.start_at)) + 'px)'
                    });
                } else {
                    this.translate_els.css({
                        transform: ''
                    });
                }
            } else {
                this.translate_els.css({
                    transform: ''
                });
            }
        },
    }
    NS.Footer = Footer;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function WorkIndex(selector) {
        this.selector = selector;
        this.init();
    }
    WorkIndex.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                window.utilities.offDebounced('scroll.design_index');
                window.utilities.offDebounced('resize.design_index');
            }
            if (!els.length || !Modernizr.csstransforms) {
                return;
            }
            this.articles = els.find('.articles');
            this.header = $('header#main_header');
            this.translate_els = els.find('.structural');
            window.utilities.onDebounced('resize.design_index', $.proxy(this.resize_handler, this), true);
            window.utilities.onDebounced('scroll.design_index', $.proxy(this.scroll_handler, this), true);
        },
        resize_handler: function(window_width, window_height) {
            this.window_width = window_width;
            if (window_width > NS.tablet_portrait) {
                this.active = true;
            } else {
                this.active = false;
            }
        },
        scroll_handler: function(scroll_top, scroll_left) {
            this.start_at = this.header.offset().top + this.header.outerHeight(true);
            if (this.active) {
                this.end_at = this.start_at + parseInt(this.articles.css('paddingTop'), 10) * 2;
                if (scroll_top < this.start_at) {
                    this.translate_els.css({
                        transform: 'translateY(' + (this.end_at - this.start_at) + 'px)'
                    });
                } else if (scroll_top >= this.start_at && scroll_top < this.end_at) {
                    this.translate_els.css({
                        transform: 'translateY(' + ((this.end_at - this.start_at) - (scroll_top - this.start_at)) + 'px)'
                    });
                } else {
                    this.translate_els.css({
                        transform: ''
                    });
                }
            } else {
                this.translate_els.css({
                    transform: ''
                });
            }
        }
    }
    NS.WorkIndex = WorkIndex;
    function WorkDetail(selector) {
        this.selector = selector;
        this.init();
    }
    WorkDetail.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                window.utilities.offDebounced('scroll.design_detail');
                window.utilities.offDebounced('resize.design_detail');
            }
            if (!els.length || !Modernizr.csstransforms) {
                return;
            }
            this.els = els;
            this.nav = $('nav.main');
            this.hero = els.find('.hero');
            this.h1 = els.find('h1');
            window.utilities.onDebounced('resize.design_detail', $.proxy(this.resize_handler, this), true);
            window.utilities.onDebounced('scroll.design_detail', $.proxy(this.scroll_handler, this), true);
        },
        resize_handler: function(window_width, window_height) {
            this.window_width = window_width;
            this.translate_els = this.els.find('.transform_wrapper').add(this.nav.find('.structural'));
            if (window_width > NS.tablet_max || !Modernizr.touchevents && window_width > NS.phone_max) {
                this.active = true;
            }
        },
        scroll_handler: function(scroll_top, scroll_left) {
            if (this.window_width > NS.phone_max) {
                this.start_at = $('#content').offset().top;
            } else {
                this.start_at = $('#project').offset().top;
            }
            if (this.active && scroll_top >= this.start_at) {
                this.end_at = this.hero.offset().top - (45 / this.window_width * 1440);
                this.mid = (this.start_at + this.end_at) / 2;
                this.pace = (this.nav.height() + this.h1.height()) / (this.end_at - this.start_at);
                if (scroll_top < this.end_at) {
                    this.translate_els.css({
                        transform: 'translateY(' + (scroll_top - this.start_at) * this.pace * -1 + 'px)'
                    });
                } else {
                    this.translate_els.css({
                        transform: 'translateY(' + (this.end_at - this.start_at) * this.pace * -1 + 'px)'
                    });
                }
                if (scroll_top < this.mid) {
                    this.hero.removeClass('color');
                } else {
                    this.hero.addClass('color');
                }
            } else {
                this.hero.removeClass('color');
                this.translate_els.css({
                    transform: ''
                });
            }
        }
    }
    NS.WorkDetail = WorkDetail;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function ProjectNav(toggle_selector) {
        this.toggle_selector = toggle_selector;
        this.init();
    }
    ProjectNav.prototype = {
        init: function(els, lazyload) {
            if (els && this.toggle_selector) {
                els = els.find(this.toggle_selector).addBack(this.toggle_selector);
            } else if (this.toggle_selector) {
                els = $(this.toggle_selector);
            }
            if (!lazyload) {}
            if (!els.length) {
                return;
            }
            this.nav = els.closest('nav.projects');
            var that = this;
            els.off('click.toggle_project_nav').on('click.toggle_project_nav', function() {
                that.nav.toggleClass('open');
                $(window).resize();
            });
        }
    }
    NS.ProjectNav = ProjectNav;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    function Perspective(selector) {
        this.selector = selector;
        this.init();
    }
    Perspective.prototype = {
        init: function(els, lazyload) {
            if (els && this.selector) {
                els = els.find(this.selector).addBack(this.selector);
            } else if (this.selector) {
                els = $(this.selector);
            }
            if (!lazyload) {
                window.utilities.offDebounced('scroll.perspective');
                window.utilities.offDebounced('resize.perspective');
            }
            if (!els.length || !Modernizr.csstransforms) {
                return;
            }
            this.nav = $('nav.main');
            this.introduction = els.find('.introduction');
            this.summary = this.introduction.find('.summary');
            this.translate_els = this.summary.add(this.nav.find('.structural'));
            els.find('video').each(function() {
                this.onplay = function() {
                    $(this).css('display', 'block');
                }
                ;
            });
            els.find('video').each(function() {
                this.onended = function() {
                    this.currentTime = 1;
                    this.play();
                }
                ;
            });
            window.utilities.onDebounced('resize.perspective', $.proxy(this.resize_handler, this), true);
            window.utilities.onDebounced('scroll.perspective', $.proxy(this.scroll_handler, this), true);
        },
        resize_handler: function(window_width, window_height) {
            if (window_width > NS.tablet_max || !Modernizr.touchevents && window_width > NS.phone_max) {
                this.active = true;
            } else {
                this.active = false;
            }
        },
        scroll_handler: function(scroll_top, scroll_left) {
            this.start_at = $('#content').offset().top;
            if (this.active && scroll_top >= this.start_at) {
                this.end_at = this.start_at + this.nav.outerHeight(true) + parseInt(this.introduction.css('padding-top'), 10);
                this.pace = 0.5;
                if (scroll_top < this.end_at) {
                    this.translate_els.css({
                        transform: 'translateY(' + (scroll_top - this.start_at) * this.pace * -1 + 'px)'
                    });
                } else {
                    this.translate_els.css({
                        transform: 'translateY(' + (this.end_at - this.start_at) * this.pace * -1 + 'px)'
                    });
                }
            } else {
                this.translate_els.css({
                    transform: ''
                });
            }
        }
    }
    NS.Perspective = Perspective;
})(window.delenda);
window.delenda = window.delenda || {};
(function(NS) {
    'use strict';
    $(function() {
        NS.tablet_max = 1024;
        NS.phone_max = 667;
        $.get("http://fast.fonts.net/t/1.css?apiType=css&projectid=b7be8685-a08d-4483-ae61-b50c199fc0b7");
        NS.init_methods = []
        var flyout_folder = new NS.Folder('.folded:not(.invert)',false);
        NS.init_methods.push($.proxy(flyout_folder.init, flyout_folder));
        var flyin_folder = new NS.Folder('.folded.invert',true);
        NS.init_methods.push($.proxy(flyin_folder.init, flyin_folder));
        var header = new NS.Header('#main_header');
        NS.init_methods.push($.proxy(header.init, header));
        var anchor_manager = new NS.AnchorManager('a, .faux_a');
        NS.init_methods.push($.proxy(anchor_manager.init, anchor_manager));
        var carousel_manager = new NS.CarouselManager('.carousel');
        NS.init_methods.push($.proxy(carousel_manager.init, carousel_manager));
        var tabs = new NS.Tabs('.tabs','.tab','.toggle');
        NS.init_methods.push($.proxy(tabs.init, tabs));
        var project_infinite_scroll = new NS.InfiniteScroller('#project.index .articles');
        NS.init_methods.push($.proxy(project_infinite_scroll.init, project_infinite_scroll));
        var footer = new NS.Footer('footer');
        NS.init_methods.push($.proxy(footer.init, footer));
        var work_index = new NS.WorkIndex('#project.index');
        NS.init_methods.push($.proxy(work_index.init, work_index));
        var work_detail = new NS.WorkDetail('#project.detail');
        NS.init_methods.push($.proxy(work_detail.init, work_detail));
        var perspective = new NS.Perspective('#perspective');
        NS.init_methods.push($.proxy(perspective.init, perspective));
        var phone_project_nav = new NS.ProjectNav('nav.projects .controls button');
        NS.init_methods.push($.proxy(phone_project_nav.init, phone_project_nav));
    });
})(window.delenda);
