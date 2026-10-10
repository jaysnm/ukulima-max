import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Plus, Truck, Pencil, Trash2 } from 'lucide-react'
import { SUPPLIERS } from '../../graphql/queries'
import { CREATE_SUPPLIER, UPDATE_SUPPLIER, DELETE_SUPPLIER } from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import SubmitButton from '../../components/ui/SubmitButton'

const emptyForm = { name: '', phone: '', location: '', notes: '', productUrl: '' }

export default function SuppliersPage() {
  const { canEditCatalog } = useFarm()
  const { data, refetch } = useQuery(SUPPLIERS)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)

  const [createSupplier, { loading: creating }] = useMutation(CREATE_SUPPLIER, {
    onCompleted: () => {
      refetch()
      setShowModal(false)
    },
  })
  const [updateSupplier, { loading: updating }] = useMutation(UPDATE_SUPPLIER, {
    onCompleted: () => {
      refetch()
      setEditingSupplier(null)
    },
  })
  const [deleteSupplier] = useMutation(DELETE_SUPPLIER, { onCompleted: () => refetch() })

  const suppliers = data?.suppliers ?? []

  const handleDelete = (s: any) => {
    if (
      !window.confirm(
        `Delete supplier "${s.name}"? Purchases and records that reference them will keep their history but show no supplier.`
      )
    )
      return
    deleteSupplier({ variables: { supplierId: s.id } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => {
            setForm(emptyForm)
            setShowModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        >
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s: any) => (
          <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-primary-100 rounded-xl p-2.5">
                  <Truck className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.phone || 'No phone listed'}</p>
                  <p className="text-xs text-gray-400">{s.location || 'No location listed'}</p>
                </div>
              </div>
              {canEditCatalog && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingSupplier(s)
                      setForm({
                        name: s.name,
                        phone: s.phone ?? '',
                        location: s.location ?? '',
                        notes: s.notes ?? '',
                        productUrl: s.productUrl ?? '',
                      })
                    }}
                    className="text-gray-400 hover:text-primary-600"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {s.notes && (
              <p className="text-xs text-gray-400 mt-3 pt-3 border-t truncate" title={s.notes}>
                {s.notes}
              </p>
            )}
          </div>
        ))}
        {suppliers.length === 0 && (
          <p className="text-gray-400 text-sm col-span-3">
            No suppliers added yet. Add one here, or inline from any purchase form.
          </p>
        )}
      </div>

      {(showModal || editingSupplier) && (
        <Modal
          title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
          onClose={() => {
            setShowModal(false)
            setEditingSupplier(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (editingSupplier) {
                updateSupplier({ variables: { supplierId: editingSupplier.id, input: form } })
              } else {
                createSupplier({ variables: { input: form } })
              }
            }}
            className="space-y-4"
          >
            <F label="Name" required>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inp}
                placeholder="e.g. Wakulima Agrovet"
              />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 0712 345 678"
                />
              </F>
              <F label="Location">
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className={inp}
                  placeholder="e.g. Nakuru town"
                />
              </F>
            </div>
            <F label="Website / Product URL">
              <input
                type="url"
                value={form.productUrl}
                onChange={(e) => setForm((f) => ({ ...f, productUrl: e.target.value }))}
                className={inp}
                placeholder="https://..."
              />
            </F>
            <F label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <SubmitButton loading={editingSupplier ? updating : creating} className={btn}>
              {editingSupplier ? 'Save Changes' : 'Save Supplier'}
            </SubmitButton>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
function F({ label, children, required }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && ' *'}
      </label>
      {children}
    </div>
  )
}
const inp =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
const btn =
  'w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors'
