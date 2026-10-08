# GigaPiac – Ingyenes / PRO fejlesztési specifikáció CodeGPT számára

Verzió: 1.0 · 2026. október 8.

## Használat

Először a 0. feladatot add át CodeGPT-nek. Ezután a közös szabályokat, majd egyesével az 1–12. feladatot. Minden új beszélgetésben add át újra a közös szabályokat és a korábbi lépések eredményét. Egy lépés után ellenőrizd annak elfogadási feltételeit, csak utána folytasd.

Ez fejlesztési megrendelés, nem a jelenlegi kód felülvizsgálata. A projekt forráskódja nem volt elérhető a specifikáció készítésekor. Az alábbi új elnevezések javaslatok; a meglévő modellekhez és útvonalakhoz illeszkedjenek, párhuzamos termék-, bolt- vagy beszélgetésrendszer ne keletkezzen.

## Közös utasítás – minden feladathoz

Laravel backend és React frontend alapú marketplace meglévő eladói fiókját bővítsd. Jelenleg nincs előfizetési rendszer, a termékfeltöltés egyesével működik. A meglévő működést és adatokat őrizd meg.

Csak az aktuális számozott feladatot valósítsd meg. A későbbi feladatokat ne implementáld előre, de a már rögzített üzleti szabályokkal maradj kompatibilis. Először olvasd el az érintett kódot és a projekt saját utasításait. Kövesd a meglévő hitelesítési, API-, validációs és CSS-megoldásokat. Ne találj ki létező fájlokat vagy mezőket. A szükséges új függőségeket indokold és ellenőrizd a projekt verzióival.

A jogosultságot, tulajdonjogot, terméklimitet, fotólimitet, importot és előresorolási keretet a backend ellenőrizze. A frontend csak megjeleníti a backend eredményét. Egy seller_id, plan vagy pro=true beküldése nem adhat jogosultságot.

A mennyiségi korlátok párhuzamos kérések esetén is érvényesüljenek: adatbázis-tranzakció és eladónként egységes zárolás kell a publikáláshoz, visszaaktiváláshoz és tömeges műveletekhez. Ne kizárólag a controllerben legyenek a szabályok; minden belépési pont ugyanazt a szolgáltatást használja.

Minden lépés végén add meg:
- Mely fájlok változtak és miért.
- Szükséges migrációk, konfigurációk és pontos futtatási parancsok.
- Automatizált tesztek eredménye és a kézi ellenőrzés menete.
- Új API-k kérés-/válaszpéldái és hibaállapotai.
- Mi készült el és milyen konkrét külső beállítás hiányzik még.

Ne adj ki éles API-kulcsot, és ne írj titkot a kódba, gitbe vagy naplóba. A fizetést és számlázást tesztkörnyezetben ellenőrizd; éles terhelést vagy éles számlát fejlesztési tesztként ne készíts.

## Rögzített termékszabályok

Ezek a specifikációhoz választott induló szabályok. Ha a tulajdonos valamelyiket módosítja, először ezt a közös részt frissítsd.

| Funkció | Ingyenes | PRO |
|---|---|---|
| Díj | 0 Ft | 4.990 Ft/hó, ügyfél által fizetendő végösszeg |
| Aktív hirdetések | 10 | 100 |
| Fotók hirdetésenként | 6 összesen | 12 összesen |
| Érvényesség | 30 nap | 60 nap |
| Megújítás | Egyenként, kézzel | Egyenként vagy tömegesen, elérhetőség megerősítésével |
| Új termékek XLSX/CSV importja | Nincs | Legfeljebb 50 adatsor/import |
| Tömeges ár-/készletmódosítás | Nincs | Van |
| Boltprofil | Boltnév és meglévő alapadatok | Plusz logó, bemutatkozás, nyilvános boltoldal |
| Statisztika | Termékenként összes megtekintés | Plusz időszaki megtekintések és új érdeklődő beszélgetések |
| Előresorolás | Később konfigurált külön díjért | 5 alkalom/kifizetett előfizetési időszak |

### Előfizetés és pénzügy

