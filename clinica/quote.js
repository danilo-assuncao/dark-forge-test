(function (global) {
'use strict';
const isNode = typeof module !== 'undefined' && module.exports;
const ClinicaExams = isNode ? require('./exams.js') : global.ClinicaExams;

const COUPON_DANSAUDE10 = 'DANSAUDE10';

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
        if (this.exams.some(e => e.id === exam.id)) {
            throw new Error(`Exam already added: ${examId}`);
        }
        this.exams.push(exam);
    }

    setInsuranceCopay(percentage) {
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
            throw new Error("Copay percentage must be a number between 0 and 100.");
        }
        this.insuranceCopayPercentage = percentage;
    }

    applyCoupon(code) {
        if (code === null || code === undefined) {
            this.couponCode = null;
            return false;
        }
        if (typeof code !== 'string') {
            throw new Error('Coupon code must be a string.');
        }
        this.couponCode = code.trim().toUpperCase();
        return this.couponCode === COUPON_DANSAUDE10;
    }

    calculate() {
        // Exams already covered by a selected checkup are priced at zero
        // (order independent); they still count for fasting and turnaround.
        const covered = new Set();
        this.exams.forEach(exam => {
            (exam.included || []).forEach(id => covered.add(id));
        });

        let subtotalCents = 0;
        let fastingHours = 0;
        let turnaroundDays = 0;

        this.exams.forEach(exam => {
            if (!covered.has(exam.id)) {
                subtotalCents += Math.round(exam.price * 100);
            }
            fastingHours = Math.max(fastingHours, exam.fastingHours || 0);
            turnaroundDays = Math.max(turnaroundDays, exam.turnaroundDays || 0);
        });

        let discountCents = 0;
        let discountType = null;

        if (this.insuranceCopayPercentage !== null) {
            // Copay is the percentage the patient pays; discount is what insurance covers
            const patientCents = Math.round(subtotalCents * this.insuranceCopayPercentage / 100);
            discountCents = subtotalCents - patientCents;
            discountType = 'convenio';
        } else if (this.couponCode === COUPON_DANSAUDE10) {
            discountCents = Math.round(subtotalCents * 0.10);
            discountType = 'cupom_dansaude10';
        }

        return {
            subtotal: subtotalCents / 100,
            discount: discountCents / 100,
            total: (subtotalCents - discountCents) / 100,
            fastingHours,
            turnaroundDays,
            discountType
        };
    }
}

if (isNode) { module.exports = Quote; } else { global.ClinicaQuote = Quote; }
})(typeof window !== 'undefined' ? window : this);

