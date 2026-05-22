const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8008;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// ==================== БАЗА ДАННЫХ ====================
const db = new sqlite3.Database('./seo-promo.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            service TEXT,
            budget TEXT,
            message TEXT,
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            orders_count INTEGER DEFAULT 0,
            first_order TIMESTAMP,
            last_order TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.get("SELECT * FROM admins WHERE username = 'admin'", (err, row) => {
            if (!row) {
                const adminPass = process.env.ADMIN_PASSWORD || 'admin2024';
                db.run("INSERT INTO admins (username, password) VALUES ('admin', ?)", [adminPass]);
                console.log('👑 Создан администратор: admin / ' + adminPass);
            }
        });

        console.log('✅ База данных инициализирована');
    });
}

// ==================== API ====================

// 1. Создать заявку
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_phone, customer_email, service, budget, message } = req.body;

    if (!customer_name || !customer_phone || !customer_email) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const orderId = 'SEO-' + Date.now();
    const createdAt = new Date().toISOString();

    db.run(
        `INSERT INTO orders (id, customer_name, customer_phone, customer_email, service, budget, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, customer_name, customer_phone, customer_email, service || '', budget || '', message || '', createdAt],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });

            db.get("SELECT * FROM customers WHERE email = ?", [customer_email], (err, customer) => {
                if (customer) {
                    db.run(`UPDATE customers SET orders_count = orders_count + 1, last_order = ? WHERE email = ?`,
                        [createdAt, customer_email]);
                } else {
                    db.run(`INSERT INTO customers (name, phone, email, orders_count, first_order, last_order) VALUES (?, ?, ?, 1, ?, ?)`,
                        [customer_name, customer_phone, customer_email, createdAt, createdAt]);
                }
            });

            res.json({ success: true, orderId });
        }
    );
});

// 2. Все заявки
app.get('/api/orders', (req, res) => {
    const { status } = req.query;
    let query = "SELECT * FROM orders";
    const params = [];
    if (status && status !== 'all') {
        query += " WHERE status = ?";
        params.push(status);
    }
    query += " ORDER BY created_at DESC";
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Обновить статус заявки
app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['new', 'processing', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Некорректный статус' });
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Заявка не найдена' });
        res.json({ success: true });
    });
});

// 4. Все клиенты
app.get('/api/customers', (req, res) => {
    db.all("SELECT * FROM customers ORDER BY last_order DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 5. Авторизация
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admins WHERE username = ? AND password = ?", [username, password], (err, admin) => {
        if (err) return res.status(500).json({ error: err.message });
        if (admin) res.json({ success: true, user: { username: admin.username } });
        else res.status(401).json({ error: 'Неверные логин или пароль' });
    });
});

// 6. Статистика
app.get('/api/stats', (req, res) => {
    db.get("SELECT COUNT(*) as total_orders FROM orders", (err, orderStats) => {
        db.get("SELECT COUNT(*) as total_customers FROM customers", (err2, custStats) => {
            db.get("SELECT COUNT(*) as new_orders FROM orders WHERE status = 'new'", (err3, newOrders) => {
                db.get("SELECT COUNT(*) as processing FROM orders WHERE status = 'processing'", (err4, proc) => {
                    res.json({
                        total_orders: orderStats?.total_orders || 0,
                        total_customers: custStats?.total_customers || 0,
                        new_orders: newOrders?.new_orders || 0,
                        processing: proc?.processing || 0
                    });
                });
            });
        });
    });
});

// 7. Экспорт CSV
app.get('/api/export/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        let csv = 'ID,Имя,Телефон,Email,Услуга,Бюджет,Статус,Дата\n';
        rows.forEach(o => {
            csv += `"${o.id}","${o.customer_name}","${o.customer_phone}","${o.customer_email}","${o.service || ''}","${o.budget || ''}","${o.status}","${o.created_at}"\n`;
        });
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.header('Content-Disposition', 'attachment; filename="orders_export.csv"');
        res.send('\uFEFF' + csv);
    });
});

// ==================== МАРШРУТЫ ====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сайт:    http://localhost:${PORT}/`);
    console.log(`🔧 Админка: http://localhost:${PORT}/admin`);
    console.log('='.repeat(50));
});
