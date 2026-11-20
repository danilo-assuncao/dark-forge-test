const ClinicaExams = require('./exams.js');

class Quote {
    constructor() {
        this.exams = [];
        this.insuranceCopayPercentage = null;
        this.couponCode = null;
    }

    addExam(examId) {
        const exam = ClinicaExams.find(examId);
        if (!exam) {
            throw new Error(`Exam not found: ${examId}`);
        }
        this.exams.push(exam);
    }

    setInsuranceCopay(percentage) {
        if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
            throw new Error("Copay percentage must be a number between 0 and 100.");
        }
        this.insuranceCopayPercentage = percentage;
    }

    applyCoupon(code) {
        this.couponCode = code;
    }

    calculate() {
        let subtotal = 0;
        let fastingHours = 0;
        let turnaroundDays = 0;

        this.exams.forEach(exam => {
            subtotal += exam.price;
            if (exam.fastingHours > fastingHours) {
                fastingHours = exam.fastingHours;
            }
            if (exam.turnaroundDays > turnaroundDays) {
                turnaroundDays = exam.turnaroundDays;
            }
        });

        let discount = 0;
        let discountType = null;

        if (this.insuranceCopayPercentage !== null) {
            // A coparticipação significa a porcentagem que o paciente paga
            // O desconto representa o que o convênio cobre
            discount = subtotal * ((100 - this.insuranceCopayPercentage) / 100);
            discountType = 'convenio';
        } else if (this.couponCode === 'DANSAUDE10') {
            discount = subtotal * 0.10;
            discountType = 'cupom_dansaude10';
        }

        return {
            subtotal,
            discount,
            total: subtotal - discount,
            fastingHours,
            turnaroundDays,
            discountType
        };
    }
}

module.exports = Quote;