- A PRO az eladói fiókhoz tartozik, nem egyes termékekhez. Egy eladónak egyszerre legfeljebb egy folyamatban lévő vagy élő PRO-előfizetése lehet.
- Egyetlen havi csomag van. Kezdetben nincs éves csomag, kupon, próbaidő, időarányos csomagváltás vagy manuális ingyenes PRO.
- A havi időszakot Stripe határozza meg. Nem naptári hónap, és nem fix 30 nap.
- A 4.990 Ft az ügyfél által fizetendő végösszeg. Az áfatartalom vagy adómentességi jogcím külön konfiguráció, nem automatikusan 27%. A számlázási szabályokat a tulajdonos könyvelőjével kell véglegesíteni az élesítés előtt; CodeGPT ne találjon ki adókezelést vagy teljesítési dátumot.
- Minden platformszolgáltatás díja ugyanabba a platformtulajdonosi Stripe-fiókba érkezik. Nincs Stripe Connect, eladói payout vagy pénzfelosztás. Ez a feladat a platform saját díjairól szól; a meghirdetett termékek vételárának beszedése nem része.
- PRO-jogosultság csak ellenőrzött, megfelelő PRO-előfizetéshez kapcsolódó sikeres fizetés alapján keletkezhet. A Checkout success URL, a frontend állapota vagy önmagában az active Stripe-státusz nem fizetési bizonyíték.
- A helyi jogosultság a visszaigazolt fizetett időszak végét tárolja. Késve beérkező régi esemény nem rövidítheti vagy támaszthatja fel tévesen a jogosultságot.
- Lemondáskor az automatikus megújulás áll le; PRO a kifizetett időszak végéig megmarad. A határidő előtt a lemondás visszavonható.
- Sikertelen első fizetés nem ad PRO-t. Sikertelen havi megújítás nem hosszabbítja meg a fizetett időszakot és nem ad új előresorolási keretet. Nincs külön ingyenes türelmi idő.
- A fizetésnek számító eseménynél az eladót, Stripe customert, előfizetést, Price ID-t, pénznemet és fizetett időszakot is ellenőrizni kell. Egy másik Stripe-termék számlája nem adhat PRO-t.
- Teljes visszatérítés, chargeback és vitatott fizetés külön adminisztrátori felülvizsgálati állapotba kerül. Ne következzen be automatikus új PRO-aktiválás régi invoice.paid esemény miatt. A visszatérítés a Stripe-előfizetést önmagában nem mondja le; az adminfolyamat szükség esetén külön állítsa le.

### Hirdetések és lejárat

- Egy termékhirdetés egy aktív hely, függetlenül a készlet darabszámától.
- Aktív: publikált, nem eladott, nem archivált, nem lejárt, nem moderáció miatt letiltott és készlete nagyobb mint nulla. A nulla készlet a hirdetést inaktívvá teszi; pozitívra állításkor a publikálási feltételeket és limitet újra ellenőrizni kell.
- Piszkozat, archivált, eladott és lejárt hirdetés nem fogyaszt aktív helyet. Ezek visszaaktiválása újra limitellenőrzést igényel.
- A borítókép is beleszámít a fotólimitbe. Például ingyenes csomagban 1 borítókép + 5 galériakép engedélyezett.
- Érvényesség a publikálás vagy kifejezett megújítás időpontjától számított 30/60 nap. Tárolás UTC-ben, megjelenítés Europe/Budapest időzónában.
- Sima szerkesztés, ár-/készletfrissítés és előresorolás nem hosszabbít érvényességet.
- A megújítás now + az aktuális csomag naplimitje, nem a régi lejárati dátumhoz hozzáadott napok. A megújítás nem előresorolás.
- PRO-ra váltás nem hosszabbítja meg automatikusan a már aktív hirdetéseket. Kézi vagy tömeges megújítással kapnak 60 napot.
- A keresés és publikus termékoldal már a lekérdezéskor kizárja a lejárt hirdetést. A scheduler esetleges késése nem tarthatja publikusan aktívan.

### Visszaváltás ingyenesre

- PRO lejáratakor legfeljebb 10 hirdetés maradhat aktív. Az eladó előre kiválaszthatja a megtartandókat; a választott, akkor is aktív hirdetések élveznek elsőbbséget.
- Ha nincs teljes választás, a rendszer a legutóbb publikált aktív hirdetésekkel tölti fel a legfeljebb 10 helyet, azonos időpont esetén termékazonosító szerinti csökkenő sorrendben. Az előresorolás nem befolyásolja ezt.
- A többi archived_plan_limit okkal archiválódik; képek, tartalom és beszélgetések megmaradnak.
- A megtartott hirdetések lejárata a jelenlegi dátum és a PRO tényleges megszűnése + 30 nap közül a korábbi. A scheduler késése ne adjon plusz napokat.
- A meglévő 7–12 fotó megmarad. Ingyenes fiók nem adhat hozzá új fotót, ha az eredmény 6-nál több lenne; képet törölhet, rendezhet, illetve ugyanannyi képet lecserélhet. Új vagy újrapublikált hirdetés legfeljebb 6 fotós lehet.
- PRO újravásárlása nem aktiválja automatikusan az archivált termékeket.
- Az alapadatok és boltazonosító megmaradnak; PRO-logó és bemutatkozás tárolva marad, de az ingyenes nyilvános megjelenésből eltűnik. A PRO-boltoldal lejárat után alap boltnévvel és aktív termékekkel tovább elérhető, így a korábbi linkek működnek. Ingyenes eladónak a csomag kezdetben nem hoz létre ilyen oldalt.

### Előresorolás

