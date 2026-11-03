(function ($) {
	"use strict";
AOS.init({
    duration: 500, 
  });

/*=============================================
	    =    Smooth Scroll Navigation    =
=============================================*/
// Smooth scroll for all nav links
$('a.nav-link[href^="#"]').on('click', function(e) {
    e.preventDefault();
    const target = $(this.getAttribute('href'));
    if(target.length) {
        $('html, body').stop().animate({
            scrollTop: target.offset().top - 80
        }, 200);
    }
});

// Active link on scroll
$(window).on('scroll', function() {
    const scrollPos = $(window).scrollTop() + 100;
    
    $('section[id]').each(function() {
        const section = $(this);
        const sectionTop = section.offset().top;
        const sectionBottom = sectionTop + section.outerHeight();
        const sectionId = section.attr('id');
        
        if(scrollPos >= sectionTop && scrollPos < sectionBottom) {
            $('.nav-link').removeClass('active');
            $('.nav-link[href="#' + sectionId + '"]').addClass('active');
        }
    });
});

/*=============================================
	    =           Partical JS        =
=============================================*/
if ($('.techtaranga-banner').length) {
	const colors = ["#FF4D4D", "#1AD6FF", "#FFCD4D", "#BB6BD9", "#1A66FF"];

	const numBalls = 50;
	const balls = [];

	for (let i = 0; i < numBalls; i++) {
		let ball = document.createElement("div");
		ball.classList.add("ball");
		ball.style.background = colors[Math.floor(Math.random() * colors.length)];
		ball.style.left = `${Math.floor(Math.random() * 100)}%`;
		ball.style.top = `${Math.floor(Math.random() * 100)}%`;
		ball.style.transform = `scale(${Math.random()})`;
		ball.style.width = `${Math.random() * 10}px`;
		ball.style.height = ball.style.width;
		balls.push(ball);

		$('.techtaranga-banner').append(ball);
	}

	balls.forEach((el, i, ra) => {
		let to = {
			x: Math.random() * (i % 2 === 0 ? -10 : 11),
			y: Math.random() * 12
		};

		let anim = el.animate(
			[
				{ transform: "translate(0, 0)" },
				{ transform: `translate(${to.x}rem, ${to.y}rem)` }
			],
			{
				duration: (Math.random() + 1) * 2000,
				direction: "alternate",
				fill: "both",
				iterations: Infinity,
				easing: "ease-in-out"
			}
		);
	});
}

/*=============================================
	    =     Bubble Animation for FAQ     =
=============================================*/
if ($('.techtaranga_faq').length) {
	const colors = ["#FF4D4D", "#1AD6FF", "#FFCD4D", "#BB6BD9", "#1A66FF"];

	const numBalls = 40;
	const balls = [];

	for (let i = 0; i < numBalls; i++) {
		let ball = document.createElement("div");
		ball.classList.add("ball");
		ball.style.background = colors[Math.floor(Math.random() * colors.length)];
		ball.style.left = `${Math.floor(Math.random() * 100)}%`;
		ball.style.top = `${Math.floor(Math.random() * 100)}%`;
		ball.style.transform = `scale(${Math.random()})`;
		ball.style.width = `${Math.random() * 10}px`;
		ball.style.height = ball.style.width;
		balls.push(ball);

		$('.techtaranga_faq').append(ball);
	}

	balls.forEach((el, i, ra) => {
		let to = {
			x: Math.random() * (i % 2 === 0 ? -10 : 11),
			y: Math.random() * 12
		};

		let anim = el.animate(
			[
				{ transform: "translate(0, 0)" },
				{ transform: `translate(${to.x}rem, ${to.y}rem)` }
			],
			{
				duration: (Math.random() + 1) * 2000,
				direction: "alternate",
				fill: "both",
				iterations: Infinity,
				easing: "ease-in-out"
			}
		);
	});
}

function bengaliToEnglishDigits(str) {
  const map = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
  return str.replace(/[০-৯]/g, m => map[m]);
} 
function englishToBengaliDigits(str) {
  const map = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
  return str.replace(/[0-9]/g, m => map[m]);
} 
function addThousandsSeparators(s) {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
} 
function animateCount(el, start, end, duration) {
  const startTime = performance.now();
  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    const current = Math.floor(start + (end - start) * eased);
    const withCommas = addThousandsSeparators(String(current));
    el.textContent = englishToBengaliDigits(withCommas);
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      const finalWithCommas = addThousandsSeparators(String(end));
      el.textContent = englishToBengaliDigits(finalWithCommas);
    }
  }
  requestAnimationFrame(frame);
}
(function initCounters({
  selector = '.c_number',
  duration = 1800,
  startFrom = 0
} = {}) {
  const nodes = Array.from(document.querySelectorAll(selector));
  if (!nodes.length) return;
  const counters = nodes.map(node => {
    const raw = node.textContent.trim();
    const cleaned = raw.replace(/[,\s]/g, '');
    const english = bengaliToEnglishDigits(cleaned).replace(/[^\d]/g, '') || '0';
    const target = parseInt(english, 10) || 0;
    const startText = englishToBengaliDigits(addThousandsSeparators(String(startFrom)));
    node.textContent = startText;
    return { node, target };
  });
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const item = counters.find(c => c.node === entry.target);
        if (item && !item.started) {
          item.started = true;
          animateCount(item.node, startFrom, item.target, duration);
        }
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  counters.forEach(c => observer.observe(c.node));
})();
 
})(jQuery);


window.addEventListener('load', function () {
const shownAt = localStorage.getItem('wapp_shown_at');
const now = Date.now();
const thirtyMins = 30 * 60 * 1000;

if (!shownAt || now - shownAt > thirtyMins) {
  setTimeout(function () {
    const box = document.querySelector('.w-app');
    if (!box) return;
    box.classList.add('opened');
    setTimeout(function () {
      box.classList.remove('opened');
    }, 5000);
    localStorage.setItem('wapp_shown_at', now.toString());
  }, 1000);
}
});