// Dan Tech Store SPA: filterable showcase, PC builder with compatibility alerts and cart checkout.
// Pure logic is exported for node --test; DOM wiring only runs in a browser.

const CATALOG = [
    { id: 'cpu-r5-5600', name: 'AMD Ryzen 5 5600', category: 'cpu', priceCents: 69900, socket: 'AM4', watts: 65 },
    { id: 'cpu-r7-7700', name: 'AMD Ryzen 7 7700', category: 'cpu', priceCents: 149900, socket: 'AM5', watts: 65 },
    { id: 'cpu-i5-12400', name: 'Intel Core i5-12400F', category: 'cpu', priceCents: 74900, socket: 'LGA1700', watts: 65 },
    { id: 'cpu-i7-14700', name: 'Intel Core i7-14700K', category: 'cpu', priceCents: 249900, socket: 'LGA1700', watts: 125 },
    { id: 'mb-b550', name: 'Placa-mãe B550M', category: 'motherboard', priceCents: 69900, socket: 'AM4', ramType: 'DDR4', watts: 40 },
    { id: 'mb-b650', name: 'Placa-mãe B650M', category: 'motherboard', priceCents: 99900, socket: 'AM5', ramType: 'DDR5', watts: 45 },
    { id: 'mb-b660', name: 'Placa-mãe B660M', category: 'motherboard', priceCents: 79900, socket: 'LGA1700', ramType: 'DDR4', watts: 40 },
    { id: 'mb-z790', name: 'Placa-mãe Z790', category: 'motherboard', priceCents: 189900, socket: 'LGA1700', ramType: 'DDR5', watts: 50 },
    { id: 'ram-d4-16', name: 'Memória 16GB DDR4 3200', category: 'ram', priceCents: 22900, ramType: 'DDR4', watts: 5 },
    { id: 'ram-d5-16', name: 'Memória 16GB DDR5 5600', category: 'ram', priceCents: 34900, ramType: 'DDR5', watts: 5 },
    { id: 'gpu-rtx4060', name: 'GeForce RTX 4060 8GB', category: 'gpu', priceCents: 189900, watts: 115 },
    { id: 'gpu-rtx4080', name: 'GeForce RTX 4080 16GB', category: 'gpu', priceCents: 549900, watts: 320 },
    { id: 'psu-500', name: 'Fonte 500W 80 Plus', category: 'psu', priceCents: 29900, capacityWatts: 500 },
    { id: 'psu-750', name: 'Fonte 750W 80 Plus Gold', category: 'psu', priceCents: 59900, capacityWatts: 750 },
    { id: 'ssd-1tb', name: 'SSD NVMe 1TB', category: 'storage', priceCents: 29900, watts: 5 },
    { id: 'kb-mech', name: 'Teclado Mecânico', category: 'peripheral', priceCents: 24900 },
    { id: 'mouse-gamer', name: 'Mouse Gamer 16000 DPI', category: 'peripheral', priceCents: 14900 },
    { id: 'mon-27', name: 'Monitor 27" 144Hz', category: 'peripheral', priceCents: 109900 }
];

const CATEGORY_LABELS = {
    cpu: 'Processador', motherboard: 'Placa-mãe', ram: 'Memória', gpu: 'Placa de vídeo',
    psu: 'Fonte', storage: 'Armazenamento', peripheral: 'Periféricos'
};

const BUILD_SLOTS = ['cpu', 'motherboard', 'ram', 'gpu', 'psu'];
const SYSTEM_BASE_WATTS = 50;
const PSU_HEADROOM = 1.2;