- Egy alkalom egy saját, aktív termék egyszeri előresorolása. Nem garantált első hely és nem többnapos rögzített kiemelés.
- Az alapértelmezett releváns listában a sorrend kulcsa bumped_at, ennek hiányában published_at; csökkenő sorrend, azonos időnél azonosító. A keresési szűrők mindig érvényesek.
- Ár szerinti rendezésben az ár a fő kulcs. Az előresorolás nem írhatja felül a látogató által kiválasztott rendezést.
- Külön bumped_at mező kell. created_at, published_at és expires_at nem változik.
- Ugyanaz a termék 24 órán belül nem sorolható előre újra, ingyenes PRO-keretből vagy vásárolt alkalommal sem.
- Kifizetett havi PRO-időszakonként 5 alkalom jár. Nincs átvitel a következő időszakra, naptári havi reset vagy többszöri jóváírás. A késve kifizetett régi időszak kerete annak eredeti végén lejár.
- Sikeres művelet fogyaszt egy alkalmat. Elutasított, hibás vagy ismételt azonos kérés nem fogyaszt.
- A külön vásárolható alkalom árát a tulajdonos még nem rögzítette. A fizetési megoldás konfigurálható legyen, de ár/Price ID hiányában a vásárlás legyen kikapcsolva. CodeGPT ne használja automatikusan a korábbi 8.000 Ft-ot vagy a javasolt 490 Ft-ot.

## 0. feladat – Projektfelmérés és megvalósítási térkép

Olvasd át a Laravel/React projektet, és egyelőre ne módosíts kódot. Térképezd fel:

1. Laravel/PHP, React, router és buildeszköz verziója.
2. Eladói hitelesítés, jogosultságok, user/seller/store kapcsolatok.
3. Termékmodellek, státuszok, készlet, publikálás, borítókép és galéria tárolása.
4. Termék API-k, feltöltő/szerkesztő felületek és publikus keresési sorrend.
5. Beszélgetések, termékhez kapcsolás, vendégazonosítás és első üzenet tárolása.
6. Meglévő Postmark-konfiguráció, queue, scheduler, adminfelület és tesztkörnyezet.
7. Van-e már Stripe SDK/Cashier, boltaloldal vagy megtekintésszámláló.

Add meg a tényleges fájlútvonalakat, a meglévő rendszerekkel összeillesztett adatmodelltervet, és az 1–12. feladat függőségeit. Ha Cashier már jelen van, használd annak kanonikus tábláit és webhook-integrációját; ne hozz létre két egymással versenyző előfizetési állapotkezelést. Ha nincs, indokold a projektverzióval kompatibilis Cashier vagy Stripe SDK választását. Az üzleti jogosultságoknak ettől függetlenül egységes szolgáltatásban kell lenniük.

Elfogadás: a terv hivatkozik valóban megtalált fájlokra; az ismeretlen pontokat jelzi; nincs kódmódosítás vagy éles API-hívás.

## 1. feladat – Csomagszabályok és adatmodell

Valósítsd meg az ingyenes/PRO csomag központi definícióját és a backend jogosultsági szolgáltatását. Egyetlen hely határozza meg az aktív hirdetés-, fotó- és érvényességi limiteket, valamint a PRO funkciókat.

Tervezd meg és hozd létre a szükséges adatokat a meglévő rendszerhez illeszkedve:
- Előfizetés Stripe-azonosítói, állapota, fizetett jogosultsági határideje és lemondása.
- Termék publikálási, lejárati és előresorolási időpontja, archiválási oka.
- Beérkező Stripe-események egyedi azonosítója és feldolgozási állapota.
- Fizetett PRO-időszakok és előresorolási keretek. Egyedi kulcs: előfizetés + időszakkezdés + időszakvége.
- Számlázási vevőadatok és későbbi fizetésekhez változatlan adatpillanatkép.
- Platformfizetések, Számlázz.hu-bizonylatok és számlázási feladatok külön állapota.

Az eladó az API-ból kapja meg a csomagját, aktív darabszámát, limitjeit, megmaradt előresorolási alkalmait és PRO-határidejét. Ne adj írható plan mezőt az eladó profilfrissítő végpontjához.

Migrációs szabály: minden jelenlegi eladó ingyenes. A migráció ne töröljön és ne archiváljon automatikusan meglévő termékeket. A jelenlegi aktív hirdetések lejárata az átállás rögzített időpontja + 30 nap legyen. Az induláskor 10-nél több aktív hirdetéssel rendelkező fiókok kapjanak egyszeri átmeneti jelölést: meglévő hirdetéseik a lejáratukig megmaradnak, de új publikálás vagy megújítás csak a 10-es keret betartásával engedhető. Ez egyszeri migrációs kivétel, új felhasználónak nem adható.

Elfogadás: frontendből nem lehet PRO-t állítani; az ingyenes limitek helyesek; meglévő adatok sértetlenek; migráció újrafuttatása nem hosszabbít érvényességet. PRO tesztesetekhez tesztfixture használható, éles megkerülő kapcsoló nem.

## 2. feladat – Hirdetési limitek, lejárat és egyenkénti megújítás

Építsd be a közös szabályokat az egyenkénti feltöltésbe, szerkesztésbe, publikálásba és visszaaktiválásba. A backend a képcsere után ténylegesen megmaradó képszámot ellenőrizze. A hirdetés érvényessége a sikeres publikáláskor induljon, ne a piszkozat létrehozásakor.

Készíts megújítási műveletet kötelező available_confirmed=true megerősítéssel. A felület szövege: „Megerősítem, hogy a termék még elérhető.” A lejárt saját hirdetés visszaaktiválható, ha a teljes validáció és a helylimit engedi; eladott vagy moderáció miatt letiltott termék ezzel nem tehető aktívvá.

