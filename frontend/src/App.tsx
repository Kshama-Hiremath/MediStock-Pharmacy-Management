
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import Suppliers from './Suppliers'
import Orders from './Orders'

type Medicine = {
  id: number
  name: string
  category: string
  stock: number
  price: number
  expiry: string
}

type ApiMedicine = {
  id: number
  name: string
  category: string
  stock: number
  price: number
  expiryDate?: string | null
}

type ExpiryStatus = 'expired' | 'soon' | 'valid' | 'unknown'

const API_URL = 'http://localhost:8081/api/medicines'
const EXPIRY_WARNING_DAYS = 30

function mapMedicine(item: ApiMedicine): Medicine {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    stock: item.stock,
    price: Number(item.price),
    expiry: item.expiryDate ?? 'Not set',
  }
}

function parseLocalDate(dateString: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  date.setHours(0, 0, 0, 0)
  return date
}

function getExpiryStatus(expiry: string): ExpiryStatus {
  if (!expiry || expiry === 'Not set') return 'unknown'

  const expiryDate = parseLocalDate(expiry)
  if (!expiryDate) return 'unknown'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysUntilExpiry = Math.round(
    (expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) return 'soon'
  return 'valid'
}

function getExpiryLabel(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'Expired'
    case 'soon':
      return 'Expiring soon'
    case 'valid':
      return 'Valid'
    default:
      return 'No expiry date'
  }
}

