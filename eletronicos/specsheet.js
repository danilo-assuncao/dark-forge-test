// Generates a random protocol ID. NOTE: this ID is meant purely as a display label
// and cosmetic reference, not a cryptographically secure or unique identifier. 
// It should not be used to look up or authorize access to records.
function generateProtocol() {
    return `TECH-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function generateSpecsheetText(build, requiredWatts, warrantyMonths) {
    const partsList = Object.values(build)
        .filter(p => p)
        .map(p => p.name);
    
    if (partsList.length === 0) {
        return "Nenhuma peça selecionada.";
    }

    const protocol = generateProtocol();
    return `Protocolo: ${protocol}\nPeças: ${partsList.join(', ')}\nConsumo: ${requiredWatts}W\nGarantia: ${warrantyMonths} meses`;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports.generateProtocol = generateProtocol;
    module.exports.generateSpecsheetText = generateSpecsheetText;
}