Scheduler kezelje a lejárati státuszváltásokat és a lejárat előtti 3 napos értesítési eseményt. A nyilvános listák lekérdezéskor is ellenőrizzék a lejáratot. Az eladói listában legyenek láthatók az aktív, lejárt, eladott, archivált és piszkozat állapotok. Az értesítést a 11. lépésben kötjük Postmarkhoz.

Elfogadás: 10/100 hely felett nincs publikálás; két párhuzamos kérés sem lépi át a limitet; a borítókép beleszámít a 6/12 képbe; szerkesztés nem hosszabbít; lejárt termék scheduler nélkül sem publikus; megújítás nem sorol előre.

## 3. feladat – Stripe Checkout és eladói előfizetési felület

Integrálj Stripe Checkoutot subscription módban, egyetlen havi HUF PRO Price-zal, 7.990 Ft fizetendő végösszeggel. A backend konfigurációból veszi a Price ID-t, a frontend nem küldhet szabadon árat vagy Price ID-t. A HUF Stripe-összegformátumát a választott API aktuális dokumentációja alapján ellenőrizd.

Checkout előtt kérj számlázási adatokat: magánszemély/cég, név/cégnév, számlázási ország, irányítószám, település, cím, számlázási email, cégnél szükséges adószám. Ne korlátozd önkényesen a marketplace meglévő célországait; ismeretlen adózási konfigurációnál ne indíts éles fizetést. A kliens nem küldhet adókulcsot.

Egy seller egy platform Stripe customerhez kapcsolódjon. Párhuzamos vagy dupla kattintás ne készítsen két nyitott előfizetést: seller zárolás, nyitott Checkout nyilvántartás és megfelelő Stripe idempotency key kell. Visszatérő felhasználónál a meglévő élő/pending előfizetést kezeld. A Stripe metadata tartalmazzon szerver által rögzített seller azonosítót; a szerver az ügyfélkapcsolatot is ellenőrizze.

Készíts „Előfizetés” oldalt a seller panelben: csomag, limitek és használat, PRO díj, megújulás/lejárat, előfizetés indítása, fizetéskezelés. A success oldalon „Fizetés ellenőrzése folyamatban” jelenjen meg, amíg a backend jogosultságot nem igazol.

A Stripe Customer Portal csak az adott eladó customeréhez nyílhat meg, kártyakezeléshez és időszak végi lemondáshoz. Ne engedélyezz olyan csomagváltást, kupont, azonnali lemondást vagy számlázási adatfrissítést, amelyet az alkalmazás még nem tud helyesen szinkronizálni.

Elfogadás: teszt-Checkout működik; megszakítás nem ad PRO-t; success URL kézi megnyitása nem ad PRO-t; dupla kattintás és párhuzamos indítás sem okoz két előfizetést; más seller Portalja nem nyitható meg.

## 4. feladat – Stripe webhookok és előfizetés-életciklus

Készíts webhook-feldolgozást az aktuális, rögzített Stripe API-verzióhoz. A nyers request body alapján ellenőrizd a Stripe signature-t. A route célzottan legyen kivéve a szükséges CSRF-ellenőrzésből; a többi API hitelesítését ne gyengítsd.

Kezeld legalább: checkout.session.completed; customer.subscription.created/updated/deleted; invoice.paid; invoice.payment_failed; invoice.payment_action_required; invoice.finalization_failed. Az első Checkout-esemény az összekapcsolást és állapotfrissítést segíti, nem önmagában aktivál PRO-t. A jelenlegi subscription objektum és az érvényes fizetett időszak alapján kezeld a késői vagy felcserélt eseményeket.

A hitelesített eseményt tartósan tárold, és gyorsan válaszolj; a hosszú feldolgozás queue-ban fusson. Tárolási hiba esetén ne küldj hamis sikeres választ. Egyedi event ID, feldolgozási állapot és újrapróbálás kell. Ugyanazon esemény rögzítése nem jelenti automatikusan, hogy a feldolgozás is sikeres volt.

Az invoice.paid a megfelelő normál PRO-időszakra egyszer hosszabbíthat jogosultságot, egyszer adhat 5 alkalmat és egyszer indíthat számlázási feladatot. Más eseményazonosítóval érkező ugyanazon invoice sem okozhat duplikációt. Csak teljesen rendezett, megfelelő PRO-előfizetési számlát fogadj el; nulla összegű, kézzel fizetettre állított vagy idegen díjtételt ne tekints automatikusan 7.990 Ft-os befizetésnek. Váratlan eltérést tegyél felülvizsgálati állapotba.

Készíts időszakos Stripe-egyeztetést a kimaradt webhookok javításához; ugyanazt az idempotens üzleti szolgáltatást használja. A jogosultság a határidőn túl akkor sem maradhat aktív, ha a lejárati job nem futott le.

Elfogadás: hamis aláírás elutasítva; duplikált, párhuzamos és felcserélt webhook tesztelve; sikeres megújulás helyes; sikertelen megújulás nem hosszabbít; lemondáskor az időszak végéig megmarad PRO; késve fizetett régi időszak nem ad új teljes hónapot a fizetés napjától.

## 5. feladat – PRO megszűnése és ingyenesre visszaváltás

