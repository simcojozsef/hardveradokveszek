# GigaPiac – élesítési útmutató (Ingyenes / PRO)

Ez a dokumentum a **teljes** élesítési folyamatot írja le. Titkot nem tartalmaz:
minden kulcs helykitöltő, és kizárólag a szerver `.env` fájljába kerül.

---

## 1. Amit már megvalósítottunk

| Terület | Állapot |
|---|---|
| Ingyenes / PRO csomagszabályok, egyetlen igazság-forrás | ✅ |
| Hirdetés limit (10/100), fotó limit (6/12), érvényesség (30/60 nap) | ✅ |
| Párhuzamos kérések elleni védelem (seller lock + tranzakció) | ✅ |
| Megújítás, visszaaktiválás, `available_confirmed` megerősítés | ✅ |
| Stripe Checkout (subscription), számlázási adatok kötelező bekérése | ✅ |
| Stripe webhookok: aláírás-ellenőrzés, idempotencia, életciklus | ✅ |
| Számlázz.hu integráció (AAM kezelve), számla task állapotok | ✅ |
| PRO megszűnés → visszaváltás 10 hirdetésre, megtartás kijelölése | ✅ |
| XLSX / CSV import (50 sor, 5 MB, képlet-tiltás) | ✅ |
| Tömeges megújítás és ár-/készletmódosítás (max 100) | ✅ |
| Bolt subdomain (`slug.gigapiac.hu`), fenntartott slug tiltás | ✅ |
| Előresorolás (5 / fizetett időszak), 24 órás védelem | ✅ |
| Statisztika (ingyenes: összes; PRO: idősor + érdeklődések) | ✅ |
| Postmark értesítések (7 előfizetési esemény + lejárat) | ✅ |
| Admin számlázási nézet, újrapróbálás, sztornó rögzítés | ✅ |

---

## 2. Környezeti változók

### Stripe

```dotenv
STRIPE_KEY=pk_live_...
STRIPE_SECRET=rk_live_...        # vagy sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...    # ÉLES módban létrehozott ár (lásd 3. pont)
STRIPE_API_VERSION=2026-08-26.dahlia
```

> A webhook a `2026-08-26.dahlia` verziót használja, ezért a feldolgozás ehhez
> igazodik. Ha a Stripe-on más verzióra váltasz, ezt is írd át.

### Számlázz.hu

```dotenv
SZAMLAZZ_AGENT_KEY=...
SZAMLAZZ_ENABLED=true
SZAMLAZZ_USE_TEST=false          # élesben false, fejlesztéskor true
SZAMLAZZ_VAT_RATE=AAM            # vagy szám, pl. 27

SZAMLAZZ_SELLER_NAME="..."
SZAMLAZZ_SELLER_TAX_NUMBER="..."
SZAMLAZZ_SELLER_COUNTRY=HU
SZAMLAZZ_SELLER_POSTAL_CODE="..."
SZAMLAZZ_SELLER_CITY="..."
SZAMLAZZ_SELLER_ADDRESS="..."
SZAMLAZZ_SELLER_EMAIL="..."
```

> **Élesítés előtt a könyvelővel véglegesítendő:** az AAM jogcíme, a
> teljesítési dátum szabálya, a számla nyelve és a fizetési mód megnevezése.

### Postmark

```dotenv
MAIL_MAILER=postmark
POSTMARK_API_KEY=...
MAIL_FROM_ADDRESS="info@gigapiac.hu"
MAIL_FROM_NAME="GigaPiac"
```

### Domain és subdomain

```dotenv
APP_URL=https://gigapiac.hu
APP_DOMAIN=gigapiac.hu
VITE_APP_DOMAIN=gigapiac.hu
```

### Queue

```dotenv
QUEUE_CONNECTION=sync            # vagy database + queue worker (lásd 7. pont)
```

---

## 3. Éles PRO Price ID létrehozása

A teszt ár élesben **nem használható**. Új ár kell:

1. Stripe Dashboard → válts **élő módba**
2. *Products → Add product*
3. Név: `GigaPiac PRO`
4. Ár: **4 990 HUF**, ismétlődés: **havi**
5. Másold ki a `price_...` azonosítót → `STRIPE_PRO_PRICE_ID`

### Restricted kulcs jogosultságai

Ha `rk_live_...` kulcsot használsz, ellenőrizd a Stripe-on
(*Developers → API keys → Restricted keys → Permissions*):

