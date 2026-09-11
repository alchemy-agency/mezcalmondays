// GSAP: hero entry, motivated only. Scroll reveals are IntersectionObserver in app.js. Reduced motion: nothing runs.
(function () {
  if (!window.gsap || document.documentElement.classList.contains('reduced')) return;
  var hero = document.querySelector('.hero'); if (!hero) return;
  var ease = 'power3.out';
  var tl = gsap.timeline({ defaults: { ease: ease } });
  tl.from('.hero-copy > *', { y: 22, opacity: 0, duration: 0.8, stagger: 0.08 }, 0)
    .from('.feature-pour', { y: 30, opacity: 0, duration: 0.9 }, 0.25)
    .from('.hero-quick .chip', { y: 10, opacity: 0, duration: 0.5, stagger: 0.04 }, 0.5);
  // Banner slides under the hero once it enters
  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.banner').forEach(function (b) { gsap.from(b, { y: 18, opacity: 0, duration: 0.7, ease: ease, scrollTrigger: { trigger: b, start: 'top 88%', once: true } }); });
  }
})();
