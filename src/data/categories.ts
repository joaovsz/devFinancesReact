import { Category } from "../types/finance"

export const defaultCategories: Category[] = [
  {
    id: "rendas",
    name: "Rendas",
    subcategories: [
      { id: "faturamento-pj", name: "Faturamento PJ" },
      { id: "salario-clt", name: "Salário CLT" },
      { id: "freelas", name: "Freelas e bicos" },
      { id: "bonus-premiacoes", name: "Bônus e premiações" },
      { id: "comissoes", name: "Comissões" },
      { id: "vale-alimentacao", name: "Vale alimentação" },
      { id: "vale-refeicao", name: "Vale refeição" },
      { id: "vale-transporte", name: "Vale transporte" },
      { id: "ajuda-custo", name: "Ajuda de custo" },
      { id: "auxilio-home-office", name: "Auxílio home office" },
      { id: "renda-variavel", name: "Renda variável" },
      { id: "dividendos-juros", name: "Dividendos e juros" },
      { id: "venda-ativos", name: "Venda de bens ou ativos" },
      { id: "aluguel-recebido", name: "Aluguel recebido" },
      { id: "reembolsos", name: "Reembolsos" },
      { id: "cashback", name: "Cashback e benefícios" },
      { id: "recebiveis-familiares", name: "Recebíveis Familiares" },
      { id: "rendimentos", name: "Rendimentos" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "moradia",
    name: "Moradia",
    subcategories: [
      { id: "aluguel", name: "Aluguel" },
      { id: "financiamento-imovel", name: "Financiamento imobiliário" },
      { id: "condominio", name: "Condomínio" },
      { id: "energia", name: "Energia" },
      { id: "agua", name: "Água" },
      { id: "gas", name: "Gás" },
      { id: "internet", name: "Internet" },
      { id: "manutencao-casa", name: "Manutenção da casa" },
      { id: "limpeza", name: "Limpeza" },
      { id: "seguro-residencial", name: "Seguro residencial" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "alimentacao",
    name: "Alimentação",
    subcategories: [
      { id: "mercado", name: "Mercado" },
      { id: "delivery-ifood", name: "Delivery/iFood" },
      { id: "restaurantes", name: "Restaurantes" },
      { id: "cafeterias", name: "Cafeterias" },
      { id: "padaria", name: "Padaria" },
      { id: "hortifruti", name: "Hortifruti" },
      { id: "suplementos", name: "Suplementos" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "saude-bem-estar",
    name: "Saúde e Bem-Estar",
    subcategories: [
      { id: "plano-saude", name: "Plano de Saúde" },
      { id: "consultas", name: "Consultas" },
      { id: "exames", name: "Exames" },
      { id: "medicamentos", name: "Medicamentos" },
      { id: "terapia", name: "Terapia" },
      { id: "odontologia", name: "Odontologia" },
      { id: "academia", name: "Academia" },
      { id: "esportes", name: "Esportes" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "educacao-carreira",
    name: "Educação e Carreira",
    subcategories: [
      { id: "cursos-assinaturas", name: "Cursos/Assinaturas" },
      { id: "autoescola", name: "Autoescola" },
      { id: "ferramentas", name: "Ferramentas" },
      { id: "livros", name: "Livros" },
      { id: "certificacoes", name: "Certificações" },
      { id: "eventos", name: "Eventos" },
      { id: "mentorias", name: "Mentorias" },
      { id: "idiomas", name: "Idiomas" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "lazer-assinaturas",
    name: "Lazer e Assinaturas",
    subcategories: [
      { id: "streaming", name: "Streaming e assinaturas" },
      { id: "vestuario", name: "Vestuário" },
      { id: "cinema-teatro", name: "Cinema e teatro" },
      { id: "shows-eventos", name: "Shows e eventos" },
      { id: "games", name: "Games" },
      { id: "viagens", name: "Viagens" },
      { id: "bares", name: "Bares" },
      { id: "hobbies", name: "Hobbies" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "impostos-empresa",
    name: "Impostos e Empresa",
    subcategories: [
      { id: "das", name: "DAS (Simples Nacional)" },
      { id: "contabilidade", name: "Contabilidade" },
      { id: "irpf", name: "IRPF" },
      { id: "iss", name: "ISS" },
      { id: "inss", name: "INSS" },
      { id: "certificado-digital", name: "Certificado digital" },
      { id: "taxas-bancarias", name: "Taxas bancárias" },
      { id: "software-empresa", name: "Software da empresa" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "bens-equipamentos",
    name: "Bens e Equipamentos",
    subcategories: [
      { id: "eletronicos", name: "Eletrônicos" },
      { id: "moveis", name: "Móveis" },
      { id: "computador", name: "Computador" },
      { id: "celular", name: "Celular" },
      { id: "perifericos", name: "Periféricos" },
      { id: "eletrodomesticos", name: "Eletrodomésticos" },
      { id: "manutencao-equipamentos", name: "Manutenção de equipamentos" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "patrimonio-metas",
    name: "Patrimônio e Metas",
    subcategories: [
      { id: "consorcio", name: "Consórcio" },
      { id: "reserva-emergencia", name: "Reserva de Emergência" },
      { id: "investimentos", name: "Investimentos" },
      { id: "aposentadoria", name: "Aposentadoria" },
      { id: "metas-curto-prazo", name: "Metas de curto prazo" },
      { id: "metas-longo-prazo", name: "Metas de longo prazo" },
      { id: "amortizacao-dividas", name: "Amortização de dívidas" },
      { id: "outros", name: "Outros" }
    ]
  },
  {
    id: "outros",
    name: "Outros",
    subcategories: [
      { id: "presentes", name: "Presentes" },
      { id: "doacoes", name: "Doações" },
      { id: "pets", name: "Pets" },
      { id: "documentos", name: "Documentos" },
      { id: "imprevistos", name: "Imprevistos" },
      { id: "outros", name: "Outros" }
    ]
  }
]
