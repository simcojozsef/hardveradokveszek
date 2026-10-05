import React, { useId } from 'react';
import '../../css/seller-filters.css';
import LocationSelect from './LocationSelect';
const SHIPPING_METHODS = [['foxpost', 'Foxpost'], ['gls', 'GLS'], ['magyar_posta', 'Magyar Posta'], ['other', 'Egyéb']];
export default function ProductFilterFields({ form, setForm, trustedSeller = false }) {
    const tipId = useId();
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const toggleShippingMethod = (value, checked) => setForm((current) => ({
        ...current,
        shipping_methods: checked ? [...new Set([...current.shipping_methods, value])]
            : current.shipping_methods.filter((method) => method !== value),
    }));
    return (
        <section className="dashboard-card product-filter-fields">
            <h2>Részletes keresési adatok</h2>
            <div className="form-grid">
                <label className="form-field"><span>Állapot</span>
                    <select value={form.condition} onChange={(event) => set('condition', event.target.value)} required>
                        <option value="">Válassz állapotot...</option>
                        <option value="new">Új</option><option value="used">Használt</option>
                    </select>
                </label>
                <label className="form-field"><span>Hirdetés típusa</span>
                    <select value={form.listing_type} onChange={(event) => set('listing_type', event.target.value)} required>
                        <option value="offer">Kínál</option><option value="wanted">Keres</option>
                    </select>
                </label>
                <LocationSelect value={form} onChange={(location) => setForm((current) => ({ ...current, ...location }))} />
                {[['brand', 'Márka'], ['model', 'Modell']].map(([key, label]) => (
                    <label className="form-field" key={key}><span>{label}</span>
                        <input type="text" value={form[key]} maxLength={100} onChange={(event) => set(key, event.target.value)} />
                    </label>
                ))}
            </div>
            <div className="product-filter-fields__checks">
                {[
                    ['shipping_available', 'Csomagküldés elérhető'],
                    ['personal_pickup', 'Személyes átvétel elérhető'],
                    ['contains_ai', 'A hirdetés MI által készített tartalmat tartalmaz'],
                    ['has_warranty', 'Garanciális termék'],
                    ['is_active', 'Aktív hirdetés'],
                ].map(([key, label]) => (
                    <label className="product-filter-fields__check" key={key}>
                        <input type="checkbox" checked={form[key]} onChange={(event) => set(key, event.target.checked)} />
                        <span>{label}</span>
                    </label>
                ))}
            </div>
            {form.shipping_available && (
                <fieldset className="product-filter-fields__shipping"><legend>Csomagküldés módja (legalább egy)</legend>
                    {SHIPPING_METHODS.map(([value, label]) => (
                        <label key={value} className="product-filter-fields__check">
                            <input type="checkbox" checked={form.shipping_methods.includes(value)}
                                onChange={(event) => toggleShippingMethod(value, event.target.checked)} />{label}
                        </label>
                    ))}
                    {!form.shipping_methods.length && <p>Válassz legalább egy csomagküldési módot.</p>}
                </fieldset>
            )}
            {form.has_warranty && (
                <label className="form-field"><span>Garancia lejárata</span>
                    <input type="date" value={form.warranty_expires_at} required
                        onChange={(event) => set('warranty_expires_at', event.target.value)} />
                </label>
            )}
            <p id={tipId}>Megbízható eladó: {trustedSeller ? 'Igen' : 'Még nincs jóváhagyva'}.
                {' '}A minősítést a GigaPiac csapata adja meg. Kérés: info@gigapiac.hu.</p>
        </section>
    );
}
