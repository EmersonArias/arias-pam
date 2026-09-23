export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'image'

export interface TemplateField {
  id: string
  templateId: string
  name: string
  fieldType: FieldType
  required: boolean
}