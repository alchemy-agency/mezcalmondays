/* Motion choreography (GSAP + ScrollTrigger). Every animation has a job:
   hero entry = hierarchy (word, then cutouts, then the search); cutout parallax = depth; reveals = sequence; sticky stack = the four in order; blur-on-focus = attention. */
(function () {
  const reduced = document.documentElement.classList.contains('reduced') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  // ----- Hero slideshow: the four restaurants take turns behind the word (no GSAP needed; paused when hidden; off under reduced motion) -----
  const slidesWrap = document.querySelector('[data-hero-slides]');
  if (slidesWrap && !reduced) {
    const slides = Array.from(slidesWrap.querySelectorAll('.hero-slide'));
    const nameEl = document.querySelector('[data-hero-slide-name]');
    let i = 0;
    let timer = null;
    const show = (n) => {
      slides[i].classList.remove('is-on');
      i = n % slides.length;
      const next = slides[(i + 1) % slides.length].querySelector('img');
      if (next && next.loading === 'lazy') next.loading = 'eager';
      slides[i].classList.add('is-on');
      if (nameEl) {
        nameEl.classList.add('is-swapping');
        setTimeout(() => { nameEl.textContent = slides[i].dataset.name || ''; nameEl.classList.remove('is-swapping'); }, 400);
      }
    };
    const start = () => { if (!timer && slides.length > 1) timer = setInterval(() => show(i + 1), 6500); };
    const stop = () => { clearInterval(timer); timer = null; };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  if (reduced || !hasGsap) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // ----- Hero entry: the wordmark settles first, then the copy -----
  const word = document.querySelector('[data-hero-word]');
  if (word) {
    // Entry animates opacity and y only; the scroll tween below animates yPercent only, so the two never fight over the same property.
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo(word, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, clearProps: 'opacity' }, 0)
      .fromTo('[data-hero-in]', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, clearProps: 'opacity' }, 0.3);
    // Scroll depth: the photograph recedes slower than the page, the wordmark a little faster.
    gsap.to('[data-hero-slides]', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(word, { yPercent: 30, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // ----- Reveals: enter once with a short fade-up -----
  document.querySelectorAll('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.7, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onComplete: () => { el.classList.add('is-in'); el.style.willChange = 'auto'; },
    });
  });

  // ----- The Four: sticky stack (canonical: pin every card but the last, next card shrinks the previous) -----
  const stack = document.querySelector('[data-stack]');
  const mq = window.matchMedia('(min-width: 900px)');
  if (stack && mq.matches) {
    const cards = gsap.utils.toArray('[data-rcard]');
    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;
      ScrollTrigger.create({ trigger: card, start: 'top top', endTrigger: cards[cards.length - 1], end: 'top top', pin: true, pinSpacing: false });
      // The card underneath settles back a notch as the next one slides over it. No opacity change, so nothing ghosts through.
      gsap.to(card.querySelector('.rcard-inner'), {
        scale: 0.94, y: -24, ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true },
      });
    });
  }

  // ----- Map pins drop in when the map section enters (handled by map.js via eat:map-ready) -----
  window.addEventListener('eat:map-ready', () => {
    const pins = document.querySelectorAll('.eat-pin');
    if (!pins.length) return;
    gsap.from(pins, { y: -18, opacity: 0, scale: 0.6, duration: 0.7, ease: 'back.out(2)', stagger: 0.07 });
  });

  // ----- Planner result swaps with a soft crossfade -----
  window.addEventListener('eat:plan', () => {
    const el = document.getElementById('planner-result'); if (!el) return;
    gsap.fromTo(el.querySelectorAll('.stop, .walk'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.06 });
  });

  ScrollTrigger.refresh();
})();
