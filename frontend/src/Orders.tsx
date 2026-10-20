
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './Orders.css';

const API = 'http://localhost:8081/api';

type Supplier = {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type Medicine = {
  id: number;
  name: string;
  category?: string;
  stock?: number;
  price?: number;
  purchasePrice?: number;
  unitPrice?: number;
  sellingPrice?: number;
};

type Order = {
  id: number;
  supplierId: number;
  supplierName: string;
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  status: string;
  totalAmount?: number;
};

type OrderForm = {
  supplierId: string;
  medicineId: string;
  quantity: string;
  unitPrice: string;
  orderDate: string;
  status: string;
};

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyForm(): OrderForm {
  return {
    supplierId: '',
    medicineId: '',
    quantity: '1',
    unitPrice: '',
    orderDate: todayString(),
    status: 'Pending',
  };
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

async function readResponse(response: Response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [form, setForm] = useState<OrderForm>(createEmptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [ordersResponse, suppliersResponse, medicinesResponse] =
        await Promise.all([
          fetch(`${API}/orders`),
          fetch(`${API}/suppliers`),
          fetch(`${API}/medicines`),
        ]);

      const [ordersData, suppliersData, medicinesData] = await Promise.all([
        readResponse(ordersResponse),
        readResponse(suppliersResponse),
        readResponse(medicinesResponse),
      ]);

      // Normalize API responses so dropdowns use the correct fields.
      const normalizedSuppliers: Supplier[] = (
        Array.isArray(suppliersData) ? suppliersData : []
      ).map((supplier: any) => ({
        id: Number(supplier.id),
        name: String(
          supplier.name ??
          supplier.supplierName ??
          supplier.companyName ??
          `Supplier #${supplier.id}`,
        ),
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
      }));

      const normalizedMedicines: Medicine[] = (
        Array.isArray(medicinesData) ? medicinesData : []
      ).map((medicine: any) => ({
        id: Number(medicine.id),
        name: String(
          medicine.name ??
          medicine.medicineName ??
          medicine.medicine ??
          `Medicine #${medicine.id}`,
        ),
        category: medicine.category,
        stock: Number(medicine.stock ?? 0),
        price:
          medicine.price != null ? Number(medicine.price) : undefined,
        purchasePrice:
          medicine.purchasePrice != null
            ? Number(medicine.purchasePrice)
            : undefined,
        unitPrice:
          medicine.unitPrice != null
            ? Number(medicine.unitPrice)
            : undefined,
        sellingPrice:
          medicine.sellingPrice != null
            ? Number(medicine.sellingPrice)
            : undefined,
      }));

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setSuppliers(normalizedSuppliers);
      setMedicines(normalizedMedicines);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not load orders, suppliers or medicines: ${err.message}`
          : 'Could not connect to the pharmacy server.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedMedicine = medicines.find(
    (medicine) => String(medicine.id) === form.medicineId,
  );

  function chooseMedicine(id: string) {
    const medicine = medicines.find(
      (item) => String(item.id) === id,
    );

    const price =
      medicine?.purchasePrice ??
      medicine?.unitPrice ??
      medicine?.price ??
      medicine?.sellingPrice;

    setForm((current) => ({
      ...current,
      medicineId: id,
      unitPrice: price != null ? String(price) : current.unitPrice,
    }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const supplier = suppliers.find(
      (item) => String(item.id) === form.supplierId,
    );

    const medicine = medicines.find(
      (item) => String(item.id) === form.medicineId,
    );

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (!supplier || !medicine) {
      setError('Please select both a supplier and a medicine.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Quantity must be a whole number greater than zero.');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('Unit price must be zero or greater.');
      return;
    }

    if (!form.orderDate) {
      setError('Please select an order date.');
      return;
    }

    const payload = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity,
      unitPrice,
      orderDate: form.orderDate,
      status: form.status,
    };

    setSaving(true);

    try {
      const url =
        editingId === null
          ? `${API}/orders`
          : `${API}/orders/${editingId}`;

      const response = await fetch(url, {
        method: editingId === null ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      await readResponse(response);

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save the order.',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(order: Order) {
    setEditingId(order.id);

    setForm({
      supplierId: String(order.supplierId ?? ''),
      medicineId: String(order.medicineId ?? ''),
      quantity: String(order.quantity ?? 1),
      unitPrice: String(order.unitPrice ?? 0),
      orderDate: order.orderDate || todayString(),
      status: order.status || 'Pending',
    });

    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteOrder(id: number) {
    if (!window.confirm(`Delete order #${id}? This cannot be undone.`)) {
      return;
    }

    setError('');

    try {
      const response = await fetch(`${API}/orders/${id}`, {
        method: 'DELETE',
      });

      await readResponse(response);

      if (editingId === id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not delete the order.',
      );
    }
  }

  const query = search.toLowerCase().trim();

  const filteredOrders = orders.filter((order) =>
    [
      String(order.id),
      order.supplierName || '',
      order.medicineName || '',
      order.status || '',
    ].some((value) => value.toLowerCase().includes(query)),
  );

  const pendingCount = orders.filter(
    (order) => order.status === 'Pending',
  ).length;

  const receivedCount = orders.filter(
    (order) => order.status === 'Received',
  ).length;

  const totalValue = orders.reduce(
    (sum, order) =>
      sum +
      Number(
        order.totalAmount ??
        Number(order.quantity || 0) * Number(order.unitPrice || 0),
      ),
    0,
  );

  return (
    <section className="orders-page">
      <div className="orders-heading">
        <div>
          <p className="orders-eyebrow">PROCUREMENT</p>
          <h1>Orders Management</h1>
          <p className="orders-subtitle">
            Create and track medicine purchase orders from your suppliers.
          </p>
        </div>

        <button
          type="button"
          className="orders-refresh"
          onClick={() => void loadData()}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="orders-error" role="alert">
          {error}
        </div>
      )}

      <div className="orders-stats">
        <div className="order-stat">
          <span>Total Orders</span>
          <strong>{orders.length}</strong>
          <small>All purchase orders</small>
        </div>

        <div className="order-stat">
          <span>Pending Orders</span>
          <strong>{pendingCount}</strong>
          <small>Awaiting receipt</small>
        </div>

        <div className="order-stat">
          <span>Received Orders</span>
          <strong>{receivedCount}</strong>
          <small>Successfully received</small>
        </div>

        <div className="order-stat">
          <span>Total Order Value</span>
          <strong>{money(totalValue)}</strong>
          <small>Across all orders</small>
        </div>
      </div>

      <div className="orders-panel">
        <div className="orders-panel-heading">
          <div>
            <h2>
              {editingId === null
                ? 'Create Purchase Order'
                : `Edit Order #${editingId}`}
            </h2>
            <p>Fill in the details below.</p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              className="orders-cancel"
              onClick={resetForm}
            >
              Cancel edit
            </button>
          )}
        </div>

        <form className="orders-form" onSubmit={handleSubmit}>
          <label>
            Supplier
            <select
              value={form.supplierId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  supplierId: event.target.value,
                }))
              }
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Medicine
            <select
              value={form.medicineId}
              onChange={(event) => chooseMedicine(event.target.value)}
              required
            >
              <option value="">Select medicine</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={String(medicine.id)}>
                  {medicine.name}
                  {medicine.stock != null
                    ? ` (Stock: ${medicine.stock})`
                    : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Unit Price (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  unitPrice: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Order Date
            <input
              type="date"
              value={form.orderDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  orderDate: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              required
            >
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <div className="orders-total-preview">
            <span>Order total</span>
            <strong>
              {money(
                (Number(form.quantity) || 0) *
                  (Number(form.unitPrice) || 0),
              )}
            </strong>
            {selectedMedicine && (
              <small>Selected: {selectedMedicine.name}</small>
            )}
          </div>

          <div className="orders-form-actions">
            <button
              type="button"
              className="orders-secondary"
              onClick={resetForm}
            >
              Clear
            </button>

            <button
              type="submit"
              className="orders-primary"
              disabled={saving || loading}
            >
              {saving
                ? 'Saving...'
                : editingId === null
                  ? '+ Create Order'
                  : 'Save Changes'}
            </button>
          </div>
        </form>

        {!loading && suppliers.length === 0 && (
          <p className="orders-note">
            No suppliers were returned by the API. Add a supplier and refresh.
          </p>
        )}

        {!loading && medicines.length === 0 && (
          <p className="orders-note">
            No medicines were returned by the API. Add a medicine and refresh.
          </p>
        )}
      </div>

      <div className="orders-panel orders-table-panel">
        <div className="orders-panel-heading">
          <div>
            <h2>Purchase Orders</h2>
            <p>Review, edit or delete existing orders.</p>
          </div>

          <input
            className="orders-search"
            type="search"
            placeholder="Search orders..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="orders-empty">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <span className="orders-empty-icon">▤</span>
            <strong>
              {search ? 'No matching orders' : 'No orders yet'}
            </strong>
            <p>
              {search
                ? 'Try another search term.'
                : 'Create your first purchase order using the form above.'}
            </p>
          </div>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Supplier</th>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">#{order.id}</td>
                    <td>
                      {order.supplierName || `#${order.supplierId}`}
                    </td>
                    <td>
                      {order.medicineName || `#${order.medicineId}`}
                    </td>
                    <td>{order.quantity}</td>
                    <td>{money(order.unitPrice)}</td>
                    <td className="order-amount">
                      {money(
                        order.totalAmount ??
                          Number(order.quantity) * Number(order.unitPrice),
                      )}
                    </td>
                    <td>{order.orderDate || '—'}</td>
                    <td>
                      <span
                        className={`order-status ${(order.status || 'Pending').toLowerCase()}`}
                      >
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="order-actions">
                        <button
                          type="button"
                          className="order-edit"
                          onClick={() => startEdit(order)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="order-delete"
                          onClick={() => void deleteOrder(order.id)}
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
