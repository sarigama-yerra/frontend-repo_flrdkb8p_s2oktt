import { useEffect, useMemo, useState } from 'react'
import Spline from '@splinetool/react-spline'
import { Search, Settings, Plus, Trash2, Edit2, Tag, Cpu, Monitor, ChevronRight } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || ''

function Badge({ children, color = 'blue' }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    gray: 'bg-gray-50 text-gray-700 ring-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${styles[color]}`}>
      {children}
    </span>
  )
}

function ProductCard({ p, onSelect }) {
  const price = p.sale_price ?? p.price
  const hasSale = p.sale_price && p.sale_price < p.price
  return (
    <div className="group rounded-xl bg-white/70 backdrop-blur shadow-sm hover:shadow-lg ring-1 ring-gray-200 transition overflow-hidden">
      <div className="aspect-video overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.title || p.model} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 via-green-50 to-red-50 flex items-center justify-center text-gray-400">
            <Monitor className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm text-gray-500">{p.brand} • {p.model}</h3>
            <h2 className="text-lg font-semibold text-gray-900">{p.title || `${p.brand} ${p.model}`}</h2>
          </div>
          <button onClick={() => onSelect(p)} className="p-2 rounded-md hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {hasSale && (
            <span className="text-sm text-gray-400 line-through">${p.price.toLocaleString()}</span>
          )}
          <span className="text-xl font-bold text-gray-900">${Number(price).toLocaleString()}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.tags?.slice(0,3).map(t => (
            <Badge key={t} color="gray"><Tag className="w-3 h-3" /> {t}</Badge>
          ))}
          {p.specs?.cpu && <Badge color="blue"><Cpu className="w-3 h-3" /> {p.specs.cpu}</Badge>}
          {p.specs?.ram_gb && <Badge color="green">{p.specs.ram_gb}GB RAM</Badge>}
        </div>
      </div>
    </div>
  )
}