Valósítsd meg a közös visszaváltási szabályokat. Az eladó az Előfizetés oldalon előre kijelölhessen legfeljebb 10 megtartandó hirdetést. A backend csak saját termékazonosítókat fogadjon el.

A megszűnési folyamat seller-zárolás mellett, ismételten is biztonságosan fusson: kiválasztás, determinisztikus kiegészítés, fölösleg archiválása, lejáratok rövidítése és PRO-szerkesztési jogok megszüntetése. A limitet érintő első következő backend-művelet is kényszerítse ki a feldolgozást, ha a scheduler még nem végezte el.

Képek és beszélgetések ne törlődjenek. Az archivált termékeknél legyen világos az ok és a kézi újraaktiválás lehetősége. Új PRO-vásárlás ne publikáljon automatikusan termékeket. A korábbi kifizetett időszak 5-ös kerete ne éljen tovább a megszűnés után.

Elfogadás: 100 aktívból legfeljebb 10 marad; a választás/fallback azonos eredményt ad ismételten; lejárat a tényleges megszűnéshez igazodik; párhuzamos új fizetés és downgrade nem archivál aktív PRO-fiókot tévesen; nincs adat- vagy képtörlés.

## 6. feladat – Számlázz.hu automatikus számlázás

Integráld a Számla Agentet API-kulccsal. A platform saját PRO-szolgáltatásáról a platform számlázási fiókja állít ki számlát az eladónak. Az itt kezelt számla nem a seller termékeladásának számlája.

Egy ellenőrzött sikeres PRO-befizetés egy számlázási feladatot hoz létre. A fizetési rekordhoz rögzítsd az összeget, pénznemet, szolgáltatási időszakot, fizetési hivatkozásokat és a kapcsolódó vevő-/adózási adatok változatlan pillanatképét. A profil későbbi átírása nem módosíthat korábbi számlát.

A tétel neve például „GigaPiac PRO előfizetés”, az időszak a leírásba kerüljön. A nettó/áfa/bruttó, teljesítési és fizetési dátumok szabályai konfigurációból jöjjenek; élesítés előtt tulajdonosi/könyvelői véglegesítés kell. A befizetés és a számla végösszege egyezzen, a Stripe feldolgozási díja nem csökkenti az ügyfél számlájának összegét.

Idempotencia: helyi egyedi Stripe invoice ID + Számlázz.hu rendelésszám/külső hivatkozás. Használd a dokumentált duplikáció-ellenőrzést. Timeout után először a külső hivatkozással kérdezd le, elkészült-e már a számla; ne készíts vakon új számlát. Ha az eredmény nem dönthető el, jelöld bizonytalannak és add adminfelülvizsgálathoz.

A számlát a Számlázz.hu küldje emailben a számlázási címre. Postmark ne küldje ki ugyanazt másodszor. A bizonylat elkészülte és az email elküldése külön állapot: ha a számla megvan, de az email sikertelen, csak az emailt próbáld újra a dokumentált lehetőségekkel; ne gyárts új számlát.

Állapotok legalább: pending, processing, issued, failed, uncertain; emailhez külön állapot. Tárold a bizonylatszámot, hivatkozást és a biztonságosan elérhető PDF-et vagy a szerveroldali lekérés adatait. Az eladó csak saját számláit listázhatja/letöltheti, nyilvános PDF-URL ne legyen. Legyen újrapróbálás és adminnézet a hibákhoz. A számlázási rendszer hibája ne vonja vissza a valóban kifizetett PRO-t.

Visszatérítés/sztornó: legyen adminfolyamat a fizetés, eredeti számla és helyesbítő/sztornó bizonylat összekapcsolására. Részleges visszatérítésnél ne sztornózd automatikusan a teljes számlát. A pontos számviteli kezelést ne találja ki a kód; a szükséges beállítás hiánya legyen látható.

Elfogadás: ismételt webhook nem duplikál számlát; timeoutból helyes egyeztetés; emailhiba nem hoz létre új bizonylatot; profilátírás nem változtat régi adatpillanatképet; tesztüzem nem készít éles számlát; letöltés tulajdonjog-ellenőrzött.

## 7. feladat – PRO tömeges megújítás és ár-/készletmódosítás

Készíts kijelölhető sorokat az eladói terméklistában. Tömeges műveletenként legfeljebb 100 egyedi saját termék kezelhető. PRO-jogot a művelet végrehajtásakor is ellenőrizd.

Tömeges megújítás: kötelező közös megerősítés: „Megerősítem, hogy az összes kijelölt termék még elérhető.” Aktív vagy lejárt, egyébként publikálható termékek kezelhetők. Minden érintett lejárata now + 60 nap; bumped_at változatlan. A visszaaktiváltakra együttes aktívhely-ellenőrzés kell.

Tömeges módosítás: termékenként külön új egész Ft ár és nem negatív egész készlet adható meg. Csak a beküldött mező módosuljon; 0 ne legyen összetévesztve a hiányzó értékkel. Nem kérünk százalékos ármódosítást vagy globális azonos árat ebben a verzióban. Nulla készlet inaktivál; visszanövelés a közös publikálási szabály szerint működik. Az érvényesség nem változik.

