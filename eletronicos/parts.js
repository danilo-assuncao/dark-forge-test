class Inventory {
    constructor() {
        this.parts = new Map();
    }

    /**
     * Registers a new component in the inventory.
     * @param {string} id - Unique identifier for the component.
     * @param {string} name - Name of the component.
     * @param {string} socket - Socket compatibility (e.g., 'AM4', 'LGA1700').
     * @param {string} ramType - RAM type compatibility (e.g., 'DDR4', 'DDR5').
     * @param {number} watts - Power consumption in watts.
     */
    registerComponent(id, name, socket, ramType, watts) {
        const isNonEmptyString = (str) => typeof str === 'string' && str.trim() !== '';

        if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isNonEmptyString(socket) || !isNonEmptyString(ramType)) {
            throw new Error('Invalid component specifications. id, name, socket, ramType, and watts are required.');
        }

        if (!Number.isFinite(watts) || watts < 0) {
            throw new Error('Invalid component specifications. id, name, socket, ramType, and watts are required.');
        }

        if (this.parts.has(id)) {
            throw new Error(`Component with ID '${id}' already exists.`);
        }

        this.parts.set(id, Object.freeze({ id, name, socket, ramType, watts }));
    }

    /**
     * Retrieves a component by its ID.
     * @param {string} id 
     * @returns {Object|undefined}
     */
    getComponent(id) {
        const part = this.parts.get(id);
        return part ? { ...part } : undefined;
    }

    /**
     * Lists all registered components.
     * @returns {Array}
     */
    listComponents() {
        return Array.from(this.parts.values()).map(part => ({ ...part }));
    }
}

module.exports = { Inventory };
