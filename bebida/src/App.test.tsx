import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Catalog } from './components/Catalog'
import App from './App'

describe('BebidaApp', () => {
  it('renders the header correctly', () => {
    render(<App />)
    expect(screen.getByText('BebidaApp')).toBeInTheDocument()
  })

  it('updates cart count when adding a drink', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Carrinho (0)')).toBeInTheDocument()

    const addButtons = screen.getAllByRole('button', { name: 'Adicionar' })
    await user.click(addButtons[0])

    expect(screen.getByText('Carrinho (1)')).toBeInTheDocument()
  })

  it('renders catalog and filters drinks by search case-insensitively and ignoring accents', async () => {
    const user = userEvent.setup()
    render(<Catalog />)

    expect(screen.getByText('IPA Artesanal')).toBeInTheDocument()
    expect(screen.getByText('Água Tônica')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Buscar bebidas...')
    // Lowercase 'ipa' with trailing space
    await user.type(searchInput, 'ipa ')

    expect(screen.getByText('IPA Artesanal')).toBeInTheDocument()
    expect(screen.queryByText('Cabernet Sauvignon')).not.toBeInTheDocument()

    await user.clear(searchInput)

    // Unaccented 'agua' matching 'Água'
    await user.type(searchInput, 'agua tonica')
    expect(screen.getByText('Água Tônica')).toBeInTheDocument()
    expect(screen.queryByText('IPA Artesanal')).not.toBeInTheDocument()
  })

  it('filters drinks by category and combined filters, and can reset', async () => {
    const user = userEvent.setup()
    render(<Catalog />)

    const wineCategory = screen.getByRole('button', { name: 'Vinho' })
    await user.click(wineCategory)

    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument()
    expect(screen.queryByText('IPA Artesanal')).not.toBeInTheDocument()

    // Combined with search
    const searchInput = screen.getByPlaceholderText('Buscar bebidas...')
    await user.type(searchInput, 'Cabernet')
    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument()

    // Reset back to Todos
    const todosCategory = screen.getByRole('button', { name: 'Todos' })
    await user.click(todosCategory)
    await user.clear(searchInput)

    expect(screen.getByText('IPA Artesanal')).toBeInTheDocument()
    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument()
  })

  it('renders empty state when no drinks match', async () => {
    const user = userEvent.setup()
    render(<Catalog />)

    const searchInput = screen.getByPlaceholderText('Buscar bebidas...')
    await user.type(searchInput, 'ProdutoInexistente')

    expect(
      screen.getByText('Nenhuma bebida encontrada com os filtros atuais.'),
    ).toBeInTheDocument()
  })

  it('formats price correctly', () => {
    render(<Catalog />)

    // IPA is 18.5
    expect(screen.getByText('R$ 18,50')).toBeInTheDocument()
    // Cabernet is 85.0
    expect(screen.getByText('R$ 85,00')).toBeInTheDocument()
  })
})