Mindkét művelet előzetes validáció után egy tranzakcióban fusson. Egy hibás vagy idegen termék esetén semmi nem módosul; soronként jelenjen meg a hibák oka.

Elfogadás: ingyenes fiók API-n keresztül sem fér hozzá; idegen termék nem módosul; ár/készlet értékek validáltak; részleges vagy párhuzamos kérés nem okoz limitátlépést; megújítás nem előresorolás.

## 8. feladat – PRO XLSX/CSV import

Készíts backend által generált letölthető XLSX és CSV sablont, feltöltést, előnézetet és jóváhagyott importot. Legfeljebb 50 nem üres adatsor kezelhető. 51 sor esetén az egész fájl elutasítva; ne importáld csendben az első 50-et. Maximális fájlméret 5 MB. XLSX első munkalapját dolgozd fel, a többit jelezd figyelmeztetésként; ne futtass makrót, formulát vagy külső hivatkozást. Formula típusú adatcellát utasíts el. XLS és XLSM nem támogatott.

CSV: UTF-8, opcionális BOM, a sablonban pontosvessző elválasztó; az import dokumentáltan támogassa a vesszőt is. Az ár egész forint, ezreselválasztó és pénznemjel nélkül. Készlet nem negatív egész. A sablon tartalmazzon példasort és külön kategóriaazonosító-listát.

Minimum oszlopok: seller_sku, name, description, category_id, price_huf, stock. A seller_sku seller szinten egyedi, nem globálisan. A projekt további kötelező termékmezőit a 0. feladatban feltártak alapján add a sablonhoz, dokumentált típussal és megengedett értékekkel. A jelenlegi validációt ne kerüld meg.

Új termékimport: azonos fájlon belüli duplikált SKU vagy már meglévő saját SKU hibát jelent; ne írjon felül meglévő terméket. Az előnézet minden sort és hibát mutasson. Bármely hibás sor esetén nincs import. Az érvényes import minden új terméket piszkozatként hoz létre, egy tranzakcióban. Fotókat ebben a verzióban nem olvasunk URL-ről vagy táblázatból; az eladó a meglévő képfeltöltővel adja hozzá őket. A felület előre mondja meg, hogy az import piszkozatokat készít, a publikáláshoz képek és teljes validáció szükségesek.

Az import csak új terméket hoz létre. Külön „Ár/készlet frissítés fájlból” módban seller_sku, price_huf, stock oszlopokat kezelj; minden SKU-nak az eladó meglévő termékére kell mutatnia. Ismeretlen SKU hibás, új termék nem jöhet létre. Ez a 7. feladat közös szolgáltatását használja, legfeljebb 50 sorral.

Az előnézet és a véglegesítés között szerveroldali importazonosító és tartalmi lenyomat legyen. Véglegesítéskor újraellenőrzés, PRO-jog és seller tulajdonjog kell. Ismételt azonos véglegesítés ugyanazt az eredményt adja, nem duplikál terméket. Az előnézet 24 óra után lejár. Sorlimit mellett védd az XLSX feldolgozást a túlzott tömörített/uncompressed mérettől és cellaszámtól is. Hibajelentés CSV-exportja ne tegyen végrehajtható táblázatformulát felhasználói szövegből.

Elfogadás: 50/51 sor; hibás kategória; hibás ár; duplikált/idegen SKU; manipulált előnézet; megismételt véglegesítés; import közben lejárt PRO; új piszkozatok kézi publikálásakor 100-as aktív limit.

## 9. feladat – PRO üzleti profil és boltoldal

A meglévő store modellt bővítsd, ne készíts második üzletnyilvántartást. Az alapcsomag megtartja a boltnév és meglévő alapadatok szerkesztését. PRO esetén legyen logó és legfeljebb 2.000 karakteres egyszerű szöveges bemutatkozás. HTML/script nem engedélyezett.

A logó legfeljebb 2 MB-os JPEG, PNG vagy WebP. Ellenőrizd a tényleges képtípust; dolgozd át szerveroldali biztonságos képpé. Ha a projektnek van képfeldolgozó szolgáltatása, azt használd.

Készíts egyedi, stabil slug alapú nyilvános boltoldalt a meglévő routerhez illeszkedve. A slug seller által szabadon ne legyen átírható, és fenntartott/neves útvonalakkal ne ütközzön. Az oldal csak a bolt nyilvános adatait és aktív, nem lejárt termékeit listázza; privát számlázási cím, adószám és adminadat nem kerülhet ki.

PRO-jelölés „PRO előfizető” legyen, ne „Ellenőrzött eladó”. Megszűnéskor a közös szabály szerint visszavált alap megjelenésre; a link megmarad és a PRO-tartalom eltűnik. Ha a projektben már minden eladónak van nyilvános boltoldala, azt ne vond el: ezen az oldalon a PRO arculati és tartalmi bővítést jelent, és a csomagtáblázatot ehhez igazítsd.

Elfogadás: csak saját profil módosítható; ingyenes fiók közvetlen API-kéréssel sem tölthet fel PRO-logót; slug egyedi; veszélyes szöveg/fájl elutasítva; lejárt termék nem jelenik meg; PRO lejáratakor az alapoldal működik.