function formatBRL(cents) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalize(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filters the catalog by category, free-text query and max price (cents). Empty/absent criteria are ignored. */
function filterCatalog(items, { category = 'all', query = '', maxPriceCents = null } = {}) {
    const q = normalize(query).trim();
    return items.filter((p) => {
        if (category && category !== 'all' && p.category !== category) return false;
        if (q && !normalize(p.name).includes(q)) return false;
        if (Number.isFinite(maxPriceCents) && p.priceCents > maxPriceCents) return false;
        return true;
    });
}

/**
 * Checks a build ({ cpu, motherboard, ram, gpu, psu } of part objects or undefined).
 * Returns { alerts: [{ level: 'error'|'warning', message }], requiredWatts }.
 */
function checkCompatibility(build) {
    const alerts = [];
    const { cpu, motherboard, ram, gpu, psu } = build || {};
    if (cpu && motherboard && cpu.socket !== motherboard.socket) {
        alerts.push({ level: 'error', message: `Soquete incompatível: ${cpu.name} usa ${cpu.socket}, mas a placa-mãe é ${motherboard.socket}.` });
    }
    if (ram && motherboard && ram.ramType !== motherboard.ramType) {
        alerts.push({ level: 'error', message: `Memória incompatível: ${ram.ramType} não funciona em placa-mãe ${motherboard.ramType}.` });
    }
    const draw = [cpu, motherboard, ram, gpu].reduce((s, p) => s + (p && p.watts ? p.watts : 0), SYSTEM_BASE_WATTS);
    const requiredWatts = Math.ceil(draw * PSU_HEADROOM);
    if (psu && psu.capacityWatts < requiredWatts) {
        alerts.push({ level: 'error', message: `Fonte insuficiente: ${psu.capacityWatts}W para um consumo recomendado de ${requiredWatts}W.` });
    }
    const missing = BUILD_SLOTS.filter((s) => !build || !build[s]).map((s) => CATEGORY_LABELS[s]);
    if (missing.length) {
        alerts.push({ level: 'warning', message: `Montagem incompleta. Falta: ${missing.join(', ')}.` });
    }
    return { alerts, requiredWatts };
}

function buildTotalCents(build) {
    return BUILD_SLOTS.reduce((s, k) => s + (build && build[k] ? build[k].priceCents : 0), 0);
}

function findPart(id) {
    return CATALOG.find((p) => p.id === id);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CATALOG, CATEGORY_LABELS, BUILD_SLOTS, formatBRL, filterCatalog, checkCompatibility, buildTotalCents, findPart };
}

