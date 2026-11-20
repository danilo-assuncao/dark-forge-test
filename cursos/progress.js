/* Motor de progresso de aulas concluídas e validador de certificado.
 *
 * AVISO: tudo aqui roda no cliente (localStorage). O código CERT-XXXX é um
 * recurso de conveniência/cosmético e NÃO é uma fronteira de confiança: o
 * usuário controla o armazenamento e pode forjar entradas. Verificação real
 * exige emissão/validação no servidor. Consumidores devem renderizar o código
 * com textContent (nunca innerHTML). */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-academy-progress';
  var CERT_RE = /^CERT-[A-Z0-9]{4}$/;
  var CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  var memoryStorage = {};
  var memoryBackend = {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null; },
    setItem: function (key, value) { memoryStorage[key] = String(value); },
    removeItem: function (key) { delete memoryStorage[key]; }
  };

  var rng = null; // injetável para testes: () => inteiro em [0, max)
  function randomIndex(max) {
    if (rng) return rng(max);
    var c = typeof crypto !== 'undefined' ? crypto : (root && root.crypto);
    if (c && typeof c.getRandomValues === 'function') {
      var limit = Math.floor(0x100000000 / max) * max;
      var buf = new Uint32Array(1);
      do { c.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getStorage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* acesso bloqueado (SecurityError) */ }
    return memoryBackend;
  }

  // Normaliza para um mapa sem protótipo; descarta entradas inválidas.
  function normalize(parsed) {
    var out = Object.create(null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
    Object.keys(parsed).forEach(function (id) {
      var entry = parsed[id];
      if (!entry || typeof entry !== 'object' || !Array.isArray(entry.assistidas)) return;
      var vistas = [];
      entry.assistidas.forEach(function (a) {
        if (typeof a === 'string' && vistas.indexOf(a) === -1) vistas.push(a);
      });
      out[id] = {
        assistidas: vistas,
        certificado: typeof entry.certificado === 'string' && CERT_RE.test(entry.certificado) ? entry.certificado : null
      };
    });
    return out;
  }

  function getProgressData() {
    var raw = null;
    try { raw = getStorage().getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (!raw) return Object.create(null);
    try { return normalize(JSON.parse(raw)); } catch (e) { return Object.create(null); }
  }

  function saveProgressData(data) {
    var json = JSON.stringify(data);
    try {
      getStorage().setItem(STORAGE_KEY, json);
      return true;
    } catch (e) {
      memoryBackend.setItem(STORAGE_KEY, json);
      return false;
    }
  }

  function validId(id) {
    return (typeof id === 'string' && id.length > 0) || (typeof id === 'number' && isFinite(id));
  }

  // Ids são normalizados para string ('1' e 1 são a mesma aula).
  function markAulaAssistida(cursoId, aulaId) {
    if (!validId(cursoId) || !validId(aulaId)) return false;
    cursoId = String(cursoId);
    aulaId = String(aulaId);
    var data = getProgressData();
    if (!hasOwn(data, cursoId)) data[cursoId] = { assistidas: [], certificado: null };
    if (data[cursoId].assistidas.indexOf(aulaId) === -1) data[cursoId].assistidas.push(aulaId);
    saveProgressData(data);
    return true;
  }

  function getAulasAssistidas(cursoId) {
    if (!validId(cursoId)) return [];
    var data = getProgressData();
    cursoId = String(cursoId);
    return hasOwn(data, cursoId) ? data[cursoId].assistidas.slice() : [];
  }

  function gerarCodigo() {
    var code = '';
    for (var i = 0; i < 4; i++) code += CHARSET.charAt(randomIndex(CHARSET.length));
    return 'CERT-' + code;
  }

  // aulasDoCurso: array com os ids válidos do curso (recomendado; todos devem
  // estar em assistidas) ou, por compatibilidade, o total numérico de aulas.
  function gerarCertificado(cursoId, aulasDoCurso) {
    if (!validId(cursoId)) return null;
    cursoId = String(cursoId);
    var data = getProgressData();
    if (!hasOwn(data, cursoId)) return null;
    var entry = data[cursoId];

    if (entry.certificado) return entry.certificado; // já emitido: sempre consistente com getCertificado

    var completo;
    if (Array.isArray(aulasDoCurso)) {
      completo = aulasDoCurso.length > 0 && aulasDoCurso.every(function (id) {
        return validId(id) && entry.assistidas.indexOf(String(id)) !== -1;
      });
    } else {
      completo = typeof aulasDoCurso === 'number' && isFinite(aulasDoCurso) &&
        aulasDoCurso > 0 && entry.assistidas.length >= aulasDoCurso;
    }
    if (!completo) return null;

    entry.certificado = gerarCodigo();
    saveProgressData(data);
    return entry.certificado;
  }

  function getCertificado(cursoId) {
    if (!validId(cursoId)) return null;
    var data = getProgressData();
    cursoId = String(cursoId);
    return hasOwn(data, cursoId) ? data[cursoId].certificado : null;
  }

  // Validação local e não autoritativa (ver aviso no topo do arquivo).
  function validarCertificado(cursoId, codigo) {
    if (typeof codigo !== 'string' || !CERT_RE.test(codigo)) return false;
    return getCertificado(cursoId) === codigo;
  }

  var api = {
    markAulaAssistida: markAulaAssistida,
    getAulasAssistidas: getAulasAssistidas,
    gerarCertificado: gerarCertificado,
    getCertificado: getCertificado,
    validarCertificado: validarCertificado,
    _setRandom: function (fn) { rng = fn || null; },
    _clear: function () {
      try { getStorage().removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
      memoryStorage = {};
    }
  };

  root.DanAcademyProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