function ProductModal({ product, onClose }) {
  if (!product) return null
  const s = product.specs || {}
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-3xl w-full bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-video md:aspect-auto md:h-full">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title || product.model} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-50 via-green-50 to-red-50 flex items-center justify-center text-gray-400">
                <Monitor className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{product.title || `${product.brand} ${product.model}`}</h2>
              <p className="text-gray-500">{product.brand} • {product.model}</p>
            </div>
            {product.description && (
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {s.cpu && <Badge color="blue">CPU: {s.cpu}</Badge>}
              {s.gpu && <Badge color="blue">GPU: {s.gpu}</Badge>}
              {s.ram_gb && <Badge color="green">RAM: {s.ram_gb} GB</Badge>}
              {s.storage_gb && <Badge color="green">Storage: {s.storage_gb} GB {s.storage_type}</Badge>}
              {s.screen_size_inch && <Badge color="gray">Screen: {s.screen_size_inch}" {s.resolution || ''}</Badge>}
              {s.refresh_rate_hz && <Badge color="gray">Refresh: {s.refresh_rate_hz} Hz</Badge>}
              {s.os && <Badge color="gray">OS: {s.os}</Badge>}
              {s.weight_kg && <Badge color="gray">Weight: {s.weight_kg} kg</Badge>}
            </div>
            <div className="pt-2">
              <span className="text-2xl font-bold text-gray-900">${Number(product.sale_price ?? product.price).toLocaleString()}</span>
            </div>
            <div className="pt-2 flex gap-2">
              {product.colors?.map(c => (
                <span key={c} className="w-6 h-6 rounded-full border" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={onClose} className="mt-2 px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminPanel({ refresh }) {
  const empty = {
    brand: '', model: '', title: '', description: '', price: 0,
    sale_price: '', stock: 0, image_url: '', colors: '', tags: '',
    specs: { cpu: '', gpu: '', ram_gb: '', storage_gb: '', storage_type: '', screen_size_inch: '', resolution: '', refresh_rate_hz: '', os: '' },
    published: true,
  }
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN_TOKEN }), [])

  const load = async () => {
    try {
      const r = await fetch(`${BACKEND}/api/admin/products`, { headers })
      if (!r.ok) throw new Error('auth failed or server error')
      const d = await r.json()
      setItems(d)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { load() }, [])

  const submit = async (ev) => {
    ev.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price || 0),
        sale_price: form.sale_price === '' ? null : Number(form.sale_price),
        stock: Number(form.stock || 0),
        colors: form.colors ? form.colors.split(',').map(s=>s.trim()) : [],
        tags: form.tags ? form.tags.split(',').map(s=>s.trim()) : [],
        specs: {
          ...form.specs,
          ram_gb: form.specs.ram_gb ? Number(form.specs.ram_gb) : null,
          storage_gb: form.specs.storage_gb ? Number(form.specs.storage_gb) : null,
          screen_size_inch: form.specs.screen_size_inch ? Number(form.specs.screen_size_inch) : null,
          refresh_rate_hz: form.specs.refresh_rate_hz ? Number(form.specs.refresh_rate_hz) : null,
        }
      }
      const r = await fetch(`${BACKEND}/api/admin/products`, { method: 'POST', headers, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error('create failed')
      setForm(empty)
      await load()
      refresh()
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const remove = async (id) => {
    if (!confirm('Hapus produk ini?')) return
    try {
      const r = await fetch(`${BACKEND}/api/admin/products/${id}`, { method: 'DELETE', headers })
      if (!r.ok) throw new Error('delete failed')
      await load()
      refresh()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="mt-12 grid lg:grid-cols-2 gap-8">
      <div className="bg-white/70 backdrop-blur rounded-2xl ring-1 ring-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Tambah Produk</h3>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Brand" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} required />
          <input className="input" placeholder="Model" value={form.model} onChange={e=>setForm({...form, model:e.target.value})} required />
          <input className="input col-span-2" placeholder="Judul" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
          <textarea className="input col-span-2" placeholder="Deskripsi" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          <input className="input" type="number" step="0.01" placeholder="Harga" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} required />
          <input className="input" type="number" step="0.01" placeholder="Harga Diskon (opsional)" value={form.sale_price} onChange={e=>setForm({...form, sale_price:e.target.value})} />
          <input className="input" type="number" placeholder="Stok" value={form.stock} onChange={e=>setForm({...form, stock:e.target.value})} />
          <input className="input col-span-2" placeholder="URL Gambar" value={form.image_url} onChange={e=>setForm({...form, image_url:e.target.value})} />
          <input className="input" placeholder="Warna (comma)" value={form.colors} onChange={e=>setForm({...form, colors:e.target.value})} />
          <input className="input" placeholder="Tag (comma)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} />
          <input className="input" placeholder="CPU" value={form.specs.cpu} onChange={e=>setForm({...form, specs:{...form.specs, cpu:e.target.value}})} />
          <input className="input" placeholder="GPU" value={form.specs.gpu} onChange={e=>setForm({...form, specs:{...form.specs, gpu:e.target.value}})} />
          <input className="input" type="number" placeholder="RAM (GB)" value={form.specs.ram_gb} onChange={e=>setForm({...form, specs:{...form.specs, ram_gb:e.target.value}})} />
          <input className="input" type="number" placeholder="Storage (GB)" value={form.specs.storage_gb} onChange={e=>setForm({...form, specs:{...form.specs, storage_gb:e.target.value}})} />
          <input className="input" placeholder="Tipe Storage" value={form.specs.storage_type} onChange={e=>setForm({...form, specs:{...form.specs, storage_type:e.target.value}})} />
          <input className="input" type="number" step="0.1" placeholder="Layar (inch)" value={form.specs.screen_size_inch} onChange={e=>setForm({...form, specs:{...form.specs, screen_size_inch:e.target.value}})} />
          <input className="input" placeholder="Resolusi" value={form.specs.resolution} onChange={e=>setForm({...form, specs:{...form.specs, resolution:e.target.value}})} />
          <input className="input" type="number" placeholder="Refresh Rate (Hz)" value={form.specs.refresh_rate_hz} onChange={e=>setForm({...form, specs:{...form.specs, refresh_rate_hz:e.target.value}})} />
          <input className="input" placeholder="OS" value={form.specs.os} onChange={e=>setForm({...form, specs:{...form.specs, os:e.target.value}})} />
          <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form, published:e.target.checked})} /> Published</label>
          <button disabled={loading} className="col-span-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
        </form>
      </div>

      <div className="bg-white/70 backdrop-blur rounded-2xl ring-1 ring-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Kelola Produk</h3>
        </div>
        <div className="grid gap-3">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between p-3 rounded-lg ring-1 ring-gray-200 bg-white">
              <div>
                <p className="font-medium">{it.title || `${it.brand} ${it.model}`}</p>
                <p className="text-xs text-gray-500">ID: {it.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-md hover:bg-gray-100" onClick={()=>remove(it.id)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [products, setProducts] = useState([])
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)

  const load = async () => {
    const url = new URL(`${BACKEND}/api/products`)
    if (q) url.searchParams.set('q', q)
    if (brand) url.searchParams.set('brand', brand)
    const r = await fetch(url.toString())
    const d = await r.json()
    setProducts(d)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Spline scene="https://prod.spline.design/VJLoxp84lCdVfdZu/scene.splinecode" style={{ width: '100%', height: '100%' }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/70 to-white" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-green-500 to-red-500" />
              <span className="font-semibold">LaptoPulse</span>
            </div>
            <button onClick={() => setShowAdmin(v=>!v)} className="px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Admin
            </button>
          </div>
          <div className="mt-14 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900">Katalog Laptop, Modern dan Interaktif</h1>
            <p className="mt-4 text-gray-600 text-lg">Jelajahi laptop favoritmu, bandingkan spesifikasi, dan temukan yang paling cocok. Admin dapat kelola produk secara penuh.</p>
            <div className="mt-6 grid sm:grid-cols-[1fr_auto_auto] gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl ring-1 ring-gray-300 bg-white">
                <Search className="w-4 h-4 text-gray-500" />
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari model/fitur..." className="w-full outline-none" />
              </div>
              <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Brand" className="px-3 py-2 rounded-xl ring-1 ring-gray-300 bg-white" />
              <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Cari</button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 -mt-10 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <ProductCard key={p.id} p={p} onSelect={setSelected} />
          ))}
        </div>

        {showAdmin && <AdminPanel refresh={load} />}
      </main>

      <ProductModal product={selected} onClose={() => setSelected(null)} />

      <style>{`
        .input { @apply px-3 py-2 rounded-md ring-1 ring-gray-300 bg-white/80; }
      `}</style>
    </div>
  )
}
