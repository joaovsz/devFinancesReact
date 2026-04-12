export type Subcategory = {
  id: string
  name: string
}

export type Category = {
  id: string
  name: string
  subcategories: Subcategory[]
}
