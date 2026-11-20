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
        if (!id || !name || !socket || !ramType || typeof watts !== 'number' || watts < 0) {
            throw new Error('Invalid component specifications. id, name, socket, ramType, and watts are required.');
        }

        this.parts.set(id, { id, name, socket, ramType, watts });
    }

    /**
     * Retrieves a component by its ID.
     * @param {string} id 
     * @returns {Object|undefined}
     */
    getComponent(id) {
        return this.parts.get(id);
    }

    /**
     * Lists all registered components.
     * @returns {Array}
     */
    listComponents() {
        return Array.from(this.parts.values());
    }
}

module.exports = { Inventory };