| Erőforrás | Szükséges |
|---|---|
| Checkout Sessions | Write |
| Customers | Write |
| Subscriptions | Write |
| Billing Portal | Write |
| Prices | Read |
| Invoices | Read |

---

## 4. Telepítés sorrendje

```bash
cd ~/hardveradokveszek-test.on-forge.com/current

# 1. Kód és függőségek
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 2. Adatbázis ELŐBB mentve (lásd 9. pont)
php artisan migrate --force

# 3. Konfiguráció
php artisan config:clear
php artisan config:cache

# 4. Queue worker újraindítása, ha fut
php artisan queue:restart

# 5. Ellenőrzés
php artisan tinker --execute="
echo 'stripe pro price: '.config('services.stripe.pro_price_id').PHP_EOL;
echo 'stripe webhook: '.(config('services.stripe.webhook_secret') ? 'SET' : 'MISSING').PHP_EOL;
echo 'szamlazz: '.(app(App\Services\SzamlazzService::class)->isConfigured() ? 'OK' : 'NINCS').PHP_EOL;
"
```

---

## 5. Stripe webhook

- URL: `https://gigapiac.hu/api/stripe/webhook`
- Események (8):

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.payment_action_required
invoice.finalization_failed
```

- A signing secret → `STRIPE_WEBHOOK_SECRET`
- Helyi teszthez: `stripe listen --forward-to localhost:8000/api/stripe/webhook`

---

## 6. Wildcard DNS és SSL (subdomain)

- DNS: `A  *.gigapiac.hu  →  szerver IP`
- Forge → *Site → SSL* → wildcard tanúsítvány a `*.gigapiac.hu`-ra
- A Forge site domain-listájában szerepeljen: `*.gigapiac.hu`

Az alkalmazás a `*.gigapiac.hu`-t oldja fel, és a store `slug` mezőjéből
képezi a subdomaint. A `www`, `api`, `admin`, `app` és a fenntartott nevek
soha nem oldódnak fel store-ként.

---

## 7. Queue worker és scheduler

### Queue

A webhook gyorsan válaszol, a számlázás a háttérben fut. Két lehetőség:

**A) `QUEUE_CONNECTION=sync`** — nincs worker, a feldolgozás a kérésben fut.
Egyszerű, de lassú Számlázz.hu esetén a Stripe timeoutolhat (az újraküldés
biztonságos, mert idempotens).

**B) `QUEUE_CONNECTION=database` + worker** — ez az ajánlott éles minta.

Forge → *Site → Daemons → New Daemon*:

```
Command:  php8.3 artisan queue:work --sleep=3 --tries=3 --max-time=3600
User:     forge
Directory: /home/forge/<site>/current
Processes: 1
```

### Scheduler

A Forge a *Scheduler*-t kezeli, de ellenőrizd, hogy a cron fut:

```
* * * * * cd /home/forge/<site>/current && php artisan schedule:run >> /dev/null 2>&1
```

Ütemezett feladatok:

| Parancs | Gyakoriság | Mit tesz |
|---|---|---|
| `products:expire` | percenként | lejárt hirdetések státuszváltása |
| `products:warn-expiring` | óránként | 3 napos lejárat-figyelmeztetés (egyszer) |
| `stripe:reconcile` | óránként | kimaradt webhookok pótlása |
| `plans:expire-pro` | 10 percenként | PRO megszűnés + visszaváltás |
| `stats:rollup` | óránként | napi megtekintés összesítés |

---

## 8. Tesztfolyamat élesben (ellenőrzőlista)

Végezd el sorrendben, élesben:

1. **Regisztráció** → e-mail megerősítő kód megérkezik
2. **Belépés** → 2FA kód megérkezik
3. **Eladóvá válás** → bolt létrehozása, `slug` megadása
   - próbálj `admin` slugot → **elutasítva kell legyen**
4. **Termék létrehozása** → 10. hirdetés után a 11. **elutasítva**
5. **Fotó** → 6. fotó után a 7. **elutasítva**
6. **PRO előfizetés** → számlázási adatok bekérése, majd fizetés
   - üres számlázási adattal a **fizetés gomb letiltva**
   - Stripe teszt/éles kártyával fizess
7. **Számla** → megérkezik a Számlázz.hu-tól az e-mail
8. **PRO aktív** → 100 hirdetés, 12 fotó, 60 nap, 5 előresorolás
9. **Előresorolás** → 5 alkalom, majd a 6. elutasítva
10. **Subdomain** → `slug.gigapiac.hu` betölti a boltot
11. **Admin** → `/admin/billing` mutatja az előfizetést és a számlát
12. **Lemondás** → Stripe Portal → PRO megmarad az időszak végéig
13. **Lejárat után** → legfeljebb 10 hirdetés marad aktív, a többi archiválva

---

## 9. Adatbázis-mentés és visszaállítás

**Élesítés előtt kötelező:**

```bash
mysqldump -u <user> -p <db> | gzip > backup-$(date +%F-%H%M).sql.gz
```

**Visszaállítás** – a már kiállított számlák és a kifizetett jogosultságok
megőrzésével:

```bash
# 1. Karbantartási mód
php artisan down

