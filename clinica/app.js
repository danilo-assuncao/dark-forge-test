// Mock data for Specialists
const specialists = [
    { id: 1, name: "Dr. João Silva", specialty: "Cardiologia" },
    { id: 2, name: "Dra. Maria Oliveira", specialty: "Pediatria" },
    { id: 3, name: "Dr. Carlos Santos", specialty: "Dermatologia" },
    { id: 4, name: "Dra. Ana Costa", specialty: "Ginecologia" },
    { id: 5, name: "Dr. Pedro Alves", specialty: "Ortopedia" }
];

// Mock data for Exams and Preparations
const exams = [
    {
        id: "hemograma",
        name: "Hemograma Completo",
        preparation: ["Jejum absoluto de 8 horas.", "Não ingerir bebidas alcoólicas 24h antes."]
    },
    {
        id: "glicemia",
        name: "Glicemia em Jejum",
        preparation: ["Jejum absoluto de 8 a 12 horas.", "Evitar exercícios físicos no dia anterior."]
    },
    {
        id: "ultrassom",
        name: "Ultrassom Abdominal Total",
        preparation: ["Jejum de 8 horas.", "Beber 4 a 6 copos de água 1 hora antes do exame.", "Reter urina (bexiga cheia)."]
    },
    {
        id: "raiox",
        name: "Raio-X de Tórax",
        preparation: ["Não necessita de jejum.", "Retirar objetos metálicos da região do tórax antes do exame."]
    }
];

function normalizeText(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function searchSpecialists(query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    
    return specialists.filter(s => 
        normalizeText(s.name).includes(normalizedQuery) || 
        normalizeText(s.specialty).includes(normalizedQuery)
    );
}

function buildPreparation(examIds) {
    if (!examIds || examIds.length === 0) return [];
    
    return examIds.map(id => {
        const exam = exams.find(e => e.id === id);
        return exam ? exam : null;
    }).filter(e => e !== null);
}

function validateBooking(specialistId, dateStr, timeStr, patientName) {
    const trimmedName = patientName.trim();
    if (!specialistId || !dateStr || !timeStr || !trimmedName) {
        return { valid: false, error: "Todos os campos são obrigatórios." };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr + 'T00:00:00'); // Force local interpretation
    
    if (selectedDate < today) {
        return { valid: false, error: "A data não pode ser no passado." };
    }

    return { valid: true, name: trimmedName };
}

if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", () => {
        // Current year in footer
        const yearSpan = document.getElementById("current-year");
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        
        // Set min date
        const dateInput = document.getElementById("appointment-date");
        if (dateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.min = `${yyyy}-${mm}-${dd}`;
        }

        initSpecialistSearch();
        initBookingForm();
        initExamPreparation();
    });
}

function initSpecialistSearch() {
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const resultsContainer = document.getElementById("search-results");

    if (!searchInput || !searchButton || !resultsContainer) return;

    function performSearch() {
        const query = searchInput.value;
        resultsContainer.innerHTML = "";

        if (query.trim() === "") {
            const p = document.createElement("p");
            p.textContent = "Digite um nome ou especialidade para buscar.";
            resultsContainer.appendChild(p);
            return;
        }

        const results = searchSpecialists(query);

        if (results.length === 0) {
            const p = document.createElement("p");
            p.textContent = "Nenhum especialista encontrado.";
            resultsContainer.appendChild(p);
            return;
        }

        results.forEach(s => {
            const card = document.createElement("div");
            card.className = "specialist-card";
            
            const h3 = document.createElement("h3");
            h3.textContent = s.name;
            
            const p = document.createElement("p");
            p.textContent = s.specialty;
            
            card.appendChild(h3);
            card.appendChild(p);
            resultsContainer.appendChild(card);
        });
    }

    searchButton.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            performSearch();
        }
    });
}

function initBookingForm() {
    const select = document.getElementById("specialist-select");
    const form = document.getElementById("booking-form");
    const feedback = document.getElementById("booking-feedback");

    if (!select || !form || !feedback) return;

    // Populate select
    specialists.forEach(s => {
        const option = document.createElement("option");
        option.value = s.id;
        option.textContent = `${s.name} - ${s.specialty}`;
        select.appendChild(option);
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const dateInput = document.getElementById("appointment-date").value;
        const timeInput = document.getElementById("appointment-time").value;
        const patientInput = document.getElementById("patient-name").value;
        const specialistId = select.value;

        const validation = validateBooking(specialistId, dateInput, timeInput, patientInput);

        if (!validation.valid) {
            feedback.textContent = validation.error;
            feedback.className = "feedback-msg error";
            feedback.style.display = "block";
            return;
        }

        const specialistName = specialists.find(s => s.id == specialistId)?.name;
        
        const [year, month, day] = dateInput.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        
        feedback.textContent = `Consulta agendada com sucesso para ${validation.name} com ${specialistName} no dia ${formattedDate} às ${timeInput}.`;
        feedback.className = "feedback-msg success";
        feedback.style.display = "block";
        form.reset();
    });
}

function initExamPreparation() {
    const examList = document.getElementById("exam-list");
    const form = document.getElementById("exam-form");
    const resultsContainer = document.getElementById("preparation-results");

    if (!examList || !form || !resultsContainer) return;

    // Populate checkboxes
    exams.forEach(exam => {
        const label = document.createElement("label");
        label.className = "checkbox-item";
        
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = exam.id;
        input.name = "exams";
        
        const span = document.createElement("span");
        span.textContent = exam.name;

        label.appendChild(input);
        label.appendChild(span);
        examList.appendChild(label);
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        resultsContainer.innerHTML = "";

        const selectedCheckboxes = document.querySelectorAll('input[name="exams"]:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (selectedIds.length === 0) {
            const p = document.createElement("p");
            p.textContent = "Por favor, selecione ao menos um exame.";
            resultsContainer.appendChild(p);
            return;
        }

        const results = buildPreparation(selectedIds);
        
        results.forEach(exam => {
            const card = document.createElement("div");
            card.className = "preparation-card";
            
            const h4 = document.createElement("h4");
            h4.textContent = `Preparo para ${exam.name}:`;
            
            const ul = document.createElement("ul");
            exam.preparation.forEach(prep => {
                const li = document.createElement("li");
                li.textContent = prep;
                ul.appendChild(li);
            });

            card.appendChild(h4);
            card.appendChild(ul);
            resultsContainer.appendChild(card);
        });
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        specialists,
        exams,
        searchSpecialists,
        buildPreparation,
        validateBooking,
        normalizeText
    };
}