# Stripe és Számlázz.hu – éles környezet beállítása

Ez a fájl **nem tartalmaz titkot**. A kulcsokat kizárólag a szerver `.env`
fájljába (vagy a Forge Environment felületére) kell beírni.

## 1. Hol lakik a `.env`

- Helyben: `hardveradokveszek/.env` – **teszt** kulcsokkal, hogy ne keletkezzen
  éles fizetés és éles számla.
- Élesben: `~/hardveradokveszek-test.on-forge.com/current/.env`, vagy a Forge
  felületén: *Site → Environment → Edit Environment File*.

A `.env` a `.gitignore`-ban van, ezért deploy nem viszi át: **kézzel** kell
beírni. A `.env.example` csak üres helykitöltőket tartalmaz.

## 2. Változónevek – pontosan ezek kellenek élesben

```dotenv
# ---- Stripe (élő mód) ----
STRIPE_KEY=pk_live_...
STRIPE_SECRET=rk_live_...          # vagy sk_live_..., ha nem restricted kulcsot használsz
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...      # ÉLES módban létrehozott ár (lásd 3. pont)
STRIPE_API_VERSION=2026-08-26.dahlia

# ---- Számlázz.hu ----
SZAMLAZZ_AGENT_KEY=...
SZAMLAZZ_ENABLED=true
SZAMLAZZ_USE_TEST=false            # true esetén teszt számla készül

SZAMLAZZ_SELLER_NAME="Simco József E.V."
SZAMLAZZ_SELLER_TAX_NUMBER="91248385-1-29"
SZAMLAZZ_SELLER_COUNTRY=HU
SZAMLAZZ_SELLER_POSTAL_CODE="4002"
SZAMLAZZ_SELLER_CITY="Debrecen"
SZAMLAZZ_SELLER_ADDRESS="Salakos u. 85"
SZAMLAZZ_SELLER_EMAIL="szamla@gigapiac.hu"
SZAMLAZZ_VAT_RATE=AAM
```

`STRIPE_API_VERSION`: az élő webhook `2026-08-26.dahlia` verziót használ, ezért
élesben erre állítsd, hogy a bejövő payload alakja egyezzen.

## 3. Éles PRO Price ID létrehozása (kötelező)

A jelenlegi `price_1UOBNFPt9ir6N9snGTfrhmv3` **teszt** módban jött létre, élesben
nem használható. Hozz létre egy újat élő módban:

1. Stripe Dashboard → váltsd **élő módba** (bal felül)
2. *Products → Add product*
3. Név: `GigaPiac PRO`
4. Ár: **4 990 HUF**, ismétlődés: **havi**
5. Mentés után másold ki a `price_...` azonosítót
6. Írd a szerver `.env`-jébe: `STRIPE_PRO_PRICE_ID=price_...`

## 4. Restricted kulcs jogosultságai

Ha `rk_live_...` kulcsot használsz (`STRIPE_SECRET`), ellenőrizd a Stripe-on:
*Developers → API keys → Restricted keys → Permissions*:

| Erőforrás | Szükséges |
|---|---|
| Checkout Sessions | **Write** |
| Customers | **Write** |
| Subscriptions | **Write** |
| Billing Portal | **Write** |
| Prices | Read |
| Invoices | Read |

Ha bármelyik hiányzik, a fizetés indítása élesben meghiusul. Ilyenkor vagy
adj hozzá jogot, vagy használd a normál `sk_live_...` kulcsot.

## 5. Webhook

- URL: `https://gigapiac.hu/api/stripe/webhook`
- Aláírás-ellenőrzés a nyers kérés törzsén történik.
- A signing secret a `STRIPE_WEBHOOK_SECRET` változóba kerül.
- A helyi fejlesztéshez a Stripe CLI-vel lehet Forwardolni:
  `stripe listen --forward-to localhost:8000/api/stripe/webhook`

## 6. Beállítás után kötelező

```bash
cd ~/hardveradokveszek-test.on-forge.com/current
php artisan config:clear
php artisan config:cache
php artisan migrate --force
```

## 7. Élesítés előtt egyeztetendő a könyvelővel

- Az **AAM** (alanyi adómentesség) jogcíme helyes-e.
- A **teljesítési dátum** szabálya (jelenleg a számla keltének napja).
- Számla nyelve, pénznem, fizetési mód megnevezése.
- A PRO díj áfatartalma / adómentességi jogcíme.

Ezek üzleti és számviteli döntések; a kód konfigurációból olvassa őket, hogy
élesítés előtt egy helyen lehessen véglegesíteni.

## 8. Biztonság

- Titkot soha ne írj a kódba, a gitbe, a naplóba vagy a `.env.example`-be.
- A `rk_live_...` kulcsot csak a szerver `.env`-jébe írd.
- Ha egy kulcs kiszivárgott vagy megosztásra került, **forgasd** a Stripe-on:
  *Developers → API keys → Roll key*, illetve *Webhooks → signing secret → Roll*.