# 2. Mentés visszatöltése (csak ha szükséges)
gunzip < backup-YYYY-MM-DD-HHMM.sql.gz | mysql -u <user> -p <db>

# 3. Migrációk állapota
php artisan migrate:status

# 4. Cache és queue
php artisan config:clear && php artisan config:cache
php artisan queue:restart

# 5. Karbantartás vége
php artisan up
```

> **Fontos:** a `subscriptions`, `subscription_periods`, `invoice_tasks` és
> `stripe_webhook_events` táblák a fizetési előzményt tárolják. Ezeket **soha
> ne töröld** visszaállításkor, mert a PRO jogosultság és a számlák ezekből
> származnak.

---

## 10. Élesítés előtt hiányzó külső beállítások

Ezek **üzleti és számlázási döntések**, amelyeket a tulajdonosnak kell
véglegesítenie:

- [ ] Éles Stripe **PRO Price ID** létrehozva
- [ ] Stripe **webhook signing secret** beállítva, a 8 esemény kijelölve
- [ ] **Számlázz.hu**: AAM jogcím megerősítve a könyvelővel
- [ ] **Számlázz.hu**: teljesítési dátum szabálya rögzítve
- [ ] **Számlázz.hu**: `SZAMLAZZ_USE_TEST=false` élesben
- [ ] **Postmark**: `info@gigapiac.hu` feladó hitelesítve, fiók jóváhagyva
- [ ] **Queue worker** fut (Forge daemon) vagy `QUEUE_CONNECTION=sync`
- [ ] **Scheduler** cron fut
- [ ] **Wildcard SSL** a `*.gigapiac.hu`-ra
- [ ] Adatbázis-mentés elkészült
- [ ] Az egyszeri előresorolás vásárlás **kikapcsolva** marad, amíg nincs ár:
      `STRIPE_BUMP_PURCHASE_ENABLED=false`

---

## 11. Ismert korlátok

- **Egyszeri előresorolás vásárlás:** a mechanizmus helye elő van készítve
  (`STRIPE_BUMP_PRICE_ID`), de a vásárlás **ki van kapcsolva**, amíg az ár
  nincs rögzítve. Az `490 Ft` javasolt ár nem kerül automatikusan használatra.
- **Számlázás és visszatérítés:** a sztornó/helyesbítő bizonylatot az admin
  **kézzel** rögzíti; a kód nem állít ki helyesbítőt automatikusan, mert a
  számviteli kezelés a könyvelő döntése.
- **Statisztika visszamenőleg:** nincs korábbi idősor, mert a mérés most indul.
  A napi bontás a gyűjtés kezdetétől érhető el.
- **Vendég megtekintés:** ha a böngésző nem ad stabil session tokent, a
  megtekintés nem számít (inkább kevesebbet számolunk, mint pontatlant).
- **Örökölt `analytics_events`:** a korábbi analitika tábla **nyers IP-címet
  tárol**, ami ütközik a statisztikai adatvédelmi szabályokkal. Az új
  `product_views` tábla ezt nem teszi. Javasolt a régi tábla IP-mentesítése
  vagy kivezetése.

---

## 12. Gyors parancsok hibakereséshez

```bash
# Elakadt számlák újrapróbálása
php artisan invoices:retry

# Stripe egyeztetés (kimaradt webhookok)
php artisan stripe:reconcile

# PRO lejáratok kezelése
php artisan plans:expire-pro

# Napi statisztika újraszámolása (idempotens)
php artisan stats:rollup --days=3

# Queue állapot
php artisan tinker --execute="echo 'jobs: '.\DB::table('jobs')->count();"

# Sikertelen webhookok
php artisan tinker --execute="
\App\Models\StripeWebhookEvent::where('status','failed')->latest('id')->take(10)->get()
  ->each(fn(\$e) => print(\$e->stripe_event_id.' '.\$e->type.' '.\$e->error.PHP_EOL));
"
```
