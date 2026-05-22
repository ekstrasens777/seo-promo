// ===================== NAVBAR =====================
const navbar = document.getElementById('navbar');
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
const navOverlay = document.getElementById('navOverlay');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

function openMenu() {
  mobileMenu.classList.add('open');
  burger.classList.add('open');
  navOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  burger.classList.remove('open');
  navOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

burger.addEventListener('click', () => {
  mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
});

navOverlay.addEventListener('click', closeMenu);

// Закрыть при клике на ссылку + плавный переход
document.querySelectorAll('[data-close]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      closeMenu();
      setTimeout(() => {
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else {
      closeMenu();
    }
  });
});

// ===================== FADE IN ANIMATIONS =====================
document.querySelectorAll('.service-card, .case-card, .process-step, .section-header').forEach((el, i) => {
  el.classList.add('fade-in');
  el.style.transitionDelay = (i % 6) * 0.07 + 's';
});

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

// ===================== CALCULATOR =====================
const calcState = {
  servicePrice: 15000,
  serviceName: 'SEO',
  regionMult: 1,
  competMult: 1,
  extras: 0,
  months: 3,
};

const termValues = [1, 3, 6, 12];
const competMultipliers = [1, 1.3, 1.7];

function fmt(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function updateCalc() {
  const base = calcState.servicePrice;
  const withRegion = base * calcState.regionMult;
  const withCompet = withRegion * calcState.competMult;
  const monthly = Math.round(withCompet + calcState.extras);
  const total = monthly * calcState.months;

  document.getElementById('totalPrice').textContent = fmt(monthly);
  document.getElementById('bBase').textContent = fmt(base);
  document.getElementById('bRegion').textContent = '×' + (calcState.regionMult * calcState.competMult).toFixed(2);
  document.getElementById('bExtras').textContent = fmt(calcState.extras);
  document.getElementById('totalMonths').textContent = calcState.months;
  document.getElementById('totalSum').textContent = fmt(total);

  document.getElementById('calcOrderBtn').dataset.budget =
    `~${fmt(monthly)}/мес (${calcState.serviceName})`;
}

document.getElementById('calcService').querySelectorAll('.calc-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('calcService').querySelectorAll('.calc-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    calcState.servicePrice = parseInt(btn.dataset.price);
    calcState.serviceName = btn.textContent.trim();
    updateCalc();
  });
});

document.getElementById('calcRegion').querySelectorAll('.calc-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('calcRegion').querySelectorAll('.calc-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    calcState.regionMult = parseFloat(btn.dataset.mult);
    updateCalc();
  });
});

const competSlider = document.getElementById('competSlider');
competSlider.addEventListener('input', () => {
  const val = parseInt(competSlider.value) - 1;
  calcState.competMult = competMultipliers[val];
  for (let i = 0; i < 3; i++) {
    document.getElementById('compLabel' + i).classList.toggle('active', i === val);
  }
  updateCalc();
});

const termSlider = document.getElementById('termSlider');
termSlider.addEventListener('input', () => {
  const idx = parseInt(termSlider.value) - 1;
  calcState.months = termValues[idx];
  const labels = ['1 месяц', '3 месяца', '6 месяцев', '12 месяцев'];
  document.getElementById('termVal').textContent = labels[idx];
  updateCalc();
});

['checkAudit', 'checkAnalytics', 'checkContent', 'checkLocal'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    calcState.extras = ['checkAudit', 'checkAnalytics', 'checkContent', 'checkLocal']
      .reduce((sum, cid) => {
        const el = document.getElementById(cid);
        return sum + (el.checked ? parseInt(el.dataset.price) : 0);
      }, 0);
    updateCalc();
  });
});

document.getElementById('calcOrderBtn').addEventListener('click', (e) => {
  e.preventDefault();
  const budgetField = document.getElementById('budget');
  if (budgetField && e.currentTarget.dataset.budget) {
    budgetField.value = e.currentTarget.dataset.budget;
  }
  const contact = document.getElementById('contact');
  if (contact) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

updateCalc();

// ===================== CONTACT FORM =====================
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const text = document.getElementById('submitText');
  const loader = document.getElementById('submitLoader');
  const success = document.getElementById('formSuccess');
  const error = document.getElementById('formError');

  btn.disabled = true;
  text.classList.add('hidden');
  loader.classList.remove('hidden');
  success.classList.add('hidden');
  error.classList.add('hidden');

  const data = {
    customer_name: document.getElementById('name').value.trim(),
    customer_phone: document.getElementById('phone').value.trim(),
    customer_email: document.getElementById('email').value.trim(),
    service: document.getElementById('service').value,
    budget: document.getElementById('budget').value.trim(),
    message: document.getElementById('message').value.trim(),
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      success.classList.remove('hidden');
      contactForm.reset();
    } else throw new Error(json.error);
  } catch {
    error.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    text.classList.remove('hidden');
    loader.classList.add('hidden');
  }
});

// ===================== SMOOTH NAV (desktop) =====================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  if (a.hasAttribute('data-close')) return; // уже обработано выше
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
