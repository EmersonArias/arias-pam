export interface RegisterColumn {
  key: string
  title: string
  width?: string
}

export interface RegisterRow {
  id: string
  [key: string]: unknown
}