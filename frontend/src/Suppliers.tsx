
import { useEffect, useState, type FormEvent } from 'react';

type Supplier = {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

const API_URL = 'http://localhost:8081/api/suppliers';

const emptyForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSuppliers() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Could not load suppliers.');
      setSuppliers(await response.json());
    } catch {
      setError('Unable to connect to the server. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuppliers();
  }, []);

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(supplier: Supplier) {
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
    });
    setEditingId(supplier.id);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(
        editingId === null ? API_URL : `${API_URL}/${editingId}`,
        {
          method: editingId === null ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) throw new Error('Could not save supplier.');

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function deleteSupplier(id: number) {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;

    setError('');

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete supplier.');
      await loadSuppliers();
    } catch {
      setError('Unable to delete supplier. Please try again.');
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) =>
    [
      supplier.name,
      supplier.contactPerson,
      supplier.phone,
      supplier.email,
      supplier.address,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section className="supplier-page">
      <div className="supplier-heading">
        <div>
          <h2>Supplier Management</h2>
          <p>Manage your pharmacy suppliers and contact information.</p>
        </div>
        <button className="supplier-primary-btn" onClick={openAddForm}>
          + Add Supplier
        </button>
      </div>

      <div className="supplier-summary">
        <div className="supplier-summary-card">
          <span>Total Suppliers</span>
          <strong>{suppliers.length}</strong>
        </div>
      </div>

      {error && <p className="supplier-error">{error}</p>}

      <input
        className="supplier-search"
        type="search"
        placeholder="Search suppliers by name, phone, email..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {showForm && (
        <div className="supplier-modal-backdrop">
          <form className="supplier-form" onSubmit={handleSubmit}>
            <h3>{editingId === null ? 'Add Supplier' : 'Edit Supplier'}</h3>

            <label>
              Supplier Name *
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter supplier name"
              />
            </label>

            <label>
              Contact Person
              <input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Enter contact person"
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Enter email address"
              />
            </label>

            <label>
              Address
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Enter supplier address"
                rows={3}
              />
            </label>

            <div className="supplier-form-actions">
              <button
                type="button"
                className="supplier-secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="supplier-primary-btn">
                {editingId === null ? 'Save Supplier' : 'Update Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="supplier-table-card">
        <h3>Supplier Directory</h3>

        {loading ? (
          <p>Loading suppliers...</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="supplier-empty">
            {search ? 'No matching suppliers found.' : 'No suppliers added yet. Click “Add Supplier” to begin.'}
          </p>
        ) : (
          <div className="supplier-table-wrap">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.contactPerson || '—'}</td>
                    <td>{supplier.phone || '—'}</td>
                    <td>{supplier.email || '—'}</td>
                    <td>{supplier.address || '—'}</td>
                    <td>
                      <div className="supplier-actions">
                        <button
                          className="supplier-edit-btn"
                          onClick={() => openEditForm(supplier)}
                        >
                          Edit
                        </button>
                        <button
                          className="supplier-delete-btn"
                          onClick={() => void deleteSupplier(supplier.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
