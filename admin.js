// ===================== AUTH =====================
let currentUser = null;

const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      document.getElementById('adminUsername').textContent = currentUser.username;
      loginScreen.classList.add('hidden');
      adminPanel.classList.remove('hidden');
      loadStats();
      loadOrders('all');
    } else {
      errEl.classList.remove('hidden');
    }
  } catch {
    errEl.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  adminPanel.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

// ===================== SIDEBAR TOGGLE =====================
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ===================== TABS =====================
const tabTitles = { orders: 'Заявки', customers: 'Клиенты' };

document.querySelectorAll('.sidebar-link').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('pageTitle').textContent = tabTitles[tab];
    if (tab === 'orders') loadOrders('all');
    if (tab === 'customers') loadCustomers();
    if (window.innerWidth < 900) sidebar.classList.remove('open');
  });
});

// ===================== STATS =====================
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('statTotal').textContent = data.total_orders;
    document.getElementById('statNew').textContent = data.new_orders;
    document.getElementById('statProcess').textContent = data.processing;
    document.getElementById('statCustomers').textContent = data.total_customers;
  } catch {}
}

// ===================== ORDERS =====================
let currentFilter = 'all';

document.getElementById('filterTabs').querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.status;
    loadOrders(currentFilter);
  });
});

async function loadOrders(status) {
  const tbody = document.getElementById('ordersBody');
  tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Загрузка...</td></tr>';
  try {
    const res = await fetch('/api/orders?status=' + status);
    const orders = await res.json();
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Нет заявок</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td style="font-size:0.75rem;color:var(--text3)">${o.id}</td>
        <td>${escape(o.customer_name)}</td>
        <td>${escape(o.customer_phone)}</td>
        <td style="font-size:0.82rem">${escape(o.customer_email)}</td>
        <td style="font-size:0.82rem">${escape(o.service || '—')}</td>
        <td style="font-size:0.82rem">${escape(o.budget || '—')}</td>
        <td>
          <select class="status-select" data-id="${o.id}" onchange="updateStatus('${o.id}', this.value)">
            <option value="new" ${o.status==='new'?'selected':''}>Новая</option>
            <option value="processing" ${o.status==='processing'?'selected':''}>В работе</option>
            <option value="completed" ${o.status==='completed'?'selected':''}>Выполнена</option>
            <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Отменена</option>
          </select>
        </td>
        <td style="font-size:0.78rem;color:var(--text3)">${formatDate(o.created_at)}</td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Ошибка загрузки</td></tr>';
  }
}

async function updateStatus(id, status) {
  try {
    await fetch('/api/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadStats();
  } catch {}
}

// ===================== CUSTOMERS =====================
async function loadCustomers() {
  const tbody = document.getElementById('customersBody');
  tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Загрузка...</td></tr>';
  try {
    const res = await fetch('/api/customers');
    const customers = await res.json();
    if (!customers.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Нет клиентов</td></tr>';
      return;
    }
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>${escape(c.name)}</td>
        <td>${escape(c.phone)}</td>
        <td style="font-size:0.82rem">${escape(c.email)}</td>
        <td style="color:var(--accent);font-weight:700">${c.orders_count}</td>
        <td style="font-size:0.78rem;color:var(--text3)">${formatDate(c.first_order)}</td>
        <td style="font-size:0.78rem;color:var(--text3)">${formatDate(c.last_order)}</td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Ошибка загрузки</td></tr>';
  }
}

// ===================== EXPORT =====================
document.getElementById('exportBtn').addEventListener('click', () => {
  window.open('/api/export/orders', '_blank');
});

// ===================== HELPERS =====================
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function escape(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
