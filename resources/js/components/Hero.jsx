import React from 'react';

export default function Hero({
    search,
    setSearch,
    onSearch,
}) {
    function handleSubmit(event) {
        event.preventDefault();
        onSearch();
    }

    return (
        <section className="home-hero">
            <div className="home-hero__overlay" />

            <div className="home-hero__container">
                <div className="home-hero__content">
                    <div className="home-hero__eyebrow">
                        <span className="home-hero__eyebrow-line" />
                        <span>MAGYAR HARDVER MARKETPLACE</span>
                    </div>

                    <form
                        className="home-hero__search"
                        onSubmit={handleSubmit}
                    >
                        <div className="home-hero__search-icon">
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="11"
                                    cy="11"
                                    r="6.5"
                                />
                                <path d="M16 16l5 5" />
                            </svg>
                        </div>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Mit keresel? Pl. RTX 4070, Ryzen 7, iPhone..."
                            aria-label="Termék keresése"
                        />

                        <button type="submit">
                            Keresés
                        </button>
                    </form>

                    <div className="home-hero__features">
                        <div className="home-hero__feature">
                            <div className="home-hero__feature-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3l8 3v5c0 5.2-3.4 8.9-8 10-4.6-1.1-8-4.8-8-10V6l8-3z" />
                                    <path d="M8.5 12l2.2 2.2 4.8-5" />
                                </svg>
                            </div>

                            <div>
                                <strong>
                                    Elektronikai és robotikai eszközök
                                </strong>

                                <span>
                                    Robotikai eszközök, alkatrészek és kiegészítők
                                </span>
                            </div>
                        </div>

                        <div className="home-hero__feature">
                            <div className="home-hero__feature-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3l8 3v5c0 5.2-3.4 8.9-8 10-4.6-1.1-8-4.8-8-10V6l8-3z" />
                                    <path d="M8.5 12l2.2 2.2 4.8-5" />
                                </svg>
                            </div>

                            <div>
                                <strong>
                                    Bolt létrehozás
                                </strong>

                                <span>
                                    Eladó ként saját bolt létrehozása
                                </span>
                            </div>
                        </div>

                        <div className="home-hero__feature">
                            <div className="home-hero__feature-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3l8 3v5c0 5.2-3.4 8.9-8 10-4.6-1.1-8-4.8-8-10V6l8-3z" />
                                    <path d="M8.5 12l2.2 2.2 4.8-5" />
                                </svg>
                            </div>

                            <div>
                                <strong>
                                    Egyszerű keresés
                                </strong>

                                <span>
                                    Okos keresőmotor, széles termékkínálat
                                </span>
                            </div>
                        </div>

                        <div className="home-hero__feature">
                            <div className="home-hero__feature-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3l8 3v5c0 5.2-3.4 8.9-8 10-4.6-1.1-8-4.8-8-10V6l8-3z" />
                                    <path d="M8.5 12l2.2 2.2 4.8-5" />
                                </svg>
                            </div>

                            <div>
                                <strong>
                                    500+ kategória
                                </strong>

                                <span>
                                    Rendszerezett termékek
                                </span>
                            </div>
                        </div>

                        <div className="home-hero__feature">
                            <div className="home-hero__feature-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                                    <path d="M4.5 7.5L12 12l7.5-4.5" />
                                    <path d="M12 12v9" />
                                </svg>
                            </div>

                            <div>
                                <strong>
                                    Országos lefedettség
                                </strong>

                                <span>
                                    Az ország egyik legnagyobb hardver piactere
                                </span>
                            </div>
                        </div>

                        <div className="home-hero__feature">
                            <div className="home-hero__feature-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <circle
                                        cx="9"
                                        cy="8"
                                        r="3"
                                    />
                                    <circle
                                        cx="17"
                                        cy="9"
                                        r="2.5"
                                    />
                                    <path d="M3.5 19c0-3.3 2.3-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
                                    <path d="M14 15c.9-.7 1.9-1 3-1 2.7 0 4.5 1.8 4.5 5" />
                                </svg>
                            </div>

                            <div>
                                <strong>
                                    Segítőkész közösség
                                </strong>

                                <span>
                                    PC építők és hardver rajongók közössége
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}