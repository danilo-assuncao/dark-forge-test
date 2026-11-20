class SetupValidator {
    constructor(inventory) {
        this.inventory = inventory;
    }

    validate({ cpuId, motherboardId, psuId, otherComponentIds = [] }) {
        const errors = [];
        const warnings = [];

        const cpu = cpuId ? this.inventory.getComponent(cpuId) : null;
        const motherboard = motherboardId ? this.inventory.getComponent(motherboardId) : null;
        const psu = psuId ? this.inventory.getComponent(psuId) : null;

        if (cpuId && !cpu) errors.push(`Componente CPU não encontrado: ${cpuId}`);
        if (motherboardId && !motherboard) errors.push(`Componente Placa-mãe não encontrado: ${motherboardId}`);
        if (psuId && !psu) errors.push(`Componente Fonte não encontrado: ${psuId}`);

        // Verificar compatibilidade entre CPU e placa-mãe
        if (cpu && motherboard) {
            if (cpu.socket !== motherboard.socket) {
                errors.push(`Incompatibilidade de socket: CPU (${cpu.socket}) e Placa-mãe (${motherboard.socket}).`);
            }
            if (cpu.ramType !== motherboard.ramType) {
                errors.push(`Incompatibilidade de memória: CPU (${cpu.ramType}) e Placa-mãe (${motherboard.ramType}).`);
            }
        }

        // Calcular consumo total
        if (psu) {
            let totalWatts = 0;
            if (cpu) totalWatts += cpu.watts;
            if (motherboard) totalWatts += motherboard.watts;
            
            for (const id of otherComponentIds) {
                const comp = this.inventory.getComponent(id);
                if (comp) {
                    totalWatts += comp.watts;
                } else {
                    errors.push(`Componente não encontrado: ${id}`);
                }
            }

            const requiredWatts = totalWatts * 1.25;

            if (requiredWatts > psu.watts) {
                warnings.push(`O consumo total com margem de 25% (${requiredWatts}W) excede a capacidade da fonte selecionada (${psu.watts}W).`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

module.exports = { SetupValidator };