function formatExpiryDate(expiry: string): string {
  if (!expiry || expiry === 'Not set') return 'Not set'

  const date = parseLocalDate(expiry)
  if (!date) return 'Invalid date'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function App() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [search, setSearch] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('10')
  const [price, setPrice] = useState('50')
  const [expiryDate, setExpiryDate] = useState('')

  const [editingMedicine, setEditingMedicine] =
    useState<Medicine | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editStock, setEditStock] = useState('0')
  const [editPrice, setEditPrice] = useState('0')
  const [editExpiry, setEditExpiry] = useState('')

  async function loadMedicines() {
    setLoading(true)
    setApiError('')

    try {
      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error(`Failed to load medicines (${response.status})`)
      }

      const data: ApiMedicine[] = await response.json()
      setMedicines(data.map(mapMedicine))
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Could not connect to the pharmacy server.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMedicines()
  }, [])

  const lowStock = medicines.filter(
    (medicine) => medicine.stock < 20,
  ).length

  const inventoryValue = medicines.reduce(
    (total, medicine) => total + medicine.stock * medicine.price,
    0,
  )

  const totalUnits = medicines.reduce(
    (sum, medicine) => sum + medicine.stock,
    0,
  )

  const expiredMedicines = medicines.filter(
    (medicine) => getExpiryStatus(medicine.expiry) === 'expired',
  )

  const expiringSoonMedicines = medicines.filter(
    (medicine) => getExpiryStatus(medicine.expiry) === 'soon',
  )

  const filteredMedicines = medicines.filter((medicine) =>
    `${medicine.name} ${medicine.category}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  )

  async function addMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          stock: Number(stock),
          price: Number(price),
          expiryDate: expiryDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`Could not save medicine (${response.status})`)
      }

      const saved: ApiMedicine = await response.json()
      setMedicines((current) => [...current, mapMedicine(saved)])

      setName('')
      setCategory('')
      setStock('10')
      setPrice('50')
      setExpiryDate('')
      setShowForm(false)
      setActivePage('Medicines')
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Could not save medicine.',
      )
    }
  }

  function startEditing(medicine: Medicine) {
    setEditingMedicine(medicine)
    setEditName(medicine.name)
    setEditCategory(medicine.category)
    setEditStock(String(medicine.stock))
    setEditPrice(String(medicine.price))
    setEditExpiry(medicine.expiry === 'Not set' ? '' : medicine.expiry)
    setApiError('')
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingMedicine) return

    setApiError('')

    try {
      const response = await fetch(`${API_URL}/${editingMedicine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
          stock: Number(editStock),
          price: Number(editPrice),
          expiryDate: editExpiry || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`Could not update medicine (${response.status})`)
      }

      const updated: ApiMedicine = await response.json()

      setMedicines((current) =>
        current.map((medicine) =>
          medicine.id === updated.id ? mapMedicine(updated) : medicine,
        ),
      )

      setEditingMedicine(null)
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Could not update medicine.',
      )
    }
  }

  async function deleteMedicine(id: number) {
    if (!window.confirm('Are you sure you want to delete this medicine?')) {
      return
    }

    setApiError('')

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Could not delete medicine (${response.status})`)
      }

      setMedicines((current) =>
        current.filter((medicine) => medicine.id !== id),
      )
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Could not delete medicine.',
      )
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✚</div>
          <div>
            <strong>MediStock</strong>
            <span>PHARMACY MANAGEMENT</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        {['Dashboard', 'Medicines', 'Inventory', 'Suppliers', 'Orders'].map(
          (item, index) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activePage === item ? 'active' : ''}`}
              onClick={() => setActivePage(item)}
            >
              <span className="nav-icon">
                {['▦', '▤', '▥', '♧', '⇄'][index]}
              </span>
              {item}
              {item === 'Medicines' && (
                <span className="nav-count">{medicines.length}</span>
              )}
            </button>
          ),
        )}

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-symbol">✦</div>
            <strong>Need assistance?</strong>
            <p>Manage your pharmacy inventory with confidence.</p>
          </div>

          <div className="profile">
            <div className="avatar">PH</div>
            <div>
              <strong>Pharmacy Admin</strong>
              <span>Administrator</span>
            </div>
            <span className="profile-dots">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {activePage}
          </div>
          <div className="topbar-right">
            <span className="status-dot" /> System overview
            <div className="top-avatar">PH</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Suppliers' ? (
            <Suppliers />
          ) : activePage === 'Orders' ? (
            <Orders />
          ) : (
            <>
              {apiError && (
                <div
                  role="alert"
                  style={{
                    padding: '12px 16px',
                    marginBottom: 16,
                    color: '#b42318',
                    background: '#fef3f2',
                    borderRadius: 8,
                  }}
                >
                  {apiError}
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ marginLeft: 12 }}
                    onClick={() => void loadMedicines()}
                  >
                    Retry
                  </button>
                </div>
              )}

              <section className="welcome-row">
                <div>
                  <div className="eyebrow">PHARMACY OPERATIONS</div>
                  <h1>
                    {activePage === 'Dashboard'
                      ? 'Good day, Admin 👋'
                      : activePage === 'Inventory'
                        ? 'Inventory Overview'
                        : 'Medicine Management'}
                  </h1>
                  <p className="subtitle">
                    {activePage === 'Dashboard'
                      ? 'Here is what is happening with your pharmacy today.'
                      : activePage === 'Inventory'
                        ? 'Review stock quantities, stock value, and expiry dates.'
                        : 'Add, search, edit, and maintain your medicine catalogue.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                >
                  <span>＋</span> Add medicine
                </button>
              </section>

              {activePage === 'Dashboard' && (
                <section className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total medicines</span>
                      <span className="stat-icon blue">▤</span>
                    </div>
                    <div className="stat-value">
                      {medicines.length.toString().padStart(2, '0')}
                    </div>
                    <div className="stat-foot">
                      <span className="positive">●</span> Medicines in catalogue
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Units in stock</span>
                      <span className="stat-icon purple">▦</span>
                    </div>
                    <div className="stat-value">{totalUnits}</div>
                    <div className="stat-foot">Across all listed medicines</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Low stock alerts</span>
                      <span className="stat-icon orange">⚠</span>
                    </div>
                    <div className="stat-value">
                      {lowStock.toString().padStart(2, '0')}
                    </div>
                    <div className="stat-foot">
                      <span className="warning-text">Needs attention</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Stock value</span>
                      <span className="stat-icon green">₹</span>
                    </div>
                    <div className="stat-value">
                      ₹
                      {inventoryValue.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="stat-foot">Based on listed unit prices</div>
                  </div>
                </section>
              )}

              {activePage === 'Dashboard' && (
                <section
                  aria-label="Medicine expiry alerts"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    marginTop: 20,
                    marginBottom: 20,
                  }}
                >
                  <div
                    className="stat-card"
                    style={{
                      borderLeft: '4px solid #dc2626',
                      background:
                        expiredMedicines.length > 0 ? '#fff7f7' : '#fff',
                    }}
                  >
                    <div className="stat-top">
                      <span>Expired medicines</span>
                      <span className="stat-icon orange">!</span>
                    </div>
                    <div
                      className="stat-value"
                      style={{
                        color:
                          expiredMedicines.length > 0 ? '#dc2626' : undefined,
                      }}
                    >
                      {expiredMedicines.length.toString().padStart(2, '0')}
                    </div>
                    <div className="stat-foot">
                      {expiredMedicines.length > 0
                        ? 'Remove from sale and review'
                        : 'No expired medicines detected'}
                    </div>
                  </div>

                  <div
                    className="stat-card"
                    style={{
                      borderLeft: '4px solid #d97706',
                      background:
                        expiringSoonMedicines.length > 0 ? '#fffbeb' : '#fff',
                    }}
                  >
                    <div className="stat-top">
                      <span>Expiring within 30 days</span>
                      <span className="stat-icon orange">◷</span>
                    </div>
                    <div
                      className="stat-value"
                      style={{
                        color:
                          expiringSoonMedicines.length > 0
                            ? '#b45309'
                            : undefined,
                      }}
                    >
                      {expiringSoonMedicines.length.toString().padStart(2, '0')}
                    </div>
                    <div className="stat-foot">
                      {expiringSoonMedicines.length > 0
                        ? 'Review these medicines soon'
                        : 'No upcoming expiry alerts'}
                    </div>
                  </div>
                </section>
              )}

              {activePage === 'Dashboard' &&
                (expiredMedicines.length > 0 ||
                  expiringSoonMedicines.length > 0) && (
                  <section
                    className="content-card"
                    style={{ marginBottom: 20, padding: 20 }}
                  >
                    <div className="section-heading">
                      <div>
                        <h2>Expiry attention required</h2>
                        <p>
                          Review these records and follow your pharmacy's safe
                          stock-handling procedures.
                        </p>
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>MEDICINE</th>
                            <th>STOCK</th>
                            <th>EXPIRY DATE</th>
                            <th>ALERT</th>
                            <th>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...expiredMedicines, ...expiringSoonMedicines].map(
                            (medicine) => {
                              const status = getExpiryStatus(medicine.expiry)

                              return (
                                <tr key={`expiry-${medicine.id}`}>
                                  <td>
                                    <div className="medicine-name">
                                      {medicine.name}
                                    </div>
                                    <div className="medicine-id">
                                      MED-{medicine.id.toString().slice(-4)}
                                    </div>
                                  </td>
                                  <td>{medicine.stock}</td>
                                  <td>{formatExpiryDate(medicine.expiry)}</td>
                                  <td>
                                    <span
                                      className={`pill ${
                                        status === 'expired'
                                          ? 'pill-low'
                                          : 'pill-good'
                                      }`}
                                      style={
                                        status === 'soon'
                                          ? {
                                              background: '#fff4db',
                                              color: '#92400e',
                                            }
                                          : undefined
                                      }
                                    >
                                      <span />
                                      {getExpiryLabel(status)}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      onClick={() => startEditing(medicine)}
                                    >
                                      Review
                                    </button>
                                  </td>
                                </tr>
                              )
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

              {activePage === 'Inventory' && (
                <section className="stats-grid" style={{ marginBottom: 20 }}>
                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total stock units</span>
                      <span className="stat-icon purple">▦</span>
                    </div>
                    <div className="stat-value">{totalUnits}</div>
                    <div className="stat-foot">Units across all medicines</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Low-stock items</span>
                      <span className="stat-icon orange">⚠</span>
                    </div>
                    <div className="stat-value">{lowStock}</div>
                    <div className="stat-foot">Fewer than 20 units</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Expired items</span>
                      <span className="stat-icon orange">!</span>
                    </div>
                    <div className="stat-value">{expiredMedicines.length}</div>
                    <div className="stat-foot">Require review</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Inventory value</span>
                      <span className="stat-icon green">₹</span>
                    </div>
                    <div className="stat-value">
                      ₹
                      {inventoryValue.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="stat-foot">Based on current unit prices</div>
                  </div>
                </section>
              )}

              <section className="content-card">
                <div className="section-heading">
                  <div>
                    <h2>
                      {activePage === 'Inventory'
                        ? 'Current stock levels'
                        : 'Medicine catalogue'}
                    </h2>
                    <p>
                      {activePage === 'Inventory'
                        ? 'Review available units, low-stock items, and expiry status.'
                        : 'Manage medicine details, prices, and expiry dates.'}
                    </p>
                  </div>

                  <label className="search-box">
                    <span>⌕</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search medicines..."
                    />
                  </label>
                </div>

                {loading ? (
                  <p style={{ padding: 24 }}>Loading medicines...</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>MEDICINE</th>
                          <th>CATEGORY</th>
                          <th>STOCK LEVEL</th>
                          <th>UNIT PRICE</th>
                          <th>EXPIRY DATE</th>
                          <th>STATUS</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMedicines.map((medicine) => {
                          const expiryStatus = getExpiryStatus(medicine.expiry)

                          return (
                            <tr key={medicine.id}>
                              <td>
                                <div className="medicine-name">
                                  {medicine.name}
                                </div>
                                <div className="medicine-id">
                                  MED-{medicine.id.toString().slice(-4)}
                                </div>
                              </td>

                              <td>{medicine.category}</td>

                              <td>
                                <div className="stock-cell">
                                  <div className="stock-track">
                                    <div
                                      className={`stock-fill ${
                                        medicine.stock < 20 ? 'low' : ''
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          medicine.stock,
                                          100,
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span>{medicine.stock}</span>
                                </div>
                              </td>

                              <td>₹{medicine.price.toFixed(2)}</td>

                              <td>{formatExpiryDate(medicine.expiry)}</td>

                              <td>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 6,
                                  }}
                                >
                                  <span
                                    className={`pill ${
                                      medicine.stock < 20
                                        ? 'pill-low'
                                        : 'pill-good'
                                    }`}
                                  >
                                    <span />
                                    {medicine.stock < 20
                                      ? 'Low stock'
                                      : 'In stock'}
                                  </span>

                                  <span
                                    className={`pill ${
                                      expiryStatus === 'expired'
                                        ? 'pill-low'
                                        : 'pill-good'
                                    }`}
                                    style={
                                      expiryStatus === 'soon'
                                        ? {
                                            background: '#fff4db',
                                            color: '#92400e',
                                          }
                                        : expiryStatus === 'valid'
                                          ? {
                                              background: '#ecfdf3',
                                              color: '#067647',
                                            }
                                          : expiryStatus === 'unknown'
                                            ? {
                                                background: '#f2f4f7',
                                                color: '#475467',
                                              }
                                            : undefined
                                    }
                                  >
                                    <span />
                                    {getExpiryLabel(expiryStatus)}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => startEditing(medicine)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  style={{ marginLeft: 6 }}
                                  onClick={() =>
                                    void deleteMedicine(medicine.id)
                                  }
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          )
                        })}

                        {filteredMedicines.length === 0 && (
                          <tr>
                            <td colSpan={7} className="empty-state">
                              {search
                                ? 'No medicines match your search.'
                                : 'No medicines yet. Add your first medicine to get started.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="table-footer">
                  Showing {filteredMedicines.length} of {medicines.length}{' '}
                  medicines
                  <span>
                    {activePage === 'Inventory'
                      ? 'Stock overview'
                      : 'Medicine catalogue'}
                  </span>
                </div>
              </section>

              <div className="bottom-note">
                <span>✦</span> Keep your inventory up to date to support safe
                and efficient pharmacy operations.
              </div>
            </>
          )}
        </div>
      </main>

      {editingMedicine && (
        <div
          className="modal-backdrop"
          onClick={() => setEditingMedicine(null)}
        >
          <form
            className="medicine-modal"
            onSubmit={saveEdit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Edit medicine</h2>
                <p>Update the medicine details below.</p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setEditingMedicine(null)}
              >
                ×
              </button>
            </div>

            <label>
              Medicine name
              <input
                required
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="e.g. Paracetamol 500mg"
              />
            </label>

            <label>
              Category
              <input
                required
                value={editCategory}
                onChange={(event) => setEditCategory(event.target.value)}
                placeholder="e.g. Pain Relief"
              />
            </label>

            <div className="form-grid">
              <label>
                Stock quantity
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={editStock}
                  onChange={(event) => setEditStock(event.target.value)}
                />
              </label>

              <label>
                Unit price (₹)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                />
              </label>
            </div>

            <label>
              Expiry date
              <input
                type="date"
                value={editExpiry}
                onChange={(event) => setEditExpiry(event.target.value)}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditingMedicine(null)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <form
            className="medicine-modal"
            onSubmit={addMedicine}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Add medicine</h2>
                <p>Enter the medicine details below.</p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <label>
              Medicine name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Paracetamol 500mg"
              />
            </label>

            <label>
              Category
              <input
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. Pain Relief"
              />
            </label>

            <div className="form-grid">
              <label>
                Stock quantity
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                />
              </label>

              <label>
                Unit price (₹)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </label>
            </div>

            <label>
              Expiry date
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save medicine
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
