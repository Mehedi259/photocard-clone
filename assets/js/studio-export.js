/**
 * Studio export — shared by studio-photocard / opinion / thumbnail / frame.
 *
 * TTExport.run({ elementId, filename, track: { url, designId, userId, type } })
 *
 * - Picks a render scale from the real design size and the device (no more
 *   scale: 8 crashes on phones), and retries at lower scales if the browser
 *   returns an empty canvas or fails
 * - Opaque designs are saved as high-quality JPEG (small), designs with
 *   transparency stay PNG
 * - Uses toBlob + object URL instead of a giant base64 string
 * - One broken image never aborts the download
 * - In-app browsers (Facebook/Messenger/Instagram) that ignore `download`
 *   get a "press and hold to save" screen
 * - Download is tracked only after it succeeded
 * - The design's images are fetched in the background soon after the page opens (TTExport.warm), so pressing
 *   Download does not wait for them; the overlay shows which step is running (StudioShell.setStatus)
 * - A second press while an image is being made gets the same run (and a message), never a silent no-op
 */
(function () {
    'use strict';

    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    var isInApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|; wv\)/i.test(navigator.userAgent);

    var LIMITS = isMobile
        ? { width: 1800, pixels: 8e6 }
        : { width: 2160, pixels: 16e6 };

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function withTimeout(promise, ms) {
        return Promise.race([promise, new Promise(function (_, rej) {
            setTimeout(function () { rej(new Error('timeout')); }, ms);
        })]);
    }

    function status(text) {
        if (window.StudioShell && window.StudioShell.setStatus) window.StudioShell.setStatus(text);
    }

    function fetchAsDataURL(url) {
        return withTimeout(fetch(url, { credentials: 'omit' }), 12000)
            .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.blob(); })
            .then(function (blob) {
                return new Promise(function (resolve, reject) {
                    var fr = new FileReader();
                    fr.onloadend = function () { resolve(fr.result); };
                    fr.onerror = reject;
                    fr.readAsDataURL(blob);
                });
            });
    }

    // Uploaded images are stored with an absolute URL (maybe another host, or www /
    // non-www) and the server sends no CORS headers, so the browser blocks reading
    // them. The same file under the page's own origin is always readable.
    function candidateUrls(url) {
        var list = [];
        try {
            var u = new URL(url, location.href);
            if (u.origin !== location.origin) {
                list.push('/api/proxy-image?url=' + encodeURIComponent(url));
            }
        } catch (e) { }
        list.push(url);
        return list;
    }

    // url -> Promise<data URL>, shared by the background warm-up and the download (a failed fetch is forgotten, so it is tried again)
    var cache = {};
    function toDataURL(url) {
        if (cache[url]) return cache[url];
        var urls = candidateUrls(url);
        var i = 0;
        function next() {
            return fetchAsDataURL(urls[i]).catch(function (err) {
                if (++i >= urls.length) throw err;
                return next();
            });
        }
        cache[url] = next().catch(function (err) { delete cache[url]; throw err; });
        return cache[url];
    }

    /** Fetch the design's images in the background (called when the page has loaded), so Download is quick. */
    function warm(elementId) {
        var el = document.getElementById(elementId);
        if (!el) return;
        Array.prototype.forEach.call(el.getElementsByTagName('img'), function (img) {
            if (img.src && img.src.indexOf('data:') !== 0) toDataURL(img.src).catch(function () { });
        });
    }

    // Inline every image so html2canvas never depends on the network/CORS.
    // A failed image is skipped, the rest still render.
    function inlineImages(element) {
        var imgs = Array.prototype.slice.call(element.getElementsByTagName('img'));
        var failed = [];
        var todo = imgs.filter(function (img) { return img.src && img.src.indexOf('data:') !== 0; });
        var done = 0;
        if (todo.length) status('ছবি লোড হচ্ছে… (0/' + todo.length + ')');
        return Promise.all(todo.map(function (img) {
            return toDataURL(img.src).then(function (data) {
                img.src = data;
            }).catch(function () {
                failed.push(img);
            }).then(function () {
                status('ছবি লোড হচ্ছে… (' + (++done) + '/' + todo.length + ')');
            });
        })).then(function () {
            return Promise.all(imgs.map(function (img) {
                if (img.complete) return null;
                return withTimeout(new Promise(function (r) { img.onload = r; img.onerror = r; }), 8000).catch(function () { });
            }));
        }).then(function () { return failed; });
    }

    function pickScale(w, h) {
        var s = Math.min(LIMITS.width / w, Math.sqrt(LIMITS.pixels / (w * h)));
        return Math.max(1, Math.floor(s * 4) / 4);
    }

    function hasTransparency(canvas) {
        try {
            var max = 200;
            var r = Math.min(1, max / Math.max(canvas.width, canvas.height));
            var t = document.createElement('canvas');
            t.width = Math.max(1, Math.round(canvas.width * r));
            t.height = Math.max(1, Math.round(canvas.height * r));
            var ctx = t.getContext('2d');
            ctx.drawImage(canvas, 0, 0, t.width, t.height);
            var d = ctx.getImageData(0, 0, t.width, t.height).data;
            for (var i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
            return false;
        } catch (e) {
            return true; // unknown -> keep PNG (safe)
        }
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve) {
            try { canvas.toBlob(function (b) { resolve(b); }, type, quality); }
            catch (e) { resolve(null); }
        });
    }

    // Render at the first scale that gives a real image
    function render(element, scales, opts) {
        var i = 0;
        function attempt() {
            if (i >= scales.length) return Promise.reject(new Error('render failed'));
            var scale = scales[i++];
            status(i === 1 ? 'ছবি তৈরি হচ্ছে…' : 'আবার চেষ্টা হচ্ছে (ছোট মাপে)…');
            return window.html2canvas(element, {
                backgroundColor: opts.backgroundColor,
                scale: scale,
                useCORS: true,
                logging: false
            }).then(function (canvas) {
                if (!canvas || canvas.width < 2 || canvas.height < 2) throw new Error('empty canvas');
                var transparent = hasTransparency(canvas);
                var type = transparent ? 'image/png' : 'image/jpeg';
                return canvasToBlob(canvas, type, 0.92).then(function (blob) {
                    // iOS/low-memory browsers return null or a tiny blob when over limit
                    var tooSmall = !blob || blob.size < 1500;
                    canvas.width = canvas.height = 0; // free memory
                    if (tooSmall) throw new Error('empty blob');
                    return { blob: blob, ext: transparent ? 'png' : 'jpg', scale: scale };
                });
            }).catch(function (err) {
                console.warn('Export attempt failed at scale ' + scale, err);
                return wait(150).then(attempt);
            });
        }
        return attempt();
    }

    function showSaveScreen(url, name) {
        var old = document.getElementById('ttSaveScreen');
        if (old) old.remove();
        var box = document.createElement('div');
        box.id = 'ttSaveScreen';
        box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px;overflow:auto;';
        box.innerHTML =
            '<div style="color:#fff;font-size:15px;text-align:center;line-height:1.5">ছবিটির উপর চেপে ধরে <b>"Save Image"</b> / <b>"ছবি সেভ করুন"</b> চাপুন</div>' +
            '<img src="' + url + '" alt="" style="max-width:100%;max-height:70vh;border-radius:8px;background:#fff">' +
            '<div style="display:flex;gap:8px"><a href="' + url + '" download="' + name + '" style="background:#fb5518;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600">ডাউনলোড</a>' +
            '<button type="button" style="background:#334155;color:#fff;border:0;padding:8px 16px;border-radius:6px" id="ttSaveClose">বন্ধ করুন</button></div>';
        document.body.appendChild(box);
        document.getElementById('ttSaveClose').onclick = function () { box.remove(); };
    }

    function saveBlob(blob, name) {
        var url = URL.createObjectURL(blob);
        if (isInApp) {
            showSaveScreen(url, name);
            return;
        }
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    }

    function track(t) {
        if (!t) return;
        try {
            var fd = new FormData();
            fd.append('design_id', t.designId);
            fd.append('user_id', t.userId);
            fd.append('template_type', t.type);
            // same origin as the page (www / no www), so the login cookie goes along: the server takes the user from it
            var u = new URL(t.url, location.href);
            fetch(u.pathname + u.search, { method: 'POST', body: fd, keepalive: true, credentials: 'same-origin' }).catch(function () { });
        } catch (e) { }
    }

    var running = null; // the export in progress (a second press gets the same one)

    function run(cfg) {
        if (running) {
            status('আগের ছবিটি এখনও তৈরি হচ্ছে, একটু অপেক্ষা করুন…');
            return running;
        }
        var element = document.getElementById(cfg.elementId);
        if (!element) return Promise.resolve();
        if (typeof window.html2canvas !== 'function') {
            alert('ডাউনলোডের ফাইল এখনও লোড হয়নি। ইন্টারনেট দেখে পেইজ রিফ্রেশ করুন।');
            return Promise.resolve();
        }
        element.style.pointerEvents = 'none';

        running = inlineImages(element).then(function (failed) {
            element.style.pointerEvents = '';
            if (failed.length) {
                console.warn('Export: image(s) could not be loaded', failed.map(function (i) { return i.src; }));
                if (!window.confirm('কিছু ছবি (যেমন ব্যাকগ্রাউন্ড) লোড করা যায়নি, ডাউনলোড করা ছবি অসম্পূর্ণ হতে পারে। তবুও ডাউনলোড করবেন?')) {
                    throw new Error('cancelled');
                }
            }

            var w = element.offsetWidth, h = element.offsetHeight;
            var s = pickScale(w, h);
            var scales = [s, s * 0.75, s * 0.5, 1.5, 1].filter(function (v, i, arr) {
                return v >= 1 && arr.indexOf(v) === i;
            });
            return render(element, scales, { backgroundColor: null });
        }).then(function (res) {
            status('ডাউনলোড হচ্ছে…');
            saveBlob(res.blob, cfg.filename + '.' + res.ext);
            track(cfg.track);
        }).catch(function (err) {
            if (err && err.message === 'cancelled') return;
            console.error('Export failed:', err);
            alert('ডাউনলোড করতে সমস্যা হয়েছে, আবার চেষ্টা করুন। সমস্যা থাকলে পেইজ রিফ্রেশ করে চেষ্টা করুন।');
        }).then(function () {
            element.style.pointerEvents = '';
            running = null;
        });
        return running;
    }

    window.TTExport = { run: run, warm: warm, isRunning: function () { return !!running; } };

    // warm up the studio's design once the page is idle (photocard / opinion use the first id, thumbnail / frame the second)
    window.addEventListener('load', function () {
        setTimeout(function () {
            ['techtarangaPhotocard', 'ThumbnailPreviewBox'].forEach(warm);
        }, 1200);
    });
})();
