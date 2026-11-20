/* Motor de progresso de aulas concluídas e validador de certificado */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-academy-progress';

  var memoryStorage = {};
  
  function getStorage() {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return {
      getItem: function(key) { return memoryStorage[key] || null; },
      setItem: function(key, value) { memoryStorage[key] = String(value); },
      removeItem: function(key) { delete memoryStorage[key]; }
    };
  }

  function getProgressData() {
    var storage = getStorage();
    var data = storage.getItem(STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  function saveProgressData(data) {
    var storage = getStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function markAulaAssistida(cursoId, aulaId) {
    var data = getProgressData();
    if (!data[cursoId]) {
      data[cursoId] = { assistidas: [], certificado: null };
    }
    if (data[cursoId].assistidas.indexOf(aulaId) === -1) {
      data[cursoId].assistidas.push(aulaId);
    }
    saveProgressData(data);
  }

  function getAulasAssistidas(cursoId) {
    var data = getProgressData();
    return data[cursoId] ? data[cursoId].assistidas : [];
  }

  function gerarCertificado(cursoId, totalAulasDoCurso) {
    var data = getProgressData();
    if (!data[cursoId]) return null;

    var concluidas = data[cursoId].assistidas.length;
    if (concluidas >= totalAulasDoCurso && totalAulasDoCurso > 0) {
      if (!data[cursoId].certificado) {
        var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var code = '';
        for (var i = 0; i < 4; i++) {
          code += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        data[cursoId].certificado = 'CERT-' + code;
        saveProgressData(data);
      }
      return data[cursoId].certificado;
    }
    return null;
  }
  
  function getCertificado(cursoId) {
    var data = getProgressData();
    return data[cursoId] ? (data[cursoId].certificado || null) : null;
  }

  var api = {
    markAulaAssistida: markAulaAssistida,
    getAulasAssistidas: getAulasAssistidas,
    gerarCertificado: gerarCertificado,
    getCertificado: getCertificado,
    _clear: function() {
      getStorage().removeItem(STORAGE_KEY);
      memoryStorage = {};
    }
  };

  root.DanAcademyProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
