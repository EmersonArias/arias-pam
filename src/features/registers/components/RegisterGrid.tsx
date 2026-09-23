import type {
  RegisterColumn,
  RegisterRow,
} from '../types/register'

interface Props {
  title: string
  columns: RegisterColumn[]
  rows: RegisterRow[]
}

export default function RegisterGrid({
  title,
  columns,
  rows,
}: Props) {
  return (
    <div className="p-6">

      <div className="mb-6 flex items-center justify-between">

        <h1 className="text-2xl font-bold">
          {title}
        </h1>

        <button
          className="
            rounded-lg
            bg-blue-600
            px-4
            py-2
            text-white
          "
        >
          Nuevo
        </button>

      </div>

      <div className="overflow-auto rounded-xl border bg-white">

        <table className="w-full border-collapse">

          <thead>

            <tr className="bg-slate-100">

              {columns.map((column) => (
                <th
                  key={column.key}
                  className="
                    border-b
                    p-3
                    text-left
                    font-semibold
                  "
                >
                  {column.title}
                </th>
              ))}

            </tr>

          </thead>

          <tbody>

            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="
                      border-b
                      p-3
                    "
                  >
                    {String(
                      row[column.key] ?? ''
                    )}
                  </td>
                ))}
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}