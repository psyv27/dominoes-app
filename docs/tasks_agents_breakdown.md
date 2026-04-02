# Dominoes Web App - Development Task Breakdown

Bu sənəddə layihədəki qüsurların və əlavə deyilən xüsusiyyətlərin **Logic Agent** (Backend & Məntiq) və **UI Agent** (Frontend & Dizayn) arasında necə bölünməsi detallı şəkildə qeyd olunub. Eyni zamanda layihənin ümumi analizindən çıxan əlavə çatışmazlıqlar da plana daxil edilib.

---

## 1. MƏRHƏLƏ: Ümumi (General) Şəbəkə və Səhifə Problemləri

### 👤 UI Agent (Təqdimat & Dizayn)
*   **Səhifələrin Ayrılması (Home vs Lobby):** `Home.tsx` adlı ayrıca Landing Page yaradılması (sistemə giriş etməyənlər üçün reklam/tanıtım səhifəsi) və `Lobby.tsx`-in yalnız avtorizasiyadan keçmiş istifadəçilərin oyun axtarış ekranı kimi saxlanması.
*   **Tabların Düzəldilməsi (Tab Switching Bug):** `Store.tsx` və ya `Friends.tsx` kimi səhifələrin içindəki `activeCategory` və ya `activeTab` dəyişənlərinin (state-lərinin) düzgün kliklənmə funksiyalarının bərpası. (Hal-hazırda kliklənir amma ekranda state dəyişmə ehtimalı qırılıb).
*   **Settings Modalı (Ses, Vibrasiya):** `DashboardLayout`-dakı Settings düyməsinə basıldıqda ekrana mərkəzi *Modal* çıxarılması. Bu modalda (Settings.tsx) Səs (Volume slider), Titrəşim (Toggle), və s. konfiqurasiyaların dizaynı.
*   **Tournament Səhifəsi:** `Tournament.tsx` səhifəsinin hazırlanması. Qarşıdan gələn və aktiv turnirləri göstərən lövhə dizaynı.

### 🧠 Logic Agent (Məlumat & Mexanizm)
*   **Settings Storage:** Səs və vibrasiya kimi lokal parametrlərin brauzerin `localStorage` yaddaşında tətbiq olunması.
*   **Tournament Data Model:** Backend-də `Tournaments` cədvəlinin yaradılması, istifadəçilərin turnirlərə qeydiyyat API-lərinin yazılması (`POST /tournaments/join`).

---

## 2. MƏRHƏLƏ: "Create Room" (Otaq Yarat) Modalı

### 👤 UI Agent (Təqdimat & Dizayn)
*   **Ölçü və Proporsiya (Layout Fix):** Modalın yuxarıdan-aşağı olan hündürlüyünün (height) artırılması və içindəki elementlərin padding/margin-lərinin kiçildilib, scroll (sürüşdürmə) olmadan asan görünməsinin təmin edilməsi.
*   **Bot Mode UI:** Modala "Single Player (Botlara Qarşı)" seçiminin əlavə edilməsi.
*   **Modların Qoşulması:** Layihəyə xas (Classic, All Fives və s.) yeni domino modlarının interfeysdə (radio button və ya select) göstərilməsi.
*   **Oyna Yönləndirmə (Navigation Fix):** `handleCreateRoom` funksiyası işlədikdən sonra modaldan çıxıb birbaşa `/game/12345` (oyun lövhəsinə) yollaması (React Router `navigate`).

### 🧠 Logic Agent (Məlumat & Mexanizm)
*   **Bot Logic Backend:** Otaq yaradılanda əgər `botMode=true` olarsa, backend-də `Socket.io` vasitəsilə otağa AI botlarının avtomatik doldurulması mexanizmi.
*   **Domain Specific Game Modes:** "All Fives" və s. modların `backend/engine/ScoreCalculator.js`-də hesablama qaydalarının reallaşdırılması.
*   **Room Creation Flow:** Otaq yaradıldıqda istifadəçinin otağa avtomatik qoşulmuş kimi bazaya düşməsi (`backend/RoomManager.js`).

---

## 3. MƏRHƏLƏ: Mağaza (Store) və Admin Panel Arxiitekturası

### 👤 UI Agent (Təqdimat & Dizayn)
*   **VIP və Support Silinməsi:** `DashboardLayout`-dan VIP və köhnə Support hissələrinin silinib səliqəyə salınması, əvəzinə modern Support Modalının əlavə edilməsi.
*   **Dinamik UI Card-lar:** Mağaza səhifəsinin `Store.tsx` sərt yazılmış (hardcoded) itemlərdən təmizlənib, backend-dən `/store/items` GET request edərək oxuması. Endirim (Discount badge), Limited (Vaxt limiti), New (Yeni) və Hot (Populyar) etiketlərinin (badge) dizayn edilməsi.
*   **Admin Panel (Store Təbəqəsi):** `Admin.tsx` səhifəsində mağaza məhsullarını əlavə etmək üçün xüsusi formun hazırlanması (Şəkil yükləmə, Ad, Qiymət, Endirim%, Növü, Limit statusu). 

### 🧠 Logic Agent (Məlumat & Mexanizm)
*   **Store Database Table:** Backend-də `store_items` cədvəlinin yaradılması. (Sahələri: `id`, `name`, `type`, `price`, `discount_percentage`, `is_limited`, `is_new`, `is_popular`, `image_url`).
*   **Admin API-lər:** Backend-də `POST /admin/store`, `PUT /admin/store/:id`, `DELETE /admin/store/:id` strukturunun yazılması.
*   **Satış/Alış API:** İstifadəçinin mağazadan məhsulu almaq istədikdə, balansının yoxlanması, pulun çıxılması və item-in istifadəçinin inventory-sinə əlavə olunması məntiqi (`POST /store/buy`).

---

## 4. MƏRHƏLƏ: Mənim (Aİ) Əlavə Etdiyim (Görünməyən Çatışmazlıqlar)

*Ümumi scan nəticəsində təyin etdiyim görünməyən "Backstage" zəiflikləri:*

1.  **JWT Refresh Dəstəyi (Logic):** İstifadeçinin tokeni vaxtını bitirdikdə səhifə anidən qırılır (`401 Unauthorized`). Yeniləmə (refresh token) strategiyası qurulmalıdır.
2.  **Socket.io Otaqdan Düşmə (Logic):** İstifadəçi otaqdadırsa və tərslikdən brauzer donubsa/refresh veribsə, otaqdan atılır. `reconnection` məntiqi qurulmalıdır ki, otağa qaldığı yerdən davam etsin.
3.  **İngilis / Azərbaycan / Rus Dilləri (UI+Logic):** Saytda tərcümələr qarışıqdır (bəzi yerlər "Otaq Yarat", bəzi yerlər "Create Room"-dur). Qlobal "Localization (i18n)" qurulmalıdır.
4.  **Game UI Layout (UI):** Oyun daxili interfeys (masa) hələ də `DashboardLayout` içində qalmamalıdır. Məntiqən otağa girdikdə tam ekranlı (FullScreen) fərqli interfeys yüklenmelidir ki, menu oyuna mane olmasın.
