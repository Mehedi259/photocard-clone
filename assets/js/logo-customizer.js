/**
 * Logo customizer shared by studio-photocard / opinion / thumbnail / frame.
 * Page sets window.TT_LOGO_IDS = ['TechtarangaPcLogo', ...] (first match wins).
 *
 * - Works on any logo <img> (falls back to any img whose id contains "logo")
 * - Slider limits follow the real canvas size
 * - A template transform (e.g. translateX(-50%)) is baked into px left/top first,
 *   so the logo never jumps and saved CSS reproduces exactly what is on screen
 * - Saved CSS never changes a width/height the template did not ask for
 */
(function () {
    var logoAutoState = { width: false, height: false };
    var logoPosProps = { horizontal: 'left', vertical: 'top' };
    var bakedLogo = null;   // element we already baked a transform for
    var keepTransform = false; // transform could not be baked (rotate/scale)

    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    var bnLabels = { Width: 'প্রস্থ', Height: 'উচ্চতা', top: 'উপর থেকে', bottom: 'নিচ থেকে', left: 'বাম থেকে', right: 'ডান থেকে' };
    function bn(s) { return bnLabels[s] || bnLabels[cap(s)] || s; }
    function $(id) { return document.getElementById(id); }

    function getLogo() {
        var ids = window.TT_LOGO_IDS || ['TechtarangaPcLogo'];
        for (var i = 0; i < ids.length; i++) {
            var el = $(ids[i]);
            if (el) return el;
        }
        var canvas = document.querySelector('.techtaranga-photo-card');
        if (canvas) {
            var imgs = canvas.querySelectorAll('img[id]');
            for (var j = 0; j < imgs.length; j++) {
                if (/logo/i.test(imgs[j].id)) return imgs[j];
            }
        }
        return null;
    }

    // Last value a stylesheet rule gives to `prop` for this logo ('' if none)
    function ruleValue(logo, prop) {
        var val = '';
        for (var i = 0; i < document.styleSheets.length; i++) {
            var rules;
            try { rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules; } catch (e) { continue; }
            if (!rules) continue;
            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                try {
                    if (rule.selectorText && rule.style &&
                        (rule.selectorText.indexOf('#' + logo.id) !== -1 || logo.matches(rule.selectorText))) {
                        var v = rule.style.getPropertyValue(prop);
                        if (v) val = v;
                    }
                } catch (e) { /* bad selector */ }
            }
        }
        return val;
    }

    function setValue(logo, prop) { // inline wins over stylesheets
        return logo.style.getPropertyValue(prop) || ruleValue(logo, prop);
    }
    function isSet(v) { return v !== '' && v !== 'auto'; }

    function getLogoDefinedProperties(logo) {
        return {
            horizontal: isSet(setValue(logo, 'right')) ? 'right' : (isSet(setValue(logo, 'left')) ? 'left' : 'left'),
            vertical: isSet(setValue(logo, 'bottom')) ? 'bottom' : (isSet(setValue(logo, 'top')) ? 'top' : 'top')
        };
    }

    // Size of the coordinate space the logo is positioned in
    function getSpace(logo) {
        var canvas = logo.closest('.techtaranga-photo-card') || document.body;
        var p = logo.offsetParent;
        var w = canvas.offsetWidth, h = canvas.offsetHeight;
        if (p && p !== document.body && p !== document.documentElement) {
            w = Math.max(w, p.clientWidth);
            h = Math.max(h, p.clientHeight);
        }
        return { w: w, h: h };
    }

    // Replace transform with real left/top so the picture does not move
    function bakeTransform(logo) {
        if (bakedLogo === logo) return;
        bakedLogo = logo;
        keepTransform = false;
        var t = window.getComputedStyle(logo).transform;
        if (!t || t === 'none') return;
        var m;
        try { m = new DOMMatrixReadOnly(t); } catch (e) { keepTransform = true; return; }
        var plain = Math.abs(m.a - 1) < 0.001 && Math.abs(m.d - 1) < 0.001 && Math.abs(m.b) < 0.001 && Math.abs(m.c) < 0.001;
        if (!plain) { keepTransform = true; return; }

        var parent = logo.offsetParent;
        var pw = parent ? parent.clientWidth : getSpace(logo).w;
        var ph = parent ? parent.clientHeight : getSpace(logo).h;
        var x = logo.offsetLeft + m.m41; // layout position + translate
        var y = logo.offsetTop + m.m42;

        logo.style.transform = 'none';
        if (logoPosProps.horizontal === 'right') {
            logo.style.right = Math.round(pw - x - logo.offsetWidth) + 'px';
            logo.style.left = 'auto';
        } else {
            logo.style.left = Math.round(x) + 'px';
            logo.style.right = 'auto';
        }
        if (logoPosProps.vertical === 'bottom') {
            logo.style.bottom = Math.round(ph - y - logo.offsetHeight) + 'px';
            logo.style.top = 'auto';
        } else {
            logo.style.top = Math.round(y) + 'px';
            logo.style.bottom = 'auto';
        }
    }

    function intOr(v, d) { v = parseInt(v); return isNaN(v) ? d : v; }

    function applyLimits(logo, vals) {
        var s = getSpace(logo);
        $('logoWidthRange').max = Math.max(s.w, vals.width);
        $('logoHeightRange').max = Math.max(s.h, vals.height);
        $('logoVerticalRange').max = Math.max(s.h, vals.vertical);
        $('logoHorizontalRange').max = Math.max(s.w, vals.horizontal);
    }

    window.toggleLogoToolbar = function () {
        var toolbar = $('ttLogoCustomizerToolbar');
        if (!toolbar) return;
        toolbar.classList.toggle('open');
        if (!toolbar.classList.contains('open')) return;

        var logo = getLogo();
        if (!logo) return;
        var cs = window.getComputedStyle(logo);

        logoPosProps = getLogoDefinedProperties(logo);
        bakeTransform(logo);

        // "auto" only when neither inline style nor any stylesheet fixes a size
        var wv = setValue(logo, 'width'), hv = setValue(logo, 'height');
        logoAutoState.width = !isSet(wv);
        logoAutoState.height = !isSet(hv);
        $('btnWidthAuto').classList.toggle('active', logoAutoState.width);
        $('btnHeightAuto').classList.toggle('active', logoAutoState.height);
        $('logoWidthRange').disabled = logoAutoState.width;
        $('logoHeightRange').disabled = logoAutoState.height;

        var width = intOr(logo.style.width, intOr(cs.width, 120)) || 120;
        var height = intOr(logo.style.height, intOr(cs.height, 18)) || 18;
        var vertical = intOr(logo.style[logoPosProps.vertical], intOr(cs[logoPosProps.vertical], logoPosProps.vertical === 'bottom' ? 20 : 9));
        var horizontal = intOr(logo.style[logoPosProps.horizontal], intOr(cs[logoPosProps.horizontal], logoPosProps.horizontal === 'right' ? 13 : 230));

        applyLimits(logo, { width: width, height: height, vertical: vertical, horizontal: horizontal });

        $('logoWidthRange').value = width;
        $('lblLogoWidth').textContent = logoAutoState.width ? 'প্রস্থ (অটো)' : 'প্রস্থ (' + width + 'px)';
        $('logoHeightRange').value = height;
        $('lblLogoHeight').textContent = logoAutoState.height ? 'উচ্চতা (অটো)' : 'উচ্চতা (' + height + 'px)';
        $('logoVerticalRange').value = vertical;
        $('lblLogoVertical').textContent = bn(logoPosProps.vertical) + ' (' + vertical + 'px)';
        $('logoHorizontalRange').value = horizontal;
        $('lblLogoHorizontal').textContent = bn(logoPosProps.horizontal) + ' (' + horizontal + 'px)';

        updateLogoCssField();
    };

    window.toggleLogoAuto = function (type) {
        logoAutoState[type] = !logoAutoState[type];
        var C = cap(type);
        var btn = $('btn' + C + 'Auto');
        var range = $('logo' + C + 'Range');
        var label = $('lblLogo' + C);
        btn.classList.toggle('active', logoAutoState[type]);
        range.disabled = logoAutoState[type];
        label.textContent = logoAutoState[type] ? bn(C) + ' (অটো)' : bn(C) + ' (' + range.value + 'px)';
        window.updateLogoStyles();
    };

    window.updateLogoStyles = function () {
        var logo = getLogo();
        if (!logo) return;
        bakeTransform(logo);

        var width = $('logoWidthRange').value;
        var height = $('logoHeightRange').value;
        var v = $('logoVerticalRange').value;
        var h = $('logoHorizontalRange').value;

        if (!logoAutoState.width) {
            $('lblLogoWidth').textContent = 'প্রস্থ (' + width + 'px)';
            logo.style.width = width + 'px';
        } else {
            logo.style.width = 'auto';
        }
        if (!logoAutoState.height) {
            $('lblLogoHeight').textContent = 'উচ্চতা (' + height + 'px)';
            logo.style.height = height + 'px';
        } else {
            logo.style.height = 'auto';
        }
        logo.style.objectFit = 'contain'; // never stretch the logo

        $('lblLogoVertical').textContent = bn(logoPosProps.vertical) + ' (' + v + 'px)';
        $('lblLogoHorizontal').textContent = bn(logoPosProps.horizontal) + ' (' + h + 'px)';

        logo.style[logoPosProps.vertical] = v + 'px';
        logo.style[logoPosProps.horizontal] = h + 'px';
        logo.style[logoPosProps.vertical === 'top' ? 'bottom' : 'top'] = 'auto';
        logo.style[logoPosProps.horizontal === 'left' ? 'right' : 'left'] = 'auto';

        updateLogoCssField();
    };

    function updateLogoCssField() {
        var logo = getLogo();
        var out = $('logoCssOutput');
        if (!logo || !out) return;
        var cs = window.getComputedStyle(logo);
        var width = logoAutoState.width ? 'auto' : (logo.style.width || cs.width);
        var height = logoAutoState.height ? 'auto' : (logo.style.height || cs.height);
        var vp = logoPosProps.vertical, hp = logoPosProps.horizontal;
        var vv = logo.style[vp] || cs[vp];
        var hv = logo.style[hp] || cs[hp];
        var ov = vp === 'top' ? 'bottom' : 'top';
        var oh = hp === 'left' ? 'right' : 'left';

        var css = '#' + logo.id + ' {\n' +
            '    width: ' + width + ';\n' +
            '    height: ' + height + ';\n' +
            '    ' + vp + ': ' + vv + ';\n' +
            '    ' + hp + ': ' + hv + ';\n' +
            '    ' + ov + ': auto;\n' +
            '    ' + oh + ': auto;\n' +
            '    object-fit: contain;\n' +
            (keepTransform ? '' : '    transform: none;\n') +
            '}';
        out.value = css;
    }
    window.updateLogoCssField = updateLogoCssField;

    window.generateLogoCSS = function () {
        var out = $('logoCssOutput');
        if (!out || !out.value) return;
        var formData = new FormData();
        formData.append('logo_css', out.value);

        var btn = $('saveStyleBtn');
        if (!btn) return;
        btn.disabled = true;
        var originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> সেভ হচ্ছে...';

        function reset() {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-secondary');
            btn.style.backgroundColor = '#1e293b';
            btn.style.borderColor = 'rgba(255,255,255,0.15)';
        }

        fetch(window.location.href, { method: 'POST', body: formData })
            .then(function (r) { return r.text(); })
            .then(function (res) {
                if (res.indexOf('"status":"success"') === -1) throw new Error('save failed');
                btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Saved!';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-success');
                btn.style.backgroundColor = '#198754';
                btn.style.borderColor = '#198754';
                setTimeout(reset, 2000);
            })
            .catch(function (error) {
                reset();
                console.error('Error saving CSS:', error);
                alert('সেভ করতে সমস্যা হয়েছে!');
            });
    };
})();