## 10. feladat – Havi 5 PRO-előresorolás és külön vásárlás

Készíts előresorolási műveletet és megmaradt keret kijelzését. A PRO-keret a 4. lépésben létrejött kifizetett időszakhoz kapcsolódik. Egy felhasználói kérés egyedi operation azonosítót kap; újrapróbálás ugyanazt az eredményt adja. Seller- és termékzárolás mellett ellenőrizd a saját aktív terméket, a 24 órás korlátot és a keretet. Csak a sikeres bumped_at módosítás és keretlevonás együtt commitolhat.

Az alapértelmezett listákat igazítsd a közös sorrendszabályhoz. Az előresorolás időpontja legyen látható az eladónak, a vásárlói felületen a fizetett előresorolás érthetően jelölt. Megújítási dátum nem változik.

A külön vásárlás legyen feature flaggel kikapcsolva, amíg a tulajdonos nem konfigurálta az árát és Stripe Price ID-ját. Bekapcsolva egy saját termékre egy alkalom vásárolható Stripe Checkout payment módban, ugyanabban a platformfiókban. A frontend nem adhat meg árat. PRO-keret elfogyása után PRO-eladó is vásárolhat külön alkalmat.

Az egyszeri fizetést hitelesített megfelelő fizetési esemény és tényleges payment_status alapján ellenőrizd, külön payment/order rekorddal. A subscription invoice.paid logikát ne használd vakon egyszeri Checkoutnál. A számlázási feladat az adott egyszeri payment rekordhoz tartozzon, egyedi fizetési hivatkozással; ugyanazon fizetésből egy bizonylat készülhet.

Sikeres fizetéskor először hozz létre egy termékhez kötött, ki nem használt vásárolt alkalmat; utána próbáld alkalmazni ugyanazzal az előresorolási szolgáltatással. Ha közben a termék inaktív lett vagy 24 órás korlátba ütközik, a kifizetett alkalom maradjon felhasználatlan, látható újrapróbálási lehetőséggel. Ne vesszen el és ne legyen hamisan sikeres. Ez a vásárolt alkalom nem keveredik a lejáró havi PRO-kerettel; az első verzióban nincs automatikus lejárata. Törölt termékhez kötött felhasználatlan alkalom adminisztrátori rendezést igényel.

Elfogadás: pontosan 5 PRO-művelet; 6. elutasítva vagy vásárlás ajánlva; 24 órás védelem minden forrásból; ismételt kérés/webhook nem dupla fogyasztás; következő fizetett időszak egyszer kap 5-öt; ár nélkül nincs vásárlás; kifizetett, de el nem végzett alkalom megmarad.

## 11. feladat – Statisztikák és Postmark-értesítések

Megtekintés: saját termék megnyitása nem számít. Egy azonosítható látogató ugyanannál a terméknél gördülő 24 órán belül egyszer számítson. Bejelentkezett látogatónál belső userazonosító, vendégnél rövid életű első fél munkamenet-azonosító hash-e használható; ne ments nyers IP-címet és ne építs eszközujjlenyomatot. Ha nincs megbízható azonosító, a védett session-alapú számlálás korlátait dokumentáld. Egyenkénti oldalbetöltést ne nevezz egyedi látogatónak. Nyilvános számláló végpontnál legyen visszaélés elleni korlátozás.

Történelmi összesítést őrizd meg, ha már van. Új napi statisztikát UTC eseményidővel, a Budapest szerinti napi bontáshoz szükséges adattal gyűjts. Kezdetben nem lesz visszamenőleges idősor; ne találj ki adatokat.

Ingyenes: saját termékenként összes megtekintés. PRO: saját termékenként és összesen 7/30/90 napos, valamint egyedi dátumtartományos megtekintési idősor és új érdeklődő beszélgetések száma. Maximum 365 nap kérdezhető le egyszerre. A PRO-adatokat gyűjtsd ingyenes fióknál is, a részletes hozzáférést a csomag szabályozza.

Érdeklődő beszélgetés: az adott termékhez és sellerhez tartozó beszélgetésben az első sikeresen elküldött, nem sellertől származó vevőüzenet. Üres beszélgetés megnyitása nem számít. Ugyanazon vevő–seller–termék kombináció egyszer számít akkor is, ha több beszélgetés keletkezett. Vendégnél a meglévő stabil vendégazonosítót használd; ha ilyen nincs, jelezd, hogy beszélgetésenkénti mérésre szorul az adat. Az időszaki szűrés a legelső érdeklődő üzenet dátuma alapján működjön. Ez érdeklődés, nem igazolt eladás.

Postmark a meglévő Laravel-mail integrációval, transactional streamben küldje: első sikeres PRO-aktiválás; havi megújulás; sikertelen fizetés / szükséges fizetési teendő; lemondás és annak visszavonása; PRO megszűnése és archivált hirdetések száma; hirdetés lejárata előtt 3 nap; import eredménye, ha háttérben futott.

