/**
 * Press Studio — user panel helpers
 * - Sidebar drawer on phones ([data-acc-drawer-open] / [data-acc-drawer-close])
 * - "Show all" toggle for long lists ([data-acc-more])
 * - Template search + filter chips ([data-tpl-search], [data-tpl-filter])
 * - Greeting + date on the dashboard ([data-acc-greeting], [data-acc-date])
 */
(function () {
    'use strict';

    var body = document.body;
    var mobileQuery = window.matchMedia('(max-width: 991.98px)');

    /* ---------- Drawer ---------- */
    function openDrawer() {
        body.classList.add('acc-drawer-open');
    }

    function closeDrawer() {
        body.classList.remove('acc-drawer-open');
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-acc-drawer-open]')) {
            e.preventDefault();
            openDrawer();
            return;
        }
        if (e.target.closest('[data-acc-drawer-close]') || e.target.classList.contains('acc-backdrop')) {
            closeDrawer();
            return;
        }
        // Following a menu link closes the drawer
        if (body.classList.contains('acc-drawer-open') && e.target.closest('.acc-sidebar a[href]')) {
            closeDrawer();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeDrawer();
    });

    var onBreakpoint = function () {
        if (!mobileQuery.matches) closeDrawer();
    };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onBreakpoint);
    else if (mobileQuery.addListener) mobileQuery.addListener(onBreakpoint);

    /* ---------- "Show all" toggle ---------- */
    document.querySelectorAll('[data-acc-more]').forEach(function (btn) {
        var target = document.getElementById(btn.getAttribute('data-acc-more'));
        if (!target) return;
        var moreLabel = btn.textContent;
        btn.addEventListener('click', function () {
            var expanded = target.classList.toggle('is-expanded');
            target.querySelectorAll('[data-acc-extra]').forEach(function (el) {
                el.classList.toggle('is-hidden', !expanded);
            });
            btn.textContent = expanded ? (btn.getAttribute('data-less') || 'কম দেখুন') : moreLabel;
        });
    });

    /* ---------- Template search + filters ---------- */
    var grid = document.querySelector('[data-tpl-grid]');
    if (grid) {
        var search = document.querySelector('[data-tpl-search]');
        var chips = document.querySelectorAll('[data-tpl-filter]');
        var emptyState = document.querySelector('[data-tpl-empty]');
        var activeFilter = 'all';

        var apply = function () {
            var q = search ? search.value.trim().toLowerCase() : '';
            var visible = 0;
            grid.querySelectorAll('[data-tpl]').forEach(function (card) {
                var okFilter = activeFilter === 'all' ||
                    (activeFilter === 'allowed' && card.getAttribute('data-allowed') === '1') ||
                    (activeFilter === 'fav' && card.querySelector('.toggle-fav-btn.is-fav'));
                var okSearch = !q || (card.getAttribute('data-title') || '').indexOf(q) !== -1;
                var show = okFilter && okSearch;
                card.classList.toggle('is-hidden', !show);
                if (show) visible++;
            });
            if (emptyState) emptyState.hidden = visible > 0;
        };

        if (search) search.addEventListener('input', apply);
        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                chips.forEach(function (c) { c.classList.remove('active'); });
                chip.classList.add('active');
                activeFilter = chip.getAttribute('data-tpl-filter');
                apply();
            });
        });
        // Re-filter after a heart is toggled while the "favourites" chip is active
        grid.addEventListener('click', function (e) {
            if (e.target.closest('.toggle-fav-btn') && activeFilter === 'fav') {
                setTimeout(apply, 600);
            }
        });
    }

    /* ---------- Greeting ---------- */
    var greet = document.querySelector('[data-acc-greeting]');
    if (greet) {
        var h = new Date().getHours();
        greet.textContent = h < 5 ? 'শুভ রাত্রি' : h < 12 ? 'শুভ সকাল' : h < 16 ? 'শুভ দুপুর' : h < 18 ? 'শুভ বিকাল' : h < 20 ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি';
    }
    var dateEl = document.querySelector('[data-acc-date]');
    if (dateEl) {
        try {
            dateEl.textContent = new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { /* old browsers: leave empty */ }
    }
})();
