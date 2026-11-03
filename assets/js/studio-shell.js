/**
 * Studio Shell — shared responsive layout logic for studio-*.php
 *
 * - Fits the design (first child of .ss-canvas-scaler) into the stage with
 *   CSS transform: scale, without changing its real size.
 * - Builds the mobile icon bottom nav from the existing .pc-tab-link tabs and
 *   drives the bottom sheet (same tab again = close, other tab = open).
 * - Wraps captureAndDownload() and html2canvas() so export always renders at
 *   the real size: scale is removed while rendering, then the canvas is refitted.
 *
 * Public API: window.StudioShell.getScale() / fit() / openSheet() / closeSheet()
 */
(function () {
    'use strict';

    var mobileQuery = window.matchMedia('(max-width: 991.98px)');
    var app, stage, frame, scaler, panel, content, downloadBtn;
    var scale = 1;
    var fitQueued = false;

    // Export state
    var exporting = false;
    var captureRunning = false;
    var pendingRenders = 0;
    var exportTimer = null;

    function canvasEl() {
        return scaler ? scaler.firstElementChild : null;
    }

    /* ---------- Canvas fit ---------- */

    function fit() {
        fitQueued = false;
        var el = canvasEl();
        if (!el || exporting) return;

        // offsetWidth/Height are layout sizes, unaffected by the transform
        var w = el.offsetWidth;
        var h = el.offsetHeight;
        if (!w || !h) return;

        var cs = window.getComputedStyle(stage);
        var availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        if (availW <= 0 || availH <= 0) return;

        var maxScale = parseFloat(stage.getAttribute('data-max-scale')) || (mobileQuery.matches ? 2 : 1.6);
        var s = Math.min(availW / w, availH / h, maxScale);
        s = Math.max(s, 0.05);

        scale = s;
        scaler.style.transform = 'scale(' + s + ')';
        frame.style.width = (w * s) + 'px';
        frame.style.height = (h * s) + 'px';
    }

    function queueFit() {
        if (fitQueued) return;
        fitQueued = true;
        window.requestAnimationFrame(fit);
    }

    function observeSizes() {
        if ('ResizeObserver' in window) {
            var ro = new ResizeObserver(queueFit);
            ro.observe(stage);
            if (canvasEl()) ro.observe(canvasEl());
        }
        window.addEventListener('resize', queueFit);
        window.addEventListener('orientationchange', queueFit);
        window.addEventListener('load', queueFit);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);

        // Images inside the design change its height once they load
        var el = canvasEl();
        if (el) {
            el.addEventListener('load', queueFit, true);
        }
    }

    /* ---------- Bottom sheet + nav ---------- */

    function isSheetOpen() {
        return !app.classList.contains('ss-sheet-closed');
    }

    function setSheet(open) {
        app.classList.toggle('ss-sheet-closed', !open);
        var handle = app.querySelector('.ss-sheet-handle');
        if (handle) handle.setAttribute('aria-expanded', open ? 'true' : 'false');
        queueFit();
    }

    function buildBottomNav() {
        var nav = app.querySelector('.ss-bottom-nav');
        if (!nav || !panel) return;
        var links = Array.prototype.slice.call(panel.querySelectorAll('.pc-tab-link'));

        links.forEach(function (link) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ss-nav-btn';

            var icon = document.createElement('i');
            icon.className = 'bi ' + (link.getAttribute('data-ss-icon') || 'bi-sliders');
            var label = document.createElement('span');
            label.textContent = link.getAttribute('data-ss-label') || link.textContent.trim();
            btn.appendChild(icon);
            btn.appendChild(label);

            btn.addEventListener('click', function () {
                var isActive = link.classList.contains('active');
                if (isActive && isSheetOpen()) {
                    setSheet(false);
                    return;
                }
                if (!isActive) {
                    link.click(); // runs the page's own switchStudioTab(this, ...)
                    if (content) content.scrollTop = 0;
                }
                setSheet(true);
            });

            link._ssNavBtn = btn;
            nav.appendChild(btn);
        });

        function syncNav() {
            links.forEach(function (link) {
                link._ssNavBtn.classList.toggle('active', link.classList.contains('active'));
            });
        }
        syncNav();

        // Keep nav in sync however the tab gets switched
        if ('MutationObserver' in window) {
            var mo = new MutationObserver(syncNav);
            links.forEach(function (link) {
                mo.observe(link, { attributes: true, attributeFilter: ['class'] });
            });
        }
    }

    function bindSheetHandle() {
        var handle = app.querySelector('.ss-sheet-handle');
        if (!handle) return;
        handle.addEventListener('click', function () {
            setSheet(false);
        });

        // Swipe down on the handle also closes the sheet
        var startY = null;
        handle.addEventListener('touchstart', function (e) {
            startY = e.touches[0].clientY;
        }, { passive: true });
        handle.addEventListener('touchend', function (e) {
            if (startY === null) return;
            var dy = e.changedTouches[0].clientY - startY;
            startY = null;
            if (dy > 30) setSheet(false);
        });

        // The panel is always visible on desktop, so reopen when crossing the breakpoint
        var onChange = function () {
            if (!mobileQuery.matches) setSheet(true);
            queueFit();
        };
        if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onChange);
        else if (mobileQuery.addListener) mobileQuery.addListener(onChange);
    }

    /* ---------- Export at real size ---------- */

    function beginExport() {
        exporting = true;
        captureRunning = true;
        app.classList.add('ss-exporting');
        if (downloadBtn) downloadBtn.disabled = true;

        var el = canvasEl();
        scaler.style.transform = 'none';
        if (el) {
            frame.style.width = el.offsetWidth + 'px';
            frame.style.height = el.offsetHeight + 'px';
        }

        setStatus('তৈরি হচ্ছে...');
        // Safety net: never leave the overlay stuck — but never take it away while the image is still being made
        // (it used to vanish after 90 s while the export went on; presses after that were silently ignored)
        clearTimeout(exportTimer);
        var started = Date.now();
        var check = function () {
            var busy = window.TTExport && window.TTExport.isRunning && window.TTExport.isRunning();
            if (busy && Date.now() - started < 300000) exportTimer = setTimeout(check, 15000);
            else endExport();
        };
        exportTimer = setTimeout(check, 90000);
    }

    /** The line under the spinner (studio-export.js reports its steps here). */
    function setStatus(text) {
        var o = app && app.querySelector('.ss-export-overlay');
        var line = o && o.querySelector('.ss-spinner + div');
        if (line) line.textContent = text;
    }

    function endExport() {
        clearTimeout(exportTimer);
        exporting = false;
        captureRunning = false;
        pendingRenders = 0;
        app.classList.remove('ss-exporting');
        if (downloadBtn) downloadBtn.disabled = false;
        fit();
    }

    function maybeEndExport() {
        if (exporting && !captureRunning && pendingRenders <= 0) endExport();
    }

    function wrapExport() {
        var originalH2C = window.html2canvas;
        if (typeof originalH2C === 'function') {
            window.html2canvas = function () {
                // Called outside captureAndDownload(): still render unscaled
                if (!exporting) {
                    beginExport();
                    captureRunning = false;
                }
                pendingRenders++;

                var done = function () {
                    pendingRenders--;
                    maybeEndExport();
                };
                var result;
                try {
                    result = originalH2C.apply(this, arguments);
                } catch (err) {
                    done();
                    throw err;
                }
                return Promise.resolve(result).then(function (canvas) {
                    done();
                    return canvas;
                }, function (err) {
                    done();
                    throw err;
                });
            };
        }

        var originalCapture = window.captureAndDownload;
        if (typeof originalCapture === 'function') {
            window.captureAndDownload = function () {
                if (exporting) { setStatus('আগের ছবিটি এখনও তৈরি হচ্ছে, একটু অপেক্ষা করুন…'); return; }
                beginExport();

                var finish = function () {
                    captureRunning = false;
                    maybeEndExport();
                };
                var result;
                try {
                    result = originalCapture.apply(this, arguments);
                } catch (err) {
                    finish();
                    throw err;
                }
                return Promise.resolve(result).then(finish, function (err) {
                    finish();
                    console.error('Export failed:', err);
                    alert('ডাউনলোড করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
                });
            };
        }
    }

    /* ---------- Init ---------- */

    function init() {
        app = document.getElementById('studioShell');
        if (!app) return;
        stage = app.querySelector('.ss-stage');
        frame = app.querySelector('.ss-canvas-frame');
        scaler = app.querySelector('.ss-canvas-scaler');
        panel = app.querySelector('.ss-panel');
        content = panel ? panel.querySelector('.pc-tabs-content') : null;
        downloadBtn = document.getElementById('dw_bt');
        if (!stage || !frame || !scaler) return;

        buildBottomNav();
        bindSheetHandle();
        wrapExport();
        observeSizes();
        fit();
    }

    window.StudioShell = {
        getScale: function () {
            return exporting ? 1 : scale;
        },
        fit: queueFit,
        setStatus: function (text) { setStatus(text); },
        openSheet: function () { setSheet(true); },
        closeSheet: function () { setSheet(false); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