Az email az adatbázis-tranzakció sikeres lezárása után, queue-ban menjen. Esemény/címzett/típus alapú küldési nyilvántartás és újrapróbálás kell. Ismételt webhook vagy scheduler futás ne indítson új értesítést; hálózati bizonytalanságnál ne állítsd, hogy külső szolgáltatóval garantált pontosan egyszeri kézbesítés lehetséges. Ugyanarról a fizetési hibáról az ismételt Stripe-próbák ne küldjenek minden alkalommal azonos levelet.

A számla emailjét továbbra is Számlázz.hu küldi. A Postmark előfizetési értesítése hivatkozhat a panel számlalistájára. Külső szolgáltatói hiba ne vonjon vissza sikeres üzleti tranzakciót.

Elfogadás: saját megtekintés kizárt; 24 órás deduplikáció; egy beszélgetés sok üzenete nem sok lead; idegen bolt statisztikája nem kérdezhető le; ingyenes nem kap PRO-idősort; ismételt esemény nem duplikál értesítési feladatot; számlaemailből nincs kettős appküldés.

## 12. feladat – Integrációs tesztek és élesítési dokumentáció

A korábbi lépések tesztjeit egészítsd ki teljes folyamatokkal. Ne csak mockolt success URL-t tesztelj: Stripe tesztmódban valódi teszt-Checkout/webhook életciklust, időszakváltáshoz támogatott tesztóra-megoldást és külön Számlázz.hu tesztüzemet használj.

Kötelező esetek:
1. Ingyenes regisztráció, 10 aktív hirdetés, 11. tiltva; 6 fotó, 7. tiltva.
2. PRO befizetés: 100 aktív, 12 fotó, 60 nap; success URL önmagában hatástalan.
3. Megújulás sikeresen/sikertelenül, hitelesítésre váró fizetés, megszakadt Checkout.
4. Lemondás, visszavonás, jogosultság tényleges vége, 100-ról 10-re visszaváltás.
5. Kézi/tömeges megújítás; nulla készlet; limit melletti párhuzamos publikálás.
6. Import: 50/51 sor, hibák, ismételt véglegesítés, fájlkezelési korlátok.
7. Öt előresorolás, hatodik kísérlet, következő fizetett időszak, párhuzamos fogyasztás.
8. Opcionális egyszeri fizetés: duplikált webhook, inaktívvá vált termék, megmaradó fizetett alkalom.
9. Számlázási timeout, bizonytalan válasz, duplikáció-ellenőrzés, számlaemail hibája.
10. Webhook késése, hibás aláírás, felcserélt események, queue kiesése és újrapróbálása.
11. Visszatérítés/dispute adminfolyamat és régi eseményből téves újraaktiválás kizárása.
12. Jogosultság- és tulajdonjog-ellenőrzés minden új API-nál.

Készíts adminnézetet vagy a meglévő adminhoz bővítést: előfizetések, webhook-feldolgozási hibák, fizetések, számlák, bizonytalan számlázási feladatok, sikertelen jobok és nem alkalmazott vásárolt alkalmak. Az újrapróbálás ne jelentse új terhelés vagy új számla vak létrehozását.

Dokumentáld az éles környezethez a szükséges konfigurációkat: Stripe secret/publishable kulcs, webhook signing secret, PRO Price ID és opcionális bump Price ID; rögzített API-verzió; Számla Agent kulcs és teszt/éles különválasztás; számlázási/adózási beállítások; Postmark stream és feladó; queue worker; percenként futó Laravel scheduler; egyeztető job; adminhiba-jelzések. .env.example csak helykitöltőket tartalmazzon.

A leírás tartalmazzon telepítési sorrendet, adatbázismentést és migrációs ellenőrzést, queue/scheduler újraindítást, egy végigvezetett tesztfolyamatot és olyan visszaállítási eljárást, amely a már rögzített fizetési és számlaadatokat megőrzi. Az éles fizetés bekapcsolása előtt a hiányzó konkrét üzleti/számlázási beállítások legyenek tételesen láthatók.

Elfogadás: a teljes főfolyamat tesztüzemben végigmegy; a teszteredmények és ismert korlátok dokumentáltak; a már kiállított számla és kifizetett jogosultság egy külső rendszerhibától nem vész el.

## Hivatalos technikai források

A használt SDK és API-verzió mezőit megvalósításkor is ellenőrizni kell. A fenti üzleti szabályok a megrendelés részei; a szolgáltatói dokumentáció az integráció működéséhez irányadó.

- Stripe előfizetési webhookok: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe webhook-hitelesítés, ismételt és felcserélt események: https://docs.stripe.com/webhooks
- Stripe időszak végi lemondás: https://docs.stripe.com/billing/subscriptions/cancel
- Számla Agent: https://docs.szamlazz.hu/hu/agent/
- Számla Agent működés: https://docs.szamlazz.hu/hu/agent/basics/how-does
- Számlázz.hu rendelésszám és duplikáció: https://docs.szamlazz.hu/hu/agent/generating_invoice/settings_and_rules/order-number
- Számlázz.hu bizonylat-lekérdezés: https://docs.szamlazz.hu/hu/agent/querying_xml/response
- Postmark transactional streamek: https://postmarkapp.com/developer/
- Postmark Email API: https://postmarkapp.com/developer/api/email-api
