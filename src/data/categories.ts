import { Category } from "../types/finance"

export const defaultCategories: Category[] = [
  {
    id: "rendas",
    name: "Rendas",
    subcategories: [
      { id: "faturamento-pj", name: "Faturamento PJ" },
      { id: "recebiveis-familiares", name: "Recebíveis Familiares" },
      { id: "rendimentos", name: "Rendimentos" }
    ]
  },
  {
    id: "moradia",
    name: "Moradia",
    subcategories: [
      { id: "aluguel", name: "Aluguel" },
      { id: "condominio", name: "Condomínio" },
      { id: "energia", name: "Energia" },
      { id: "internet", name: "Internet" }
    ]
  },
  {
    id: "alimentacao",
    name: "Alimentação",
    subcategories: [
      { id: "mercado", name: "Mercado" },
      { id: "delivery-ifood", name: "Delivery/iFood" }
    ]
  },
  {
    id: "saude-bem-estar",
    name: "Saúde e Bem-Estar",
    subcategories: [
      { id: "plano-saude", name: "Plano de Saúde" },
      { id: "terapias", name: "Terapias Nicolas" },
      { id: "academia", name: "Academia" }
    ]
  },
  {
    id: "educacao-carreira",
    name: "Educação e Carreira",
    subcategories: [
      { id: "cursos-assinaturas", name: "Cursos/Assinaturas" },
      { id: "autoescola", name: "Autoescola" },
      { id: "ferramentas", name: "Ferramentas" }
    ]
  },
  {
    id: "lazer-assinaturas",
    name: "Lazer e Assinaturas",
    subcategories: [
      { id: "streaming", name: "Streaming e assinaturas" },
      { id: "vestuario", name: "Vestuário" }
    ]
  },
  {
    id: "impostos-empresa",
    name: "Impostos e Empresa",
    subcategories: [
      { id: "das", name: "DAS (Simples Nacional)" },
      { id: "contabilidade", name: "Contabilidade" }
    ]
  },
  {
    id: "bens-equipamentos",
    name: "Bens e Equipamentos",
    subcategories: [
      { id: "eletronicos", name: "Eletrônicos" },
      { id: "moveis", name: "Móveis" }
    ]
  },
  {
    id: "patrimonio-metas",
    name: "Patrimônio e Metas",
    subcategories: [
      { id: "consorcio", name: "Consórcio" },
      { id: "reserva-emergencia", name: "Reserva de Emergência" }
    ]
  }
]