// ---------- Browser wiring ----------
if (typeof document !== 'undefined') {
    const CartClass = window.DanTechCart && window.DanTechCart.Cart;
    const cart = CartClass ? new CartClass() : null;
    const build = {};
    const $ = (id) => document.getElementById(id);

    const el = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };

    const addToCart = (part) => {
        if (!cart) return;
        try {
            cart.addItem(part.id, part.name, part.priceCents, 1);
        } catch (e) {
            $('cart-message').textContent = 'Não foi possível adicionar o item (limite de quantidade).';
        }
        renderCart();
    };

    function renderShowcase() {
        const maxReais = parseFloat($('filter-price').value);
        const list = filterCatalog(CATALOG, {
            category: $('filter-category').value,
            query: $('filter-query').value,
            maxPriceCents: Number.isFinite(maxReais) ? Math.round(maxReais * 100) : null
        });
        const grid = $('showcase');
        grid.replaceChildren();
        $('showcase-count').textContent = `${list.length} produto(s)`;
        for (const p of list) {
            const card = el('article', undefined, 'card');
            card.append(el('span', CATEGORY_LABELS[p.category], 'tag'), el('h3', p.name), el('p', formatBRL(p.priceCents), 'price'));
            const btn = el('button', 'Adicionar ao carrinho', 'btn');
            btn.type = 'button';
            btn.addEventListener('click', () => addToCart(p));
            card.append(btn);
            grid.append(card);
        }
    }

    function renderBuilder() {
        const { alerts, requiredWatts } = checkCompatibility(build);
        const box = $('alerts');
        box.replaceChildren();
        for (const a of alerts) box.append(el('li', a.message, `alert alert-${a.level}`));
        if (!alerts.length) box.append(el('li', 'Tudo compatível!', 'alert alert-ok'));
        $('build-total').textContent = `Total da montagem: ${formatBRL(buildTotalCents(build))} · Consumo recomendado: ${requiredWatts}W`;
        
        const canBuild = BUILD_SLOTS.every((s) => build[s]) && !alerts.some((a) => a.level === 'error');
        $('build-add').disabled = !canBuild;
        $('build-specsheet').disabled = !canBuild;
        $('specsheet-output').style.display = 'none';
    }

    function renderCart() {
        const list = $('cart-items');
        list.replaceChildren();
        if (!cart) return;
        for (const i of cart.items) {
            const li = el('li');
            li.append(el('span', `${i.qty}× ${i.name} — ${formatBRL(i.priceCents * i.qty)}`));
            const rm = el('button', 'Remover', 'btn btn-small');
            rm.type = 'button';
            rm.addEventListener('click', () => { cart.removeItem(i.id); renderCart(); });
            li.append(rm);
            list.append(li);
        }
        const t = cart.totals();
        const lines = [`Subtotal: ${formatBRL(t.subtotalCents)}`];
        if (t.couponDiscountCents) lines.push(`Cupom ${t.couponCode}: -${formatBRL(t.couponDiscountCents)}`);
        lines.push(`PIX (10% off): ${formatBRL(t.pixTotalCents)}`);
        const n = parseInt($('installments').value, 10) || 1;
        const inst = cart.installments(n);
        lines.push(`Cartão: ${n}x de ${formatBRL(inst.amounts[0])} sem juros`);
        $('cart-totals').replaceChildren(...lines.map((l) => el('p', l)));
        $('checkout').disabled = cart.items.length === 0;
    }

    function init() {
        const cat = $('filter-category');
        cat.append(new Option('Todas as categorias', 'all'));
        for (const [k, v] of Object.entries(CATEGORY_LABELS)) cat.append(new Option(v, k));
        for (const k of BUILD_SLOTS) {
            const sel = $(`slot-${k}`);
            sel.append(new Option(`Selecione: ${CATEGORY_LABELS[k]}`, ''));
            for (const p of CATALOG.filter((c) => c.category === k)) sel.append(new Option(`${p.name} — ${formatBRL(p.priceCents)}`, p.id));
            sel.addEventListener('change', () => {
                build[k] = findPart(sel.value);
                renderBuilder();
            });
        }
        for (const id of ['filter-category', 'filter-query', 'filter-price']) {
            $(id).addEventListener('input', renderShowcase);
        }
        $('build-add').addEventListener('click', () => {
            for (const k of BUILD_SLOTS) addToCart(build[k]);
        });
        $('build-specsheet').addEventListener('click', () => {
            const { requiredWatts } = checkCompatibility(build);
            const warrantyMonths = parseInt($('build-warranty').value, 10) || 12;
            
            const generateText = window.DanTechCart && window.DanTechCart.generateSpecsheetText;
            if (generateText) {
                const text = generateText(build, requiredWatts, warrantyMonths);
                $('specsheet-output').textContent = text;
                $('specsheet-output').style.display = 'block';
            }
        });
        $('build-warranty').addEventListener('change', () => {
            $('specsheet-output').style.display = 'none';
        });
        $('installments').addEventListener('change', renderCart);
        $('coupon-apply').addEventListener('click', () => {
            if (!cart) return;
            try {
                cart.applyCoupon($('coupon').value);
                $('cart-message').textContent = 'Cupom aplicado.';
            } catch (e) {
                $('cart-message').textContent = 'Cupom inválido.';
            }
            renderCart();
        });
        $('checkout').addEventListener('click', () => {
            if (!cart || !cart.items.length) return;
            const t = cart.totals();
            cart.clear();
            $('cart-message').textContent = `Pedido registrado (simulação)! Total no PIX: ${formatBRL(t.pixTotalCents)}.`;
            renderCart();
        });
        renderShowcase();
        renderBuilder();
        renderCart();
    }

    init();
}
