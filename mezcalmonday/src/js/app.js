// Glue: today label, forms, share, copy, reveal, toast.
(function () {
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var now = new Date(), dow = now.getDay();
  var today = document.querySelector('[data-today]'), note = document.querySelector('[data-open-note]');
  if (today) today.textContent = DAYS[dow];
  if (note) {
    var until = (1 - dow + 7) % 7;
    note.textContent = dow === 1 ? 'Time for mezcal.' : until === 1 ? 'Mezcal Monday is tomorrow. Plan the pour.' : 'Mezcal Monday is in ' + until + ' days. Plan the pour.';
  }

  var toastEl = document.getElementById('toast'), toastT;
  window.MMToast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  };

  // Scroll reveals (IntersectionObserver, no scroll listener)
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !document.documentElement.classList.contains('reduced')) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px 120px 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
    setTimeout(function () { items.forEach(function (el) { el.classList.add('is-in'); }); }, 2500);
  } else items.forEach(function (el) { el.classList.add('is-in'); });

  // Share / copy
  document.addEventListener('click', function (e) {
    var sh = e.target.closest('[data-share]');
    if (sh) {
      var data = { title: sh.dataset.title || document.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(function () {});
      else navigator.clipboard && navigator.clipboard.writeText(location.href).then(function () { MMToast('Link copied'); });
    }
    var cp = e.target.closest('[data-copy-recipe]');
    if (cp) {
      var name = document.querySelector('h1').textContent.trim();
      var ing = Array.prototype.map.call(document.querySelectorAll('.ingredients li'), function (li) { return '- ' + li.textContent.trim(); }).join('\n');
      var steps = Array.prototype.map.call(document.querySelectorAll('.steps li'), function (li, i) { return (i + 1) + '. ' + li.textContent.trim(); }).join('\n');
      var txt = name + '\n\n' + ing + '\n\n' + steps + '\n\n' + location.href;
      navigator.clipboard && navigator.clipboard.writeText(txt).then(function () { MMToast('Recipe copied'); });
    }
  });

  // Forms: inline validation, fetch post to api/submit.php, graceful fallback message.
  document.querySelectorAll('[data-form]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var params = new URLSearchParams(location.search);
    if (params.get('bar') && form.querySelector('[name=bar]')) form.querySelector('[name=bar]').value = params.get('bar').replace(/-/g, ' ');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (inp) {
        var bad = !inp.value.trim() || (inp.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value));
        inp.closest('.field').classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) { status.textContent = 'Check the highlighted fields.'; return; }
      status.textContent = 'Sending';
      var btn = form.querySelector('[type=submit]'); btn.disabled = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function () { form.classList.add('is-sent'); status.textContent = 'Sent. We will be in touch.'; form.reset(); })
        .catch(function () { status.textContent = 'Could not send. Email hello@mezcal-monday.com instead.'; })
        .finally(function () { btn.disabled = false; });
    });
    form.addEventListener('input', function (e) { var f = e.target.closest('.field'); if (f) f.classList.remove('is-invalid'); });
  });
})();
