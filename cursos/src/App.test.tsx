import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';
import * as enrollmentDomain from './domain/enrollment';

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Dan Academy/i })).toBeInTheDocument();
  });

  describe('Tracks & Filtering', () => {
    it('filters tracks by level', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      expect(screen.getByRole('heading', { name: /React Básico/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /React Hooks/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Gerenciamento de Estado Avançado/i })).toBeInTheDocument();
      
      const select = screen.getByLabelText(/Nível:/i);
      await user.selectOptions(select, 'iniciante');
      
      expect(screen.getByRole('heading', { name: /React Básico/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /React Hooks/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Gerenciamento de Estado Avançado/i })).not.toBeInTheDocument();
      
      await user.selectOptions(select, 'avancado');
      expect(screen.queryByRole('heading', { name: /React Básico/i })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Gerenciamento de Estado Avançado/i })).toBeInTheDocument();
    });
  });

  describe('Lessons & Quiz Progress', () => {
    it('allows toggling lessons and answering quiz', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const trackCard = screen.getByRole('heading', { name: /React Básico/i }).parentElement!;
      const card = within(trackCard);
      
      const lessonCheckbox = card.getByLabelText(/O que é React\?/i);
      expect(lessonCheckbox).not.toBeChecked();
      await user.click(lessonCheckbox);
      expect(lessonCheckbox).toBeChecked();
      
      const quizSelects = card.getAllByRole('combobox').filter(s => s.getAttribute('aria-label') === null && s.parentElement?.textContent?.includes('Questão'));
      expect(quizSelects[0]).toHaveValue('wrong');
      
      await user.selectOptions(quizSelects[0], 'correct');
      expect(quizSelects[0]).toHaveValue('correct');
    });
  });

  describe('Certificate Issuance', () => {
    it('shows error if trying to issue certificate without completing track', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const trackCard = screen.getByRole('heading', { name: /React Básico/i }).parentElement!;
      const card = within(trackCard);
      
      await user.click(card.getByRole('button', { name: /Emitir Certificado/i }));
      expect(card.getByText(/Não foi possível emitir o certificado/i)).toBeInTheDocument();
    });

    it('issues certificate successfully when 100% lessons and >=70% quiz completed', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const trackCard = screen.getByRole('heading', { name: /React Básico/i }).parentElement!;
      const card = within(trackCard);
      
      // Check all lessons
      await user.click(card.getByLabelText(/O que é React\?/i));
      await user.click(card.getByLabelText(/Componentes e Props/i));
      
      // Answer all quiz correctly
      const quizSelects = card.getAllByRole('combobox').filter(s => s.getAttribute('aria-label') === null && s.parentElement?.textContent?.includes('Questão'));
      for (const select of quizSelects) {
        await user.selectOptions(select, 'correct');
      }
      
      await user.click(card.getByRole('button', { name: /Emitir Certificado/i }));
      
      expect(card.getByText(/Certificado:/i)).toBeInTheDocument();
      expect(card.getByText(/ACD-/i)).toBeInTheDocument();
      expect(card.queryByText(/Não foi possível emitir o certificado/i)).not.toBeInTheDocument();
    });

    it('hides certificate if progress is undone', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const trackCard = screen.getByRole('heading', { name: /React Básico/i }).parentElement!;
      const card = within(trackCard);
      
      // Complete track
      await user.click(card.getByLabelText(/O que é React\?/i));
      await user.click(card.getByLabelText(/Componentes e Props/i));
      const quizSelects = card.getAllByRole('combobox').filter(s => s.getAttribute('aria-label') === null && s.parentElement?.textContent?.includes('Questão'));
      for (const select of quizSelects) {
        await user.selectOptions(select, 'correct');
      }
      await user.click(card.getByRole('button', { name: /Emitir Certificado/i }));
      
      expect(card.getByText(/Certificado:/i)).toBeInTheDocument();
      
      // Undo lesson
      await user.click(card.getByLabelText(/O que é React\?/i));
      
      expect(card.queryByText(/Certificado:/i)).not.toBeInTheDocument();
    });
  });

  describe('Cart & Quoting', () => {
    it('computes basic totals and allows removing', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      expect(screen.getByText(/Seu carrinho está vazio/i)).toBeInTheDocument();
      
      const trackCard = screen.getByRole('heading', { name: /React Básico/i }).parentElement!;
      const card = within(trackCard);
      
      await user.click(card.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      
      const cartSection = screen.getByRole('heading', { name: /Carrinho de Matrícula/i }).parentElement!;
      const cart = within(cartSection);
      
      expect(cart.getByText(/Subtotal:/i)).toBeInTheDocument();
      expect(cart.getAllByText(/R\$ 1000/i).length).toBeGreaterThan(0);
      expect(cart.getByText(/^Total:/i)).toBeInTheDocument();
      
      // Remove
      await user.click(card.getByRole('button', { name: /Remover do Carrinho/i }));
      expect(screen.getByText(/Seu carrinho está vazio/i)).toBeInTheDocument();
    });

    it('applies student scholarship in avulsa', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const card = within(screen.getByRole('heading', { name: /React Básico/i }).parentElement!);
      await user.click(card.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      
      const cart = within(screen.getByRole('heading', { name: /Carrinho de Matrícula/i }).parentElement!);
      await user.click(cart.getByLabelText(/Bolsa Estudante/i));
      
      // 1000 - 15% = 850
      expect(cart.getByText(/R\$ 150/i)).toBeInTheDocument(); // discount
      expect(cart.getByText(/R\$ 850/i)).toBeInTheDocument(); // total
      expect(cart.getByText(/STUDENT_15/i)).toBeInTheDocument();
    });

    it('applies DANEDU20 coupon in avulsa', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const card = within(screen.getByRole('heading', { name: /React Básico/i }).parentElement!);
      await user.click(card.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      
      const cart = within(screen.getByRole('heading', { name: /Carrinho de Matrícula/i }).parentElement!);
      const couponInput = cart.getByPlaceholderText(/DANEDU20/i);
      
      await user.type(couponInput, 'DANEDU20');
      
      // 1000 - 20% = 800
      expect(cart.getByText(/R\$ 200/i)).toBeInTheDocument();
      expect(cart.getByText(/R\$ 800/i)).toBeInTheDocument();
      expect(cart.getByText(/COUPON_DANEDU20/i)).toBeInTheDocument();
    });

    it('handles passaporte modality with enough tracks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const card1 = within(screen.getByRole('heading', { name: /React Básico/i }).parentElement!);
      const card2 = within(screen.getByRole('heading', { name: /React Hooks/i }).parentElement!);
      
      await user.click(card1.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      await user.click(card2.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      
      const cart = within(screen.getByRole('heading', { name: /Carrinho de Matrícula/i }).parentElement!);
      const modalitySelect = cart.getByLabelText(/Modalidade/i);
      await user.selectOptions(modalitySelect, 'passaporte');
      
      // 2000 - 25% = 1500
      expect(cart.getByText(/R\$ 2000/i)).toBeInTheDocument();
      expect(cart.getByText(/R\$ 500/i)).toBeInTheDocument();
      expect(cart.getByText(/R\$ 1500/i)).toBeInTheDocument();
      expect(cart.getByText(/PASSAPORTE_25/i)).toBeInTheDocument();
      
      // Avulsa options should be hidden
      expect(cart.queryByLabelText(/Bolsa Estudante/i)).not.toBeInTheDocument();
    });

    it('shows error if passaporte selected with only 1 track', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const card1 = within(screen.getByRole('heading', { name: /React Básico/i }).parentElement!);
      await user.click(card1.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      
      const cart = within(screen.getByRole('heading', { name: /Carrinho de Matrícula/i }).parentElement!);
      const modalitySelect = cart.getByLabelText(/Modalidade/i);
      
      await user.selectOptions(modalitySelect, 'passaporte');
      
      // The discount will be 0
      expect(cart.getAllByText(/R\$ 1000/i).length).toBeGreaterThan(0);
      expect(cart.getByText(/R\$ 0/i)).toBeInTheDocument(); // total Discount
    });

    it('renders quote error message if quoteEnrollment throws', async () => {
      const user = userEvent.setup();
      vi.spyOn(enrollmentDomain, 'quoteEnrollment').mockImplementation(() => {
        throw new Error('Simulated quote error');
      });

      render(<App />);
      
      const card = within(screen.getByRole('heading', { name: /React Básico/i }).parentElement!);
      await user.click(card.getByRole('button', { name: /Adicionar ao Carrinho/i }));
      
      const cart = within(screen.getByRole('heading', { name: /Carrinho de Matrícula/i }).parentElement!);
      expect(cart.getByText(/Erro ao cotar matrícula: Simulated quote error/i)).toBeInTheDocument();
    });
  });
});
